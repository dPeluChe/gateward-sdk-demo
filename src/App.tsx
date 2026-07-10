import { useMemo, useState } from "react";
import {
  GatewardAuth,
  GatewardError,
  decodeClaims,
  type GatewardClaims,
  type SessionSummary,
} from "@gateward/sdk";
import { apiPost } from "./api.js";

const BASE_URL = import.meta.env.VITE_GATEWARD_URL ?? "http://localhost:8080";
const APP_ID = import.meta.env.VITE_GATEWARD_APP_ID ?? "";

interface LogLine {
  ok: boolean;
  text: string;
}

export function App() {
  // One app-scoped client for the whole session (browser half of the SDK).
  const auth = useMemo(
    () => new GatewardAuth({ baseUrl: BASE_URL, appId: APP_ID }),
    [],
  );

  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("Demo!Pass123");
  const [claims, setClaims] = useState<GatewardClaims | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);

  const say = (ok: boolean, text: string) =>
    setLog((l) => [{ ok, text }, ...l].slice(0, 40));

  async function run(label: string, fn: () => Promise<string | void>) {
    try {
      const msg = await fn();
      say(true, `${label}${msg ? ` — ${msg}` : ""}`);
    } catch (err) {
      const detail =
        err instanceof GatewardError
          ? `${err.status} ${JSON.stringify(err.body)}`
          : String(err);
      say(false, `${label} failed — ${detail}`);
    }
  }

  const refreshClaims = async () => {
    const token = await auth.getAccessToken();
    setClaims(decodeClaims(token));
    return token;
  };

  return (
    <main>
      <h1>Gateward SDK Demo</h1>
      <p className="sub">
        Browser auth via <code>GatewardAuth</code>; events &amp; token
        verification run server-side (API key never reaches the browser).
      </p>
      <p className="env">
        Core: <code>{BASE_URL}</code> · app: <code>{APP_ID || "(unset)"}</code>
      </p>

      <section className="card">
        <div className="row">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
          />
          <input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>
        <div className="row wrap">
          <button onClick={() => run("register", () => auth.register(email, password).then(() => "202 (verify email to log in)"))}>
            register
          </button>
          <button onClick={() => run("login", async () => { await auth.login(email, password); await refreshClaims(); return "tokens stored"; })}>
            login
          </button>
          <button onClick={() => run("refresh", async () => { await auth.refresh(); await refreshClaims(); return "rotated"; })}>
            refresh
          </button>
          <button onClick={() => run("listSessions", async () => { const s = await auth.listSessions(); setSessions(s); return `${s.length} session(s)`; })}>
            sessions
          </button>
          <button onClick={() => run("logout", async () => { await auth.logout(); setClaims(null); setSessions([]); return "cleared"; })}>
            logout
          </button>
        </div>
        <div className="row wrap">
          <button onClick={() => run("verifyToken (server)", async () => { const token = await auth.getAccessToken(); const r = await apiPost<{ claims: GatewardClaims }>("/api/verify", { token }); return `sub=${r.claims.sub.slice(0, 8)} aud=${r.claims.app_id?.slice(0, 8)}`; })}>
            verify token (server)
          </button>
          <button onClick={() => run("sendEvent (server)", async () => { const token = await auth.getAccessToken(); const { sub } = decodeClaims(token); await apiPost("/api/send-event", { eventType: "app.demo.button_clicked", userId: sub, metadata: { at: new Date().toISOString() } }); return "202"; })}>
            send event (server)
          </button>
          <button onClick={() => run("setUserMetadata (server)", async () => { const token = await auth.getAccessToken(); const { sub } = decodeClaims(token); const r = await apiPost<{ metadata: Record<string, unknown> }>("/api/set-metadata", { userId: sub, metadata: { tier: "gold", lastSeenFromDemo: new Date().toISOString() } }); return `merged: ${JSON.stringify(r.metadata)}`; })}>
            set metadata (server)
          </button>
        </div>
      </section>

      <div className="grid">
        <section className="card">
          <h2>Claims</h2>
          <pre>{claims ? JSON.stringify(claims, null, 2) : "— not logged in —"}</pre>
        </section>
        <section className="card">
          <h2>Sessions</h2>
          <pre>{sessions.length ? JSON.stringify(sessions, null, 2) : "—"}</pre>
        </section>
      </div>

      <section className="card">
        <h2>Activity</h2>
        <ul className="log">
          {log.map((l, i) => (
            <li key={i} className={l.ok ? "ok" : "err"}>
              {l.ok ? "✓" : "✗"} {l.text}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
