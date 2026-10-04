#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

## user_problem_statement: "Implementar mejoras de Google/perfil, enlaces, asignaturas y acceso autenticado a archivos sin romper UAO Conecta"
## backend:
##   - task: "Perfil Google y validación académica"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "El perfil incompleto continúa en Completa tu perfil; el backend ahora exige semestre para estudiantes, valida rol/programa y nombres de usuario únicos."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: POST /api/auth/demo y /api/auth/demo-advisor funcionan correctamente. GET /api/auth/me retorna datos correctos para ambos roles. Profile completion logic funciona: estudiante con semestre tiene profile_completed=True. Username uniqueness validation funciona: GET /api/profile/username-available retorna error específico para username duplicado. PATCH /api/profile/me rechaza username duplicado con error de campo específico."
##   - task: "Crear y unirse a asignaturas"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "Se agregó creación para los tres roles, validación, creador/rol, código de unión y endpoint de unión."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: POST /api/subjects acepta estudiante, monitor y profesor autenticados. Validación de campos funciona correctamente (nombre vacío, programa inválido, semestre fuera de rango retornan 422 con errores específicos). Guarda creator_role, creator_name, access_code correctamente. POST /api/subjects/join funciona: código inválido retorna 404, código válido permite unirse y retorna la asignatura."
##   - task: "Archivos privados autorizados"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "Se migró el adaptador de archivos desde Emergent Object Storage a MongoDB GridFS usando MONGO_URL/DB_NAME; EMERGENT_LLM_KEY queda únicamente para /api/ai."
##       - working: false
##         agent: "testing"
##         comment: "Prueba anterior falló porque el proveedor Emergent Object Storage exigía EMERGENT_LLM_KEY y devolvía 401."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Migración a MongoDB GridFS completada exitosamente. 22/22 tests pasaron. EMERGENT_LLM_KEY solo se usa en /api/ai (línea 994). Storage usa MongoDB GridFS con file_bucket (líneas 19, 22-29, 31-39). Probado: 1) Upload de 10 tipos de archivos (PDF, Word, PowerPoint, Excel, PNG, JPG, ZIP, MP4, TXT, MD) - todos 200 OK. 2) Profile photo upload usa mismo flujo GridFS - 200 OK. 3) Download con Content-Type y Content-Disposition correctos. 4) Autorización: 401 sin auth ✓, 403 para no-propietario sin referencia ✓, 200 para propietario ✓. 5) Publicar recurso de asignatura con archivo - 200 OK, usuario unido puede acceder ✓. 6) Entrega de tarea con archivo - profesor puede acceder a archivo de estudiante ✓. No se usa integrations.emergentagent.com para archivos. Todos los archivos se guardan y recuperan desde MongoDB GridFS correctamente."
##   - task: "Enlaces de perfil"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: POST /api/profile/links funciona para las 10 plataformas (moodle, whatsapp, discord, meet, teams, piazza, telegram, email, linkedin, custom). URL inválida retorna 422 con error específico. Custom link sin label retorna 422 con error 'Escribe un nombre para el enlace personalizado'. Custom link con label e icon funciona correctamente. PATCH /api/profile/links/{lid} y DELETE /api/profile/links/{lid} funcionan."
## backend:
##   - task: "Entregas de tareas con archivos"
##     implemented: true
##     working: true
##     file: "backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "Se validó que file_id de una entrega solo pueda apuntar a un archivo subido por el estudiante autenticado."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Task submission with files completamente funcional. 27/27 tests pasaron. Verificado: 1) Estudiante autenticado sube archivo PDF pequeño a POST /api/files y recibe id/storage_path ✓. 2) POST /api/tasks/{task_id}/submissions con text + file_id guarda la entrega correctamente ✓. 3) POST con file_id de otro usuario retorna 422 con error específico 'El archivo de la entrega no es válido o no te pertenece.' y NO lo asocia ✓. 4) POST con file_id inexistente retorna 422 con mismo error específico ✓. 5) Profesor recibe 403 'Las entregas están disponibles para estudiantes' al intentar entregar ✓. 6) Monitor recibe 403 'Las entregas están disponibles para estudiantes' ✓. 7) Profesor autor de la tarea puede abrir archivo mediante GET /api/files/{path} ✓. 8) Usuario no autorizado recibe 403 'No tienes permisos para abrir este archivo.' ✓. 9) Entregas solo con texto funcionan sin romper nada ✓. MongoDB GridFS funcionando correctamente. Validación de propiedad de archivos implementada y funcionando."
## frontend:
##   - task: "Login y autenticación"

##     implemented: true
##     working: true
##     file: "frontend/src/pages/Login.jsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Login funciona correctamente. Página de login carga sin errores ✓. Login por correo con estudiante@uao.edu.co / UAOdemo2026! funciona y redirige a /inicio ✓. Credenciales inválidas muestran error 'Correo o contraseña incorrectos' ✓. Demo estudiante funciona y redirige a dashboard ✓. Demo monitor funciona y redirige a dashboard ✓. Google button visible con data-testid correcto ✓. NO hay requests a undefined/api ✓. Frontend/.env configurado correctamente con REACT_APP_BACKEND_URL. El reporte del usuario sobre no poder iniciar sesión fue resuelto con la creación de frontend/.env."

##   - task: "Perfil editable y enlaces"
##     implemented: true
##     working: true
##     file: "frontend/src/pages/ProfileEdit.jsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "Se conserva el editor existente y se añadieron contacto adicional, icono de enlace y edición de nombre/icono/URL."
##       - working: NA
##         agent: "user"
##         comment: "El usuario autorizó prueba frontend y reporta que tampoco puede iniciar sesión; revisar flujo de login y Google."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Profile edit funciona completamente. Navegación a /perfil/editar ✓. Editar bio y contact_info ✓. Guardar cambios muestra badge 'Guardado' ✓. Agregar link con URL válida (linkedin) ✓. Validación de URL inválida funciona correctamente con mensaje 'Ingresa una URL válida' ✓. Editar label de link ✓. Toggle visibilidad ✓. Eliminar link con confirmación ✓. Todas las plataformas disponibles: moodle, whatsapp, discord, meet, teams, piazza, telegram, email, linkedin, custom."
##   - task: "Crear asignaturas y abrir archivos autenticados"
##     implemented: true
##     working: true
##     file: "frontend/src/components/CreateSubjectForm.jsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "Se añadieron formularios desde dashboard/asignaturas y utilidades blob autenticadas para visualizar/descargar archivos."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Crear asignatura funciona completamente. Formulario se abre desde /asignaturas ✓. Campos: nombre, código, descripción, programa (select con optgroups), semestre, horario, info adicional ✓. Validación funciona ✓. Subject creado aparece en catálogo con código AUTO202 ✓. Join con código inválido muestra error 'No encontramos una asignatura con ese código de unión' ✓. Subject detail carga correctamente ✓. Resources: formulario de upload ✓, archivo se adjunta (documento-prueba.txt) ✓, recurso se publica ✓. Botones 'Abrir / visualizar' y 'Descargar' usan openProtectedFile con blob autenticado (NO href directo) ✓. Chat carga correctamente con controles de adjuntos ✓. Sistema de archivos autenticados funcionando."
## frontend:
##   - task: "Entregas de tareas con archivos en frontend"
##     implemented: true
##     working: true
##     file: "frontend/src/pages/SubjectDetail.jsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "Se añadió selector de archivo, subida autenticada a GridFS y asociación segura mediante file_id al entregar tareas."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Flujo completo de entregas con archivos funciona correctamente. 1) Login como estudiante y navegación a asignatura con tareas ✓. 2) Modal 'Entregar/Actualizar entrega' se abre correctamente ✓. 3) Entrega solo con texto funciona sin romper nada ✓. 4) Selector de archivo submission-file-input permite seleccionar PDF pequeño ✓. 5) Indicador de subida muestra 'Cambiar archivo' y nombre del archivo adjunto (tarea_matematicas.pdf) ✓. 6) Envío con archivo cierra modal exitosamente sin errores de consola ✓. 7) Actualizar entrega reemplazando archivo funciona (tarea_actualizada.pdf) ✓. 8) Validación de archivo mayor de 25MB muestra mensaje específico 'El archivo de la entrega no puede pesar más de 25MB.' ✓. 9) Como monitor: NO aparece botón de entregar ✓, botón 'Nueva tarea' visible ✓. 10) UI usa subida autenticada POST /api/files, NO expone URLs públicas directas ✓. NOTA MENOR: Error 401 en carga de foto de perfil después de cambio de sesión (no relacionado con entregas)."

## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 7
##   run_ui: true
## test_plan:
##   current_focus:
##     - "Entregas de tareas con archivos - COMPLETADO"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"
## agent_communication:
##   - agent: "main"
##     message: "Backend y frontend implementados; probar primero endpoints backend con credenciales demo y revisar permisos de archivos antes de validar la interfaz."
##   - agent: "testing"
##     message: "Backend testing completado. 27/28 tests pasaron. CRÍTICO: File upload falla por falta de EMERGENT_LLM_KEY válido en backend/.env. Se creó backend/.env con MONGO_URL, DB_NAME, JWT_SECRET pero EMERGENT_LLM_KEY='demo-key-for-testing' no es válido. Se requiere Emergent Universal Key (sk-emergent-*) para storage. Todos los demás endpoints funcionan correctamente: auth, subjects, profile, links. La lógica de autorización de archivos está implementada pero no se pudo probar completamente por el error de storage."
##   - agent: "user"
##     message: "Autoriza pruebas frontend y reporta que no puede iniciar sesión; validar login por correo, botones demo y callback Google, además de las nuevas pantallas."

##   - agent: "testing"
##     message: "✅ MIGRACIÓN A GRIDFS EXITOSA. Backend testing completado: 22/22 tests pasaron. File storage ahora usa MongoDB GridFS exclusivamente (no Emergent Object Storage). EMERGENT_LLM_KEY solo para /api/ai. Verificado: upload de 10 tipos de archivos, profile photo, download con metadata correcta, autorización completa (401/403/200), recursos de asignatura, entregas de tareas. Sistema de archivos privados funcionando correctamente. Backend listo para producción."

##   - agent: "testing"
##     message: "✅ FRONTEND TESTING COMPLETADO. Todas las funcionalidades críticas funcionan correctamente. Login por correo (estudiante@uao.edu.co), botones Demo (estudiante/monitor), Google button visible. Profile edit: guardar cambios ✓, agregar enlaces ✓, validación URL inválida ✓. Subjects: crear asignatura ✓, validación ✓, join con código inválido ✓. Resources: upload de archivos ✓, botones Abrir/Descargar con blob autenticado ✓. Chat: página carga ✓, controles de adjuntos ✓. NO hay requests a undefined/api. Warnings menores: WebSocket chat (esperado), hydration warning en select (cosmético), 422/404 de validaciones (esperado). Sistema frontend funcionando correctamente."

##   - agent: "testing"
##     message: "✅ TASK SUBMISSIONS WITH FILES - COMPLETADO. Backend testing: 27/27 tests pasaron. Todas las validaciones de entregas con archivos funcionan correctamente: 1) Upload de archivos por estudiante autenticado ✓. 2) Crear entrega con text + file_id ✓. 3) Validación de propiedad de archivo (422 con error específico para file_id de otro usuario) ✓. 4) Validación de existencia de archivo (422 para file_id inexistente) ✓. 5) Restricción de rol: profesor y monitor reciben 403 al intentar entregar ✓. 6) Autorización: profesor autor puede acceder a archivo de entrega del estudiante ✓. 7) Autorización: usuario no autorizado recibe 403 ✓. 8) Entregas solo con texto funcionan sin problemas ✓. Sistema de entregas con archivos completamente funcional y listo para producción."

##   - agent: "testing"
##     message: "✅ FRONTEND FILE SUBMISSIONS - COMPLETADO. Testing completo del flujo de entregas con archivos en navegador. Todos los requisitos verificados: 1) Login estudiante y navegación a asignatura con tareas ✓. 2) Modal 'Entregar/Actualizar entrega' funciona ✓. 3) Entrega solo texto sigue funcionando ✓. 4) Selector submission-file-input permite adjuntar PDF pequeño ✓. 5) Indicador de subida muestra 'Cambiar archivo' y nombre de archivo ✓. 6) Envío con archivo exitoso sin errores de consola ✓. 7) Actualizar entrega reemplazando archivo funciona ✓. 8) Validación 25MB muestra mensaje específico ✓. 9) Monitor/profesor NO ve botón entregar, SÍ ve 'Nueva tarea' ✓. 10) UI usa POST /api/files autenticado, sin URLs públicas expuestas ✓. Sistema de entregas con archivos completamente funcional en producción."

#====================================================================================================
# ITERACIÓN: Auditoría y sincronización producción (Render + GitHub Pages) — 2026-09-30
#====================================================================================================
## user_problem_statement: "Auditar, reparar y sincronizar UAO Conecta para que producción funcione: backend Render (https://uao-conecta-404.onrender.com/api) + frontend GitHub Pages (https://ivandb344-coder.github.io/UAO_CONECTA_404) + MongoDB Atlas."
## backend:
##   - task: "Auth restaurada (JWT) + endpoints Google"
##     implemented: true
##     working: true
##     file: "backend/app/routers/auth.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "auth.py había regresionado (commit a89a4d3): login/register/google no devolvían token, usuarios sin 'id' UUID, faltaban /auth/me, /auth/email-available, /auth/google/login. Reescrito: register/login/google devuelven {token, user}; GET /auth/me; GET /auth/email-available; GET /auth/google/login?redirect= (302 a https://auth.emergentagent.com/?redirect=..., redirect validado contra CORS_ORIGINS/FRONTEND_URL, default GitHub Pages); POST /auth/google (session-data de Emergent con X-Session-ID); forgot-password (503 si SMTP no configurado, respuesta genérica); reset-password (token de un solo uso, min 8). Migración de usuarios sin 'id' al arrancar y perezosa en login/google."
##   - task: "MongoDB TLS condicional + CORS explícito"
##     implemented: true
##     working: true
##     file: "backend/app/database.py, backend/app/core/config.py, backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "database.py usa MONGODB_URL|MONGODB_URI|MONGO_URI|MONGO_URL; tlsCAFile=certifi solo para Atlas/remoto (mongodb+srv, tls/ssl=true o host no local). CORS: https://ivandb344-coder.github.io + http://localhost:3000 + CORS_ORIGINS (sin '*'), allow_credentials=True. Nuevos GET /api/ y GET /api/health."
## frontend:
##   - task: "Cliente API apunta a Render en GitHub Pages"
##     implemented: true
##     working: true
##     file: "frontend/src/lib/api.js"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "Antes en GitHub Pages usaba window.location.origin + /api (github.io/api → 404). Ahora: hosts Emergent → mismo origen; localhost → REACT_APP_BACKEND_URL; resto (GitHub Pages) → https://uao-conecta-404.onrender.com. Bearer uao_token."
##   - task: "Google login + callback con HashRouter"
##     implemented: true
##     working: true
##     file: "frontend/src/pages/Login.jsx, frontend/src/App.js"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: NA
##         agent: "main"
##         comment: "startGoogleAuth → ${API}/auth/google/login?redirect=<origin+path>. Con HashRouter '#session_id=x' se ve como pathname '/session_id=x'; getOAuthParams ahora revisa pathname/search/hash. Sesión no se borra ante errores de red (solo 401/403)."
## test_plan:
##   current_focus: []
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"
## agent_communication:
##   - agent: "main"
##     message: "Probar auth completa (registro, login, me, email-available, google/login redirect, google inválido 401, forgot 503 sin SMTP, reset inválido 400), CORS desde https://ivandb344-coder.github.io, y regresión de flujos principales (dashboard, dudas, asignaturas, asesorías, perfil completar). Credenciales en /app/memory/test_credentials.md. /auth/demo ya NO existe (eliminado previamente por el usuario)."
##   - agent: "testing"
##     message: "Iteración 8: backend 32/32 (backend/tests/test_iteration8_auth.py). Frontend OK; único hallazgo: doble confirmación en logout (window.confirm + LogoutDialog)."
##   - agent: "main"
##     message: "Eliminado window.confirm de App.js logout; verificado con Playwright: una sola confirmación, token eliminado, aviso de despedida."
##
##====================================================================================================
## ITERACIÓN: Evidencias DCU — capturas reales, dualidad de roles y verificación final — 2026-10-04
##====================================================================================================
## user_problem_statement: "Generar evidencias reales en /public/assets/evidencias para /evidencias-dcu (ambas cuentas: docente y estudiante + Modo Monitor), dejar seed/credenciales funcionales y certificar responsive 360px + contraste WCAG AA."
## backend:
##   - task: "Arranque backend: backend/.env ausente (MONGO_URL)"
##     implemented: true
##     working: true
##     file: "backend/.env, backend/app/database.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "El backend crasheaba al importar (RuntimeError: no MONGO_URL) porque backend/.env no existía. Se creó backend/.env con MONGO_URL=mongodb://localhost:27017, DB_NAME=uao_conecta, JWT_SECRET. Tras reinicio: /api/health ok (database:true), seed creó pacastillo@uao.edu.co (professor) y estudiante.demo@uao.edu.co (student), login 200 ambos, /api/auth/institutional-check verifica docente/estudiante."
## frontend:
##   - task: "Imágenes reales de Evidencias DCU (cero enlaces rotos)"
##     implemented: true
##     working: true
##     file: "frontend/public/assets/evidencias/*.png, frontend/src/lib/evidencias.js, frontend/.env, scripts/capture_evidencias.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "La carpeta public/assets/evidencias NO existía (imágenes rotas). Se creó frontend/.env (REACT_APP_BACKEND_URL=http://localhost:8001). Script Playwright capturó 8 PNG reales: 01-login, 02-verificacion (badge 'Docente verificado'), 03-inicio (estudiante), 03-inicio-docente (dualidad: entregas por calificar/cursos), 04-asesorias, 05-dudas, 06-movil (360px), 07-monitor (Modo Monitor). Se añadieron 2 diapositivas (inicio-docente, monitor) al carrusel FLOW. Verificación: 8/8 HTTP 200, 8/8 diapositivas cargan, pestaña Necesidades OK, 360px sin overflow, contraste blanco/#A81B1E=7.39 AAA, blanco/#1E293B=14.63 AAA, coral/#1E293B=6.07 AA, texto/fondo=13.98 AAA. Credenciales en /app/memory/test_credentials.md."
## test_plan:
##   current_focus:
##     - "Evidencias DCU completas - FINALIZADO"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"
## agent_communication:
##   - agent: "main"
##     message: "Cierre de Evidencias DCU completado y verificado con scripts propios (scripts/capture_evidencias.py, scripts/verify_evidencias.py). Cuentas demo: pacastillo@uao.edu.co (docente) y estudiante.demo@uao.edu.co (estudiante), password UAOdemo2026!. Pendiente a decisión del usuario: corrida completa con testing agents."
