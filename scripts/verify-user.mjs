// Dev-only: the Core requires email verification before login, but there's
// no SMTP locally. This marks a user active + verified straight in the dev
// Postgres so the demo login works. NOT for any real environment.
//
// Usage: pnpm verify-user demo@example.com
import { execSync } from "node:child_process";

const email = process.argv[2];
if (!email) {
  console.error("usage: pnpm verify-user <email>");
  process.exit(1);
}

const container = process.env.PG_CONTAINER || "gateward-core-postgres-1";
const sql = `UPDATE users SET account_status='active', email_verified_at=now() WHERE email='${email}'`;

try {
  const out = execSync(
    `docker exec -e PGPASSWORD=gateward ${container} psql -U gateward -d gateward -c "${sql}"`,
    { encoding: "utf8" },
  );
  console.log(out.trim());
  console.log(`✓ ${email} marked active + verified`);
} catch (e) {
  console.error(`✗ failed — is '${container}' running (make run in gateward-core)?`);
  process.exit(1);
}
