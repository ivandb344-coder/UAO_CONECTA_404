# UAO Conecta — Product Requirements

## Original problem statement
Construir una aplicación académica real para conectar estudiantes, monitores y profesores bajo el concepto “Encontrar. Coordinar. Saber a quién acudir.”

## Architecture decisions
- React 19 + CRA/CRACO con router modular (`src/pages/`, `src/components/`, `src/lib/`).
- FastAPI + Motor/MongoDB con documentos JSON, JWT sessions y autorización por rol.
- Files sobre object storage administrado y metadata en MongoDB.
- IA usa Emergent LLM key con streaming de GPT 5.4 Mini.
- Chat en MongoDB con polling cada 5s (WebSockets pendiente para siguiente iteración).
- Zona horaria dinámica America/Bogota en todos los timestamps.

## Personas
- Estudiantes buscando asignaturas, respuestas, personas y asesorías.
- Monitores acompañando asignaturas y publicando disponibilidad.
- Profesores gestionando asignaturas, recursos y asesorías.

## Core requirements
- MVP: auth, roles/programas, perfiles, asignaturas, dudas + respuestas + valoración + aceptación, asesorías + agenda + reservas + cupos, dashboard, chat, IA, archivos y guardados.
- Sidebar responsive en escritorio, bottom nav en móvil.
- Loading/empty/error/success states y data-testid en toda interacción.

## Implemented
### 2026-03-10
- Auth (register/login/demo, JWT) y `/api/auth/me`.
- Dashboard con stats, asignaturas seed y actividad reciente.
- Dudas listado + crear duda + placeholder respuestas.
- Asignaturas + Tareas (crear, entregar, retroalimentar, calificar).
- Chat con polling; IA streaming; carga de archivos.

### 2026-03-11
- **Refactor completo**: `src/pages/{Login,Dashboard,Questions,QuestionDetail,Subjects,SubjectDetail,Advisories,Chat,AI}.jsx` + `components/{Layout, ui/Stars, ui/states}` + `lib/{api,nav}.js`.
- **Dudas completas**: publicar respuestas, valoración 1-5 estrellas con actualización de promedio, marcar respuesta aceptada, protección anti-autovaloración, `is_owner`/`can_rate`/`my_rating` en detalle.
- **Asesorías completas**: agenda (crear/editar/toggle activo/eliminar), reservas con control de cupos y evitar duplicados, endpoint `/bookings/incoming` para asesores, cambios de estado (Pendiente → Aceptada / Rechazada / Cancelada / Completada / No asistió).
- Cuenta demo adicional para monitor.
- Testing agent: 28/28 backend + UI flows verificados sin bugs.

### 2026-03-12
- **Chat en tiempo real con WebSockets**: nuevo endpoint `/api/ws/chat/{room}` con `ConnectionManager`, auth por query token, broadcast por sala, evento `presence`. Persistencia en Mongo intacta; HTTP POST `/api/chat` sigue como fallback y también hace broadcast.
- **Frontend Chat**: reconexión con backoff, selector de salas (Comunidad UAO + una por asignatura), rutas `/chat` y `/chat/:room`, mensajes propios en teal a la derecha, indicador "En línea"/"Reconectando".
- Testing agent: 11/11 tests (6 WS/HTTP chat + 5 regresión), sin bugs.

### 2026-03-13
- **Correcciones**: (1) Google Login real vía Emergent Auth con endpoint `POST /api/auth/google` que canjea `session_id` por JWT propio. (2) Auto-reserva bloqueada tanto en frontend (botón "Gestionar" en lugar de "Solicitar cupo" para el propio dueño) como en backend (409). (3) Estrellas horizontales garantizadas con `flex-direction: row !important` y `display:inline-block` en SVG.
- **Login rediseñado**: layout de dos columnas, botón Google destacado en oscuro con separador "o con tu correo", enlaces "¿Olvidaste tu contraseña?" y "Crear una cuenta", accesos demo compactos.
- **Chat mejorado**:
  - Botón "Abrir chat" dentro de cada asignatura → `/chat/{subject_id}`.
  - Badge de mensajes no leídos en campana + sidebar Chat, alimentado por `GET /api/chat/summary` (polling 15s) y `POST /api/chat/{room}/seen`.
  - Presencia por rol: WS emite `users[]` con `{id,name,role,initial,picture}`. UI muestra chips con avatar coloreado por rol arriba de la sala.
  - Adjuntos (imagen o PDF ≤8MB) vía `/api/files` + payload WS `{body, file}`. Validación en backend: solo se aceptan `storage_path` del propio usuario.
- Testing agent: 13/13 backend + UI, sin bugs.

### 2026-06 (iteración 6)
- **Foto de perfil**: avatares privados en GridFS visibles para cualquier usuario autenticado (`_file_is_authorized`), componente `Avatar.jsx` con blob URL protegida, caché de blobs en `fileService.js` keyed por token (se vacía al cambiar sesión), interceptor axios 401 → evento `uao:unauthorized` → logout limpio. Sidebar/Profile ya no usan `<img src="/api/files/...">` directo.
- **Revisión docente**: `GET /api/submissions/incoming` (profesor/monitor autor de la tarea o dueño de la asignatura) con task/subject/file enriquecidos; `PATCH /submissions/{id}/feedback` ahora valida permiso de revisor y notifica al estudiante. Página `/revisiones` (nav solo para profesor/monitor) con filtros, vista previa, descarga y formulario de retroalimentación (nota + estado Revisada/Aprobada/Rechazada). Tareas demo migradas a `demo-monitor`.
- **Vista previa inline**: `FilePreviewModal` (imagen/PDF/video, fallback) + `FileActions` (Vista previa / Descargar) reutilizados en Recursos, entregas del estudiante (`subject_tasks` devuelve `submission.file`) y bandeja docente.
- **Google E2E**: verificado `POST /auth/google` con sesión inválida → 401 y usuario `profile_completed=false` forzado a `/perfil/completar`. El consentimiento real de Google debe probarse manualmente en la URL publicada.
- Testing agent iteración 6: 8/8 backend + todos los flujos frontend sin bugs.
- **Fix Network Error / Google (iteración 7)**: el usuario navegaba por el alias `subject-creator.preview.emergentagent.com` mientras `.env` apunta a `7858e35c-…`; el proxy reescribe `Origin` y las llamadas cross-origin fallaban (login demo y `POST /auth/google`). `lib/api.js` ahora usa `window.location.origin` cuando el host del navegador (no local) difiere del de `.env`, así API y WebSocket son same-origin. Verificado en ambos hosts por testing agent.

### 2026-09-30 (iteración 8) — Auditoría y sincronización producción (Render + GitHub Pages)
- **Causa raíz**: el commit `a89a4d3` reemplazó `auth.py` por una versión que no devolvía JWT, creaba usuarios sin `id` UUID y omitía `/auth/me`, `/auth/email-available` y `/auth/google/login`; además `lib/api.js` en GitHub Pages llamaba a `github.io/api` (404) y el callback de Google no se detectaba con HashRouter.
- **Backend**: `auth.py` reescrito (register/login/google → `{token, user}`, `/me`, `/email-available`, `/logout`, `/google/login` → 302 a `https://auth.emergentagent.com/?redirect=` con allowlist, forgot/reset con token de un solo uso, bcrypt seguro ≤72 bytes). `database.py` centraliza Motor (MONGODB_URL|MONGODB_URI|MONGO_URI|MONGO_URL) con TLS `certifi` solo para Atlas/remoto. CORS explícito (github.io + localhost:3000 + CORS_ORIGINS). `/api/` y `/api/health`. Migración de usuarios heredados sin `id` (arranque + perezosa).
- **Frontend**: `api.js` resuelve Render en GitHub Pages; `startGoogleAuth` → `${API}/auth/google/login?redirect=`; `getOAuthParams` detecta `session_id` en pathname/hash/search; sesión no se borra ante errores de red; logout sin doble confirmación.
- Verificado: 32/32 backend (testing agent), flujos UI en preview y simulación GitHub Pages → Render (bundle de producción + CORS real).
- Nota: la URL `demobackend.emergentagent.com/auth/v1/env/oauth/login` sugerida devuelve 404; se usa la entrada oficial `auth.emergentagent.com`.

## Prioritized backlog
- P0: OAuth Google real y recuperación de contraseña por correo.
- P1: Notificaciones (Fase 22, 31) y valoración de asesorías (Fase 23).
- P1: Perfil editable con foto, biografía y valoración 1-5 de perfiles (Fase 4, 5).
- P1: WebSockets para chat realtime (reemplazar el polling actual).
- P2: Recursos con almacenamiento (PDF, PPT, Excel, videos), Rutas (Fase 30), Búsqueda global (Fase 28), Mi grupo (Fase 29).
