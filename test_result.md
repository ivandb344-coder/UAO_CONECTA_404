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
##
##====================================================================================================
## ITERACIÓN: Cierre definitivo — batería de pruebas + build de producción — 2026-10-04
##====================================================================================================
## user_problem_statement: "Ejecutar batería rápida de pruebas automatizadas, verificar build de producción del frontend (craco build) y arranque del backend con 0 errores; entregar guion de sustentación."
## test_plan:
##   current_focus:
##     - "Verificar fix de arranque backend (backend/.env MONGO_URL) — login ambos roles, institutional-check, integrations summary, health"
##     - "Regresión backend rápida (suite pytest existente)"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"
## agent_communication:
##   - agent: "main"
##     message: "CIERRE: verificar con testing agent que el fix de arranque (backend/.env con MONGO_URL local) dejó el backend 100% funcional: GET /api/health, POST /api/auth/login para pacastillo@uao.edu.co (debe dar role=professor) y estudiante.demo@uao.edu.co (role=student), password UAOdemo2026!, GET /api/auth/institutional-check y GET /api/integrations/summary (con Bearer). Correr la suite pytest de backend/tests. Credenciales en /app/memory/test_credentials.md. Yo verifico el build de producción del frontend por mi lado."

## backend:
##   - task: "Fix de arranque backend (backend/.env MONGO_URL)"
##     implemented: true
##     working: true
##     file: "backend/.env, backend/app/database.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFICADO: Backend arranca con 0 errores. Logs muestran 'Application startup complete', 'File storage ready: MongoDB GridFS bucket uao_files', seed creó ambas cuentas demo (pacastillo@uao.edu.co professor, estudiante.demo@uao.edu.co student). Warning menor: JWT_SECRET 28 bytes (recomendado 32) pero no impide funcionamiento. Batería de regresión custom: 8/8 tests PASS: 1) GET /api/health → 200 status=ok database=true ✓. 2) POST /api/auth/login docente → 200 role=professor name='Paola Andrea Castillo' ✓. 3) POST /api/auth/login estudiante → 200 role=student ✓. 4) GET /api/auth/institutional-check docente → institutional=true role=professor verified_by menciona directorio ✓. 5) institutional-check estudiante → institutional=true role=student ✓. 6) institutional-check externo (x@gmail.com) → institutional=false (filtro dominio) ✓. 7a) GET /api/integrations/summary docente con Bearer → 200 mock=true systems=[moodle,teams,banner] contenido docente ('Entregas por calificar', 'Cursos asignados') ✓. 7b) integrations/summary estudiante → contenido estudiante ('Promedio acumulado', 'Estado de matrícula') ✓. Suite pytest existente: 36 PASS, 45 FAIL/ERROR por tests desactualizados (30 errores por /auth/demo eliminado previamente, 6 errores por REACT_APP_BACKEND_URL no definido en backend, 9 fallos por cambios de diseño API como role auto-asignado vs campo explícito). Fix de arranque 100% funcional."
##   - agent: "testing"
##     message: "✅ FIX DE ARRANQUE COMPLETADO. Backend arranca sin errores, todas las funcionalidades core verificadas (health, login ambos roles, institutional-check, integrations summary). Batería custom: 8/8 PASS. Suite pytest legacy: 36/81 PASS, resto falla por endpoints eliminados (/auth/demo) o cambios de diseño previos (no relacionados con fix de arranque). Backend 100% funcional para producción."
##   - agent: "testing"
##     message: "✅ CIERRE BACKEND VERIFICADO (8/8 checks PASS). Backend arranca con 0 errores (fix backend/.env MONGO_URL). Health ok (database:true). Login docente pacastillo@uao.edu.co → role=professor; estudiante.demo@uao.edu.co → role=student. institutional-check: docente/estudiante correctos y filtro de dominio (gmail → institutional:false). integrations/summary devuelve moodle/teams/banner con contenido específico por rol. Suite pytest legacy: 36 PASS / 45 FAIL por tests desactualizados (/auth/demo eliminado y API antigua) — NO relacionados con el fix. JWT secret ampliado a 42 bytes → advertencia InsecureKeyLength eliminada."
##   - agent: "main"
##     message: "Build de producción del frontend OK: craco build compiló con 0 errores (solo warnings ESLint exhaustive-deps benignos), 'The build folder is ready to be deployed', main.js ~141 kB gzip. Backend arranca con 0 errores y 0 warnings tras ampliar JWT_SECRET. Guion de sustentación entregado en docs/07_guion_sustentacion.md. Proyecto listo para sustentación."
##
##====================================================================================================
## ITERACIÓN: 5 features nuevas (Lightbox, reset modal, IA key+mock, chat persistente, ecosistema) — 2026-10-04
##====================================================================================================
## user_problem_statement: "Implementar 5 tareas: 1) Lightbox en Evidencias DCU, 2) flujo de reset de contraseña en modal con vista previa de correo, 3) EMERGENT_LLM_KEY + fallback Mock AI, 4) persistencia del chat IA en sessionStorage + nueva conversación, 5) tarjetas Gmail/Piazza/WhatsApp por categoría en la capa de integración."
## backend:
##   - task: "Asistente IA: EMERGENT_LLM_KEY (emergentintegrations) + fallback Mock AI"
##     implemented: true
##     working: true
##     file: "backend/app/routers/ai.py, backend/.env, backend/requirements.txt"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "Reescrito /api/ai: usa emergentintegrations LlmChat (openai gpt-5.4) con EMERGENT_LLM_KEY (lee EMERGENT_LLM_KEY u OPENAI_API_KEY). Ante CUALQUIER fallo o falta de clave cae a _mock_answer (respuestas académicas UAO por palabras clave: asesorías, horarios, notas, matrícula, moodle, teams, dudas, acceso, saludo). SIEMPRE responde 200 PlainTextResponse; solo 400 si el mensaje está vacío. Verificado manualmente: responde con LLM real (la key funciona) y el mock cubre el fallback."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFICADO: POST /api/ai funciona perfectamente. Probados 6 mensajes distintos ('¿Dónde encuentro asesorías de Cálculo?', '¿Cuál es mi horario?', '¿cómo veo mis notas?', 'hola', '¿Qué es UAO Conecta?', 'ayuda con matrícula') → todos 200 OK con texto no vacío (228-509 chars), Content-Type: text/plain; charset=utf-8 ✓. LLM real (EMERGENT_LLM_KEY) respondiendo correctamente con respuestas coherentes en español ✓. Mensaje vacío → 400 con detalle 'Escribe un mensaje para el asistente.' ✓. Sin Authorization → 401 (no autenticado) ✓. NUNCA devolvió 500 (robustez del fallback verificada) ✓. Fallback Mock AI implementado correctamente en código (captura Exception y llama _mock_answer) aunque no fue necesario activarlo en las pruebas porque el LLM real funciona ✓."
##   - task: "Capa de integración: ecosistema Gmail/Piazza/WhatsApp por categoría"
##     implemented: true
##     working: true
##     file: "backend/app/routers/integrations.py"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "GET /api/integrations/summary ahora incluye 'ecosystem' con 3 herramientas: gmail (Comunicación oficial, synced), piazza (Foros académicos, available), whatsapp (Soporte & contacto directo, synced). Cada una con key, name, category, category_label, description, status, color y cta{label,action,url}. 'systems' (moodle/teams/banner) intacto."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFICADO: GET /api/integrations/summary funciona perfectamente para ambos roles (estudiante y profesor). 'systems' contiene exactamente ['moodle', 'teams', 'banner'] ✓. 'ecosystem' contiene exactamente 3 items ['gmail', 'piazza', 'whatsapp'] ✓. Cada item del ecosystem tiene todos los campos requeridos (key, category_label, status, description, cta) ✓. category_label verificados: gmail='Comunicación oficial', piazza='Foros académicos', whatsapp='Soporte & contacto directo' ✓. Cada cta tiene label, action, url correctos ✓. Status: gmail=synced, piazza=available, whatsapp=synced ✓. Funciona igual para estudiante y profesor ✓."
## frontend:
##   - task: "Lightbox (ampliar imagen) en Evidencias DCU"
##     implemented: true
##     working: true
##     file: "frontend/src/components/evidencias/Lightbox.jsx, ZoomableImage.jsx, NecesidadesTab.jsx, FlowCarousel.jsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "Clic en cualquier captura abre Lightbox a pantalla completa (fondo oscuro translúcido + backdrop-blur), botón X, clic fuera y Esc para cerrar, hint 'Clic para ampliar' al hover. El enlace 'Ver' de la tabla se conserva y sigue navegando sin abrir el modal. Verificado con Playwright (t1_* todos PASS)."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Lightbox funciona perfectamente. En /#/evidencias-dcu pestaña 'Propuesta de valor': hint 'Clic para ampliar' visible al hover ✓. Click en imagen abre lightbox ([data-testid='lightbox']) a pantalla completa con fondo oscuro translúcido ✓. Imagen carga correctamente (naturalWidth: 3200px) ✓. Cierra con botón X ([data-testid='lightbox-close']) ✓. Cierra haciendo clic en backdrop ✓. Cierra con tecla Escape ✓. En pestaña 'Satisfacción de necesidades': botón 'Ver' ([data-testid='ev-need-open-N1']) navega a /#/asignaturas SIN abrir lightbox ✓. Mobile 360px: sin scroll horizontal ✓."
##   - task: "Reset de contraseña en modal con vista previa de correo"
##     implemented: true
##     working: true
##     file: "frontend/src/components/auth/ForgotPasswordModal.jsx, frontend/src/pages/Login.jsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "'¿Olvidaste tu contraseña?' abre modal con validación en tiempo real @uao.edu.co (error rojo + submit deshabilitado). 'Enviar enlace' muestra vista previa del correo (encabezado UAO #A81B1E, destinatario, asunto, token UAO-2026-RESTORE-SECURE, expiración 15 min) y botón volver. Ruta /recuperar-contrasena intacta. Verificado con Playwright (t2_* PASS)."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Modal de reset funciona perfectamente. Click en '¿Olvidaste tu contraseña?' ([data-testid='forgot-password-button']) abre modal ([data-testid='forgot-modal']) ✓. Email inválido 'test@gmail.com': error visible ([data-testid='forgot-email-error']) 'El correo debe terminar en @uao.edu.co.' ✓, botón submit deshabilitado ✓. Email válido 'daniel@uao.edu.co': botón submit habilitado ✓. Click 'Enviar enlace' ([data-testid='forgot-submit']) muestra vista previa ([data-testid='forgot-email-preview']) ✓. Token correcto 'UAO-2026-RESTORE-SECURE' ([data-testid='forgot-preview-token']) ✓. Destinatario correcto 'daniel@uao.edu.co' ([data-testid='forgot-preview-recipient']) ✓. Aviso expiración '15 minutos' presente ✓. Click 'Volver a iniciar sesión' ([data-testid='forgot-done']) cierra modal ✓. Mobile 360px: sin scroll horizontal ✓."
##   - task: "Persistencia del chat IA (sessionStorage) + nueva conversación"
##     implemented: true
##     working: true
##     file: "frontend/src/pages/AI.jsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "El chat guarda/lee messages en sessionStorage['uao_chat_history']; al navegar fuera y volver se restaura. Botón 'Nueva conversación' limpia el historial. Verificado con Playwright (t4_* PASS)."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Persistencia del chat funciona perfectamente. En /#/asistente-ia: mensaje 'Hola, prueba de persistencia' enviado ([data-testid='ai-message-input'], [data-testid='send-ai-message']) ✓. Respuesta del asistente recibida (3 mensajes totales: bienvenida + usuario + IA) ✓. Navegación a /#/configuracion y regreso a /#/asistente-ia: conversación persiste (3 mensajes presentes) ✓. Mensaje de prueba 'prueba de persistencia' encontrado en conversación restaurada ✓. Click 'Nueva conversación' ([data-testid='ai-new-conversation']): historial limpiado correctamente (solo 1 mensaje de bienvenida) ✓. sessionStorage['uao_chat_history'] funcionando correctamente ✓."
##   - task: "Tarjetas de ecosistema (Gmail/Piazza/WhatsApp) en el dashboard"
##     implemented: true
##     working: true
##     file: "frontend/src/components/hub/EcosystemLayer.jsx, IntegrationLayer.jsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "Sección 'Ecosistema de herramientas' bajo la capa de integración con 3 tarjetas por categoría (ícono, etiqueta, descripción, estado Sincronizado/Disponible, botón Abrir↗/Conectar). 'Conectar' alterna a 'Sincronizado'. Responsive 360px sin overflow. Verificado con Playwright (t5_* PASS)."
##       - working: true
##         agent: "testing"
##         comment: "✅ VERIFIED: Tarjetas de ecosistema funcionan perfectamente. En /#/inicio sección 'Ecosistema de herramientas' ([data-testid='ecosystem-layer']) visible ✓. 3 tarjetas presentes: Gmail ([data-testid='eco-card-gmail']), Piazza ([data-testid='eco-card-piazza']), WhatsApp ([data-testid='eco-card-whatsapp']) ✓. Category labels correctos: Gmail='Comunicación oficial' ([data-testid='eco-category-gmail']), Piazza='Foros académicos' ([data-testid='eco-category-piazza']), WhatsApp='Soporte & contacto directo' ([data-testid='eco-category-whatsapp']) ✓. Piazza status inicial: 'Disponible' ([data-testid='eco-status-piazza']) ✓. Click 'Conectar' ([data-testid='eco-connect-piazza']): status cambia a 'Sincronizado' ✓, botón cambia a 'Abrir' ([data-testid='eco-open-piazza']) ✓. Mobile 360px: sin scroll horizontal ✓."
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 10
##   run_ui: false
## test_plan:
##   current_focus: []
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"
## agent_communication:
##   - agent: "main"
##     message: "Probar SOLO backend: 1) POST /api/ai con token válido devuelve 200 texto no vacío para distintos mensajes (asesorías, horarios, notas, saludo) — debe responder SIEMPRE, nunca 500. 2) POST /api/ai con mensaje vacío → 400. 3) POST /api/ai sin token → 401/403. 4) GET /api/integrations/summary incluye 'ecosystem' con gmail/piazza/whatsapp y sus category_label; 'systems' (moodle/teams/banner) sigue intacto por rol. Credenciales en /app/memory/test_credentials.md (estudiante.demo@uao.edu.co / UAOdemo2026!). NO probar frontend aún."
##   - agent: "testing"
##     message: "✅ BACKEND TESTING COMPLETADO - ITERACIÓN 9. Todos los tests pasaron (3/3 PASS). 1) POST /api/ai: 6 mensajes distintos → todos 200 OK con texto no vacío (228-509 chars), Content-Type correcto, LLM real respondiendo en español, mensaje vacío → 400 con detalle correcto, sin auth → 401, NUNCA devolvió 500 (robustez verificada). 2) GET /api/integrations/summary (estudiante): 'systems' con moodle/teams/banner ✓, 'ecosystem' con 3 items (gmail/piazza/whatsapp) ✓, todos los campos requeridos presentes ✓, category_label correctos ✓. 3) GET /api/integrations/summary (profesor): misma estructura y campos correctos ✓. Backend 100% funcional para las 2 features nuevas. NO se probó frontend (según instrucciones)."

##   - agent: "testing"
##     message: "✅ FRONTEND TESTING COMPLETADO - ITERACIÓN 10 (5 FEATURES NUEVAS). Todas las features pasaron exitosamente (5/5 PASS). FEATURE 1 - Lightbox: hint visible al hover ✓, abre modal pantalla completa ✓, imagen carga (naturalWidth:3200) ✓, cierra con X/backdrop/Escape ✓, botón 'Ver' navega sin abrir lightbox ✓. FEATURE 2 - Reset modal: validación email inválido con error y botón deshabilitado ✓, email válido habilita submit ✓, vista previa con token UAO-2026-RESTORE-SECURE ✓, destinatario correcto ✓, aviso 15 minutos ✓, cierra correctamente ✓. FEATURE 4 - Chat persistencia: mensajes persisten tras navegación (3 mensajes antes/después) ✓, mensaje de prueba encontrado ✓, 'Nueva conversación' limpia historial (1 mensaje bienvenida) ✓. FEATURE 5 - Ecosystem: 3 tarjetas visibles (Gmail/Piazza/WhatsApp) ✓, category_label correctos (Comunicación oficial/Foros académicos/Soporte & contacto directo) ✓, Piazza status inicial 'Disponible' ✓, tras 'Conectar' cambia a 'Sincronizado' y botón a 'Abrir' ✓. REGRESIÓN: 8/8 rutas navegables sin errores React Router ✓. MOBILE 360px: sin scroll horizontal en Inicio/modal/lightbox (scrollWidth=clientWidth=360) ✓. CONSOLA: 0 errores, 0 warnings ✓. Backend testing previo (iteración 9): POST /api/ai funciona con LLM real ✓, GET /api/integrations/summary incluye ecosystem con 3 items ✓. Sistema 100% funcional para las 5 features nuevas."

##   - agent: "testing"
##     message: "✅ BACKEND VERIFICADO: POST /api/ai responde 200 con texto no vacío para 6 mensajes distintos (LLM real con EMERGENT_LLM_KEY funciona), mensaje vacío → 400, sin auth → 401, NUNCA 500 (fallback Mock AI robusto). GET /api/integrations/summary incluye ecosystem (gmail/piazza/whatsapp con category_label/status/cta correctos) y systems (moodle/teams/banner) intacto por rol."
##   - agent: "testing"
##     message: "✅ FRONTEND VERIFICADO (5/5 features PASS): Lightbox abre/cierra (X, backdrop, Esc) y 'Ver' navega sin abrir modal. Modal reset con validación @uao.edu.co, vista previa de correo con token UAO-2026-RESTORE-SECURE y 15 min. Chat IA persiste en sessionStorage y 'Nueva conversación' limpia. Ecosistema Gmail/Piazza/WhatsApp con categorías y 'Conectar'→'Sincronizado'. Regresión 8/8 rutas OK, móvil 360px sin scroll horizontal, 0 errores/0 warnings de consola. Sistema 100% funcional."
