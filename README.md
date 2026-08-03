# Gateward SDK Demo

App runnable que ejercita **las dos mitades** de `@gateward/sdk` contra un Core local:

- **Browser** (`GatewardAuth`): register / login / refresh automático / logout, sesiones
  propias y claims decodificados.
- **Server-side** (`GatewardServer`, vía un plugin de Vite): `sendEvent` y `verifyToken`
  con la **API key** — que **nunca llega al browser** (vive solo en Node).

Es la referencia de integración canónica: replica el patrón real (browser hace auth de
usuario; el backend, con la API key, emite eventos y verifica tokens).

## Setup

1. **Levantá el Core local** (repo `gateward-core`):
   ```bash
   make run   # docker + migraciones + :8080
   make bootstrap-admin EMAIL=admin@local.test PASSWORD='Admin!Pass123'
   ```
   Asegurate de que el Core tenga `CORS_ALLOWED_ORIGINS=http://localhost:5173` en su `.env`
   (el browser llama cross-origin).

2. **Aprovisioná app + api key** (platform-login → ecosystem → pool → app → api key con
   scopes `events:write`, `events:read_app`, `users:write_app`). Rápido con el Swagger (`ENABLE_SWAGGER_UI=true`, `/swagger-ui`) o
   por `curl`. Guardá el `app_id` y la `key`.

3. **Configurá el demo:**
   ```bash
   cp .env.example .env      # completá VITE_GATEWARD_APP_ID, GATEWARD_APP_ID, GATEWARD_API_KEY
   pnpm -C ../gateward-sdk build   # el SDK se consume por file: → necesita dist/
   pnpm install
   ```

4. **Corré:**
   ```bash
   pnpm dev      # http://localhost:5173
   ```

## Qué ejercita

| Browser (`GatewardAuth`) | Server (`GatewardServer`, API key) |
|---|---|
| register (detecta auto-login), login, refresh, logout | `verifyToken` vía JWKS |
| `getUser`, `updateProfile`, `changePassword` | `sendEvent` |
| `listSessions`, `revokeAllSessions` | `updateUserMetadata` |
| `onAuthStateChange` → todo evento al log | `listMembers` (ROLE-001) |

El log muestra los eventos de sesión aunque no los dispare un botón: un refresh
token muerto o un logout en otra pestaña aparecen igual.

## Flujo de prueba

1. **register** → 202 (el Core exige verificar email antes de login).
2. Marcá el usuario verificado (no hay SMTP local):
   ```bash
   pnpm verify-user demo@example.com
   ```
3. **login** → guarda tokens y muestra los claims. **refresh** los rota. **sessions** lista
   las propias. **me** trae el perfil; **update profile** escribe su metadata.
4. **verify token (server)** → el backend del demo valida el JWT vía JWKS (ES256).
5. **send event (server)** → emite `app.demo.button_clicked` con la API key.
6. **revoke others** cierra las demás sesiones sin tocar esta.
7. **list members (server)** lista el padrón de la app con la API key.
8. **logout** → limpia la sesión.

## Estructura

- `src/App.tsx` — UI + uso de `GatewardAuth` (browser).
- `server/plugin.ts` — plugin de Vite: `/api/send-event` y `/api/verify` con `GatewardServer`.
- `vite.config.ts` — separa env de browser (`VITE_*`) del de servidor (API key).
- `scripts/verify-user.mjs` — helper dev para marcar un usuario verificado.
