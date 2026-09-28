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

## Prioritized backlog
- P0: OAuth Google real y recuperación de contraseña por correo.
- P1: Notificaciones (Fase 22, 31) y valoración de asesorías (Fase 23).
- P1: Perfil editable con foto, biografía y valoración 1-5 de perfiles (Fase 4, 5).
- P1: WebSockets para chat realtime (reemplazar el polling actual).
- P2: Recursos con almacenamiento (PDF, PPT, Excel, videos), Rutas (Fase 30), Búsqueda global (Fase 28), Mi grupo (Fase 29).
