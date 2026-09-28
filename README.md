# UAO Conecta

Plataforma académica para conectar estudiantes, monitores y profesores de la UAO: **Encontrar. Coordinar. Saber a quién acudir.**

Stack: **React 19 (CRA + CRACO)** · **FastAPI** · **MongoDB (Motor + GridFS)** · **WebSockets** · JWT.

## Funcionalidades

- Autenticación por correo/contraseña y Google (Emergent Auth). Rol, programa y semestre quedan asociados a la cuenta y se conservan en cada inicio de sesión. Un correo = una cuenta (índice único + validación en frontend y backend).
- Perfil editable (foto privada, biografía, información académica, contacto, redes y plataformas).
- Asignaturas (crear / unirse por código), tareas, entregas con archivos y bandeja de revisión docente con retroalimentación.
- Recursos por asignatura con vista previa inline (imagen, PDF, video) y descarga autenticada.
- Dudas con respuestas, valoración y respuesta aceptada. Asesorías con agenda, reservas y cupos.
- Chat en tiempo real (WebSocket) con adjuntos, presencia y no leídos. Notificaciones en campana.
- Asistente IA (GPT vía Emergent LLM key, solo para `/api/ai`).
- **Configuración › Accesibilidad**: alto contraste, tamaño de texto, animaciones, movimiento reducido, foco resaltado y controles grandes, guardados por usuario.
- Cierre de sesión con confirmación y mensaje de despedida.

## Estructura del repositorio

```
.
├── backend/
│   ├── server.py                 # Punto de entrada FastAPI: monta routers, CORS y seed
│   ├── app/
│   │   ├── core/                 # config (env, Mongo, GridFS), security (JWT), storage
│   │   ├── models/schemas.py     # Modelos Pydantic de entrada
│   │   ├── routers/              # auth, profile, subjects, questions, advisories, chat, files, ai, dashboard, notifications
│   │   └── services/             # users, files (autorización), notifications, chat (WS manager), seed
│   ├── tests/                    # Pruebas de integración (pytest)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                # Una pantalla por archivo (Login, Dashboard, Settings, Reviews, …)
│   │   ├── components/           # Layout, Avatar, LogoutDialog, files/, reviews/, settings/, ui/
│   │   ├── hooks/                # useProtectedFile
│   │   ├── lib/                  # api (axios + interceptores), accessibility, nav, programs, errors, contextos
│   │   ├── services/             # fileService (blobs autenticados, caché por sesión)
│   │   ├── styles/               # CSS por dominio (App, features, task, profile, review, accessibility)
│   │   ├── App.js                # Rutas y flujo de autenticación
│   │   └── index.js
│   ├── public/
│   ├── package.json · craco.config.js · tailwind.config.js
│   └── .env.example
├── docs/                         # Guías de prueba (auth)
├── memory/                       # Documentación de producto (PRD)
└── README.md
```

## Requisitos

- Node.js 18+ y Yarn 1.x
- Python 3.11+
- MongoDB 6+

## Configuración

Copia los ejemplos y completa los valores **fuera del control de versiones** (`.env` está en `.gitignore`):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Archivo | Variable | Descripción |
|---|---|---|
| backend/.env | `MONGO_URL` | Cadena de conexión a MongoDB |
| backend/.env | `DB_NAME` | Nombre de la base de datos |
| backend/.env | `JWT_SECRET` | Secreto largo y aleatorio para firmar JWT |
| backend/.env | `CORS_ORIGINS` | Orígenes permitidos separados por coma |
| backend/.env | `EMERGENT_LLM_KEY` | Solo para el asistente IA (`/api/ai`) |
| frontend/.env | `REACT_APP_BACKEND_URL` | URL pública del backend (sin `/api`) |

Nunca subas `.env`, claves, contraseñas ni tokens al repositorio.

## Ejecución en desarrollo

```bash
# Backend (http://localhost:8001)
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (http://localhost:3000)
cd frontend
yarn install
yarn start
```

Todas las rutas del backend viven bajo el prefijo `/api`. El frontend usa `REACT_APP_BACKEND_URL`; si la app se sirve desde otro dominio que enruta `/api` al backend, `lib/api.js` usa el mismo origen del navegador para evitar errores CORS.

## Pruebas

```bash
cd backend
REACT_APP_BACKEND_URL=http://localhost:8001 pytest
```

## Cuentas demo

Los botones "Demo estudiante" y "Demo monitor" del login crean/usan cuentas de prueba (`estudiante@uao.edu.co`, `monitor@uao.edu.co`).

## Seguridad y almacenamiento

- Los archivos se guardan en el bucket privado `uao_files` de MongoDB GridFS; la metadata en la colección `files`. Cada lectura verifica JWT y autorización (propietario, recurso publicado, adjunto de chat, entrega propia o revisor de la tarea; los avatares son visibles para cualquier usuario autenticado).
- El frontend abre y descarga archivos mediante peticiones autenticadas y blobs, sin URLs públicas.
- Los correos se normalizan a minúsculas y tienen índice único; al iniciar, el backend fusiona cuentas duplicadas heredadas conservando la cuenta activa.

## Accesibilidad

Preferencias por usuario (`PATCH /api/profile/preferences`) aplicadas como clases en `<html>`: `a11y-high-contrast`, `a11y-no-anim`, `a11y-reduced-motion`, `a11y-focus`, `a11y-large` y `data-text-size`. Además: enlace "Saltar al contenido", foco visible por defecto, `aria-label`/`aria-current`/`role="alert"` en controles y mensajes, estados con texto e icono (no solo color) y respeto de `prefers-reduced-motion`.
