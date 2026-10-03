# 04 · Requerimientos del sistema

## 1. Convenciones

| Prefijo | Significado |
|---|---|
| RF-E | Requerimiento funcional · perfil **Estudiante** (usuario principal) |
| RF-M | Requerimiento funcional · perfil **Monitor** |
| RF-P | Requerimiento funcional · perfil **Profesor** |
| RNF | Requerimiento no funcional (calidad, usabilidad, seguridad, integración) |

Prioridad: **Alta** (núcleo del prototipo) · **Media** (segunda iteración) · **Baja** (deseable).
Necesidad: trazabilidad con la priorización de la indagación (N1–N7).

| ID | Necesidad | Dato de soporte |
|---|---|---|
| N1 | Coordinar y organizar el grupo | 67,3 % horarios · 50 % orden |
| N2 | Localizar información específica | 44,2 % · 30,8 % revisa demasiados medios |
| N3 | Resolver dudas asincrónicamente | 46,2 % horarios · 34,6 % respuesta lenta |
| N4 | Saber a quién acudir | 25 % + confirmación docente |
| N5 | Preguntar sin exposición | 40,4 % · 23,1 % pena |
| N6 | Acceder a recursos confiables | 32,7 % · 28,8 % |
| N7 | Conectar con pares afines | 55,2 % neutral (baja) |

> Los requerimientos marcados con **(nuevo)** no existían en el Avance 1 y se incorporan para cerrar los vacíos de numeración detectados (RF-E09, RF-E11, RF-P02, RNF-06 a RNF-12, RNF-14, RNF-15), manteniendo coherencia con la propuesta de valor del Hub.

## 2. Requerimientos funcionales · Estudiante (RF-E)

| ID | Descripción | Prioridad | Necesidad | Evidencia en el prototipo |
|---|---|---|---|---|
| RF-E01 | El estudiante podrá registrar su disponibilidad semanal y visualizar los **horarios comunes** del grupo para acordar reuniones. | Alta | N1 | Asesorías › agenda / Mi grupo (próxima iteración) |
| RF-E02 | El estudiante podrá crear un **espacio de grupo** por asignatura con archivos, acuerdos y enlaces compartidos. | Alta | N1 | Asignaturas › recursos y chat por asignatura |
| RF-E03 | El estudiante podrá realizar una **búsqueda global** por asignatura, duda, persona o recurso desde cualquier pantalla. | Alta | N2 | Barra de búsqueda del encabezado → `/buscar` |
| RF-E04 | El estudiante podrá publicar una **duda asíncrona** asociada a una asignatura, con estado visible (abierta / resuelta). | Alta | N3 | Módulo Dudas |
| RF-E05 | El estudiante podrá publicar una duda de forma **anónima** para el resto de estudiantes. | Media-Alta | N5 | Casilla "Publicar como anónimo" |
| RF-E06 | El estudiante podrá consultar la **ruta de apoyo** de cada asignatura: docente, monitor, horarios de asesoría y recursos validados. | Alta | N4 | Detalle de asignatura + Asesorías |
| RF-E07 | Antes de publicar, el sistema mostrará **dudas similares** ya resueltas para evitar duplicados. | Media | N2 | Filtros y búsqueda en Dudas |
| RF-E08 | El estudiante recibirá **notificaciones** cuando su duda sea respondida, aceptada o cuando cambie el estado de una reserva. | Alta | N3 | Campana de notificaciones |
| **RF-E09 (nuevo)** | El estudiante visualizará en el Inicio un **tablero unificado** con el estado de Moodle (calificaciones nuevas, entregas próximas), Teams (mensajes no leídos, reuniones) y Banner (promedio acumulado, estado de matrícula), con acceso directo a cada sistema mediante su sesión institucional. | Alta | N2 · N4 | Widgets de integración en `/inicio` (`GET /api/integrations/summary`) |
| RF-E10 | El estudiante podrá **asignar tareas y responsabilidades** a integrantes del grupo y ver su avance. | Media | N1 | Tareas por asignatura (entregas) |
| **RF-E11 (nuevo)** | El estudiante podrá **reservar un cupo** en las asesorías publicadas por docentes y monitores, ver el estado de la reserva (pendiente, aceptada, rechazada) y cancelarla. | Alta | N3 · N4 | Asesorías › "Solicitar cupo" |
| RF-E12 | El estudiante podrá acceder a **recursos validados** (videos, guías, ejercicios) por asignatura, identificando al autor y su rol. | Media | N6 | Asignaturas › Recursos |

## 3. Requerimientos funcionales · Monitor (RF-M)

| ID | Descripción | Prioridad | Necesidad | Evidencia en el prototipo |
|---|---|---|---|---|
| RF-M01 | El monitor aparecerá identificado por **asignatura o área de conocimiento** en la ruta de apoyo, con su disponibilidad. | Alta | N4 | Perfil con rol + agenda de asesorías |
| RF-M02 | El monitor podrá **responder dudas** dentro de las asignaturas que acompaña y compartir recursos en espacios autorizados. | Alta | N3 · N6 | Dudas › responder; Recursos |
| RF-M03 | El monitor podrá **definir cupos y límites** de atención en cada asesoría y aceptar o rechazar solicitudes. | Media | N4 | Asesorías › bandeja de solicitudes |

## 4. Requerimientos funcionales · Profesor (RF-P)

| ID | Descripción | Prioridad | Necesidad | Evidencia en el prototipo |
|---|---|---|---|---|
| RF-P01 | El profesor podrá **responder dudas** con el contexto de la asignatura y marcar la respuesta aceptada. | Alta | N3 | Dudas › respuesta aceptada |
| **RF-P02 (nuevo)** | El profesor podrá **publicar y gestionar su agenda de asesorías** (día, hora, modalidad, lugar o enlace, cupos) y activar o pausar cada franja, de modo que los estudiantes solo vean disponibilidad real. | Alta | N4 · N3 | Asesorías › "Gestionar" (crear, editar, activar/desactivar, eliminar) |
| RF-P03 | El profesor podrá **publicar y curar recursos** confiables por asignatura. | Media | N6 | Asignaturas › Recursos |
| RF-P04 | El profesor aparecerá en la **ruta de apoyo** de sus asignaturas con horario de atención visible. | Alta | N4 | Detalle de asignatura |
| RF-P05 | El profesor podrá **revisar entregas** y registrar retroalimentación y calificación. | Media | N1 | `/revisiones` |

## 5. Requerimientos no funcionales (RNF)

| ID | Categoría | Descripción | Prioridad | Necesidad / Principio | Verificación |
|---|---|---|---|---|---|
| RNF-01 | Plataforma | La solución será una **aplicación web responsive** con prioridad móvil, sin instalación. | Alta | Insight 6 (se adopta lo cómodo) | Funciona en Chrome, Edge, Safari móvil |
| RNF-02 | Rendimiento | Las acciones principales (abrir una duda, reservar, buscar) responderán en **menos de 2 s** en condiciones normales. | Alta | N3 | Medición con DevTools / Lighthouse |
| RNF-03 | Responsive | La interfaz se adaptará desde **360 px** de ancho sin desbordes en la barra de navegación ni en las tarjetas del Inicio. | Alta | Insight 6 | Inspección en modo móvil (iPhone SE / Galaxy S8) |
| RNF-04 | Identidad | El acceso requerirá **cuenta institucional** `@uao.edu.co`; el rol docente se asignará automáticamente contra el directorio de la Facultad. | Alta | N4 · Viabilidad | Login rechaza otros dominios; lista blanca docente |
| RNF-05 | Accesibilidad | El texto cumplirá **WCAG 2.1 AA**: contraste ≥ 4,5:1 (texto blanco o gris muy claro sobre `#A81B1E` y `#1E293B`). | Alta | Inclusión / ODS 4 | Verificador de contraste (#A81B1E/blanco = 7,4:1) |
| **RNF-06 (nuevo)** | Consistencia | La interfaz aplicará el **Manual de Identidad UAO 2026**: paleta institucional, tipografía sans-serif (DM Sans / Inter), logo con área de protección y tamaño mínimo de 50 px. | Alta | Heurística 4 (consistencia y estándares) | Revisión visual contra el manual |
| **RNF-07 (nuevo)** | Retroalimentación | Toda acción mostrará **estado visible** (cargando, éxito, error, "sincronizando con Moodle/Teams/Banner") en menos de 1 s, y los botones tendrán estados hover, focus y disabled diferenciados. | Alta | Heurística 1 (visibilidad del estado) | Inspección de estados en Login e Inicio |
| **RNF-08 (nuevo)** | Prevención de errores | Los formularios validarán **en línea** (dominio del correo, campos obligatorios) y las acciones destructivas o irreversibles (cerrar sesión, eliminar, rechazar) pedirán **confirmación**. | Alta | Heurística 5 (prevención de errores) | Mensajes de campo; diálogo de cierre de sesión |
| **RNF-09 (nuevo)** | Accesibilidad operable | La aplicación será **operable por teclado**, con foco visible, etiquetas ARIA, enlace "saltar al contenido" y preferencias de accesibilidad (contraste, tamaño, movimiento) guardadas por usuario. | Media | Inclusión | Navegación con Tab; panel Configuración › Accesibilidad |
| **RNF-10 (nuevo)** | Integración | El Hub se conectará a los sistemas institucionales (Moodle, Teams, Banner) mediante **SSO** como **capa de lectura**: no duplicará ni modificará datos de origen y enlazará al sistema fuente para cualquier acción. | Alta | Propuesta de valor (anti-fragmentación) | Widgets con "Abrir en Moodle/Teams/Banner"; en el prototipo la fuente es simulada (mock) |
| **RNF-11 (nuevo)** | Seguridad | Las contraseñas se almacenarán con **hash bcrypt**, las sesiones usarán **JWT con expiración** y toda comunicación irá por **HTTPS**; los archivos privados exigirán autenticación. | Alta | Confianza institucional | Revisión de código / pruebas automatizadas |
| **RNF-12 (nuevo)** | Disponibilidad | El servicio estará disponible ≥ 99 % en horario académico; ante arranque en frío del servidor la interfaz mostrará el aviso **"Conectando con los sistemas UAO…"** en lugar de un error. | Media | Heurística 1 | Indicador de estado del servidor en Login |
| RNF-13 | Anonimato | La identidad del autor de una duda anónima **no se expondrá** a otros estudiantes; solo el sistema la conservará para moderación. | Alta | N5 | Vista de duda anónima |
| **RNF-14 (nuevo)** | Rendimiento percibido | La carga inicial no superará **3 s en red 4G**; se usarán estados de carga explícitos y carga progresiva de los widgets de integración. | Media | Insight 6 | Lighthouse móvil ≥ 80 en rendimiento |
| **RNF-15 (nuevo)** | Mantenibilidad | El código seguirá una **arquitectura modular** (páginas, componentes, servicios, routers) con documentación en `/docs` y pruebas automatizadas de los flujos críticos (autenticación, integración, asesorías). | Media | Calidad | Estructura del repositorio; carpeta `backend/tests` |
| RNF-16 | Curaduría | Los recursos mostrarán **autor y rol verificado** (docente o monitor) y fecha de publicación para que el estudiante pueda confiar en ellos. | Media | N6 | Lista de recursos por asignatura |

## 6. Matriz de trazabilidad Necesidad → Requerimientos

| Necesidad | Requerimientos funcionales | Requerimientos no funcionales |
|---|---|---|
| N1 Coordinar y organizar el grupo | RF-E01, RF-E02, RF-E10, RF-P05 | RNF-02 |
| N2 Localizar información específica | RF-E03, RF-E07, **RF-E09** | **RNF-10**, **RNF-14** |
| N3 Resolver dudas asincrónicamente | RF-E04, RF-E08, **RF-E11**, RF-M02, RF-P01, **RF-P02** | RNF-02, **RNF-07** |
| N4 Saber a quién acudir | RF-E06, **RF-E09**, **RF-E11**, RF-M01, RF-M03, **RF-P02**, RF-P04 | RNF-04, **RNF-12** |
| N5 Preguntar sin exposición | RF-E05 | RNF-13 |
| N6 Acceder a recursos confiables | RF-E12, RF-M02, RF-P03 | RNF-16 |
| Transversal (usabilidad e identidad) | — | RNF-01, RNF-03, RNF-05, **RNF-06**, **RNF-08**, **RNF-09**, **RNF-11**, **RNF-15** |

**Descartado por falta de evidencia:** repositorio general abierto, foros públicos sin asignatura, red social estudiantil y gamificación.
