# Emergent Auth Testing Playbook

Applies to UAO Conecta. Login is JWT-based (`Bearer <token>` in Authorization header).
The Google button hits Emergent Auth (`https://auth.emergentagent.com/?redirect=...`),
returns with `#session_id=...` at `/inicio`, then the frontend exchanges the session_id
against `POST /api/auth/google` which validates through Emergent's `/session-data` and
issues our own JWT that is stored in `localStorage.uao_token`.

## Testing steps
1. Manual UI: visit `/`, click "Continuar con Google", accept in the popup, arrive at
   `/inicio#session_id=...`. Frontend should exchange silently and land on Dashboard
   with the user's name in the sidebar.
2. Automated: cannot fully script the Google consent screen. Verify endpoints:
   - `POST /api/auth/google` with an invalid session id returns 401.
   - `GET /api/auth/me` with the JWT returned by any auth endpoint returns the user.
3. Regression: `POST /api/auth/demo` and `POST /api/auth/demo-advisor` continue to work.
