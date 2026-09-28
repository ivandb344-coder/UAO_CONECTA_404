# UAO Conecta — Product Requirements

## Original problem statement
Construir una aplicación académica real para conectar estudiantes, monitores y profesores bajo el concepto “Encontrar. Coordinar. Saber a quién acudir.”

## Architecture decisions
- React 19 + CRA/CRACO starter, React Router and responsive CSS architecture.
- FastAPI + Motor/MongoDB with JSON documents, JWT sessions and role authorization.
- Files use managed object storage and metadata is persisted in MongoDB.
- AI uses the Emergent LLM key with streaming GPT 5.4 Mini responses.
- Chat messages persist in MongoDB and refresh periodically for a realtime-like MVP experience.

## Personas
- Estudiantes looking for subjects, answers, people and tutoring.
- Monitors supporting subjects and publishing availability.
- Professors managing subjects, resources and academic guidance.

## Core requirements
- MVP: authentication, roles/programs, profiles, subjects, questions, advisories, dashboard, chat, AI assistant, file endpoint and saved items.
- Responsive desktop sidebar and mobile bottom navigation.
- Dynamic dates in America/Bogota locale, loading/empty/error/success states and test IDs.

## Implemented (2026-03-10)
- Auth API with email/password, protected routes and demo account; Google entry point communicates configuration status.
- Persistent dashboard, seeded subjects/advisories, question creation, advisor booking, persistent chat, upload endpoint and AI streaming endpoint.
- Full MVP interface across Inicio, Dudas, Asignaturas, Asesorías, Chat and Asistente IA.
- Tareas académicas dentro de cada asignatura: creación para profesores/monitores, entregas persistentes y reentregas para estudiantes, estado, fecha límite, feedback y calificación.

## Prioritized backlog
- P0: Complete OAuth Google credentials and password recovery email flow.
- P1: Answers UI, accepted answers, profile editing and ratings.
- P1: Real WebSocket chat, notifications and file permissions.
- P2: Tasks, submissions, activities, videos and global search.