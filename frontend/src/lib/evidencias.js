import { asset } from "@/lib/assets";

/* Datos del módulo Evidencias DCU (curso HCI · Prof. Paola Castillo). */

export const FLOW = [
  { id: "login", title: "Acceso institucional", caption: "Login con filtro @uao.edu.co, verificación contra el directorio docente y estado del servidor visible.", img: asset("evidencias/01-login.png"), route: null },
  { id: "verificacion", title: "Verificación de identidad", caption: "Retroalimentación inmediata: 'Docente verificado' o 'Estudiante UAO' antes de enviar el formulario.", img: asset("evidencias/02-verificacion.png"), route: null },
  { id: "inicio", title: "Inicio · Capa de integración", caption: "Moodle, Teams y Banner en un solo tablero con acción directa 'Abrir en…'. Cero fragmentación.", img: asset("evidencias/03-inicio.png"), route: "/inicio" },
  { id: "asesorias", title: "Ruta de apoyo", caption: "Asesorías de docentes y monitores con horario, modalidad y cupos reservables.", img: asset("evidencias/04-asesorias.png"), route: "/asesorias" },
  { id: "dudas", title: "Dudas asíncronas", caption: "Preguntar sin exposición: dudas por asignatura con opción de anonimato y estado visible.", img: asset("evidencias/05-dudas.png"), route: "/dudas" },
  { id: "movil", title: "Prioridad móvil (360 px)", caption: "Navegación inferior y tarjetas sin desbordes en pantallas pequeñas (RNF-03).", img: asset("evidencias/06-movil.png"), route: "/inicio" },
];

export const PALETTE = [
  { hex: "#A81B1E", name: "Rojo institucional (primario)", use: "Acciones principales, estados activos, acentos", contrast: "7,4 : 1 con blanco · AAA" },
  { hex: "#1E293B", name: "Azul oscuro (secundario)", use: "Textos, paneles oscuros, Banner", contrast: "14,6 : 1 con blanco · AAA" },
  { hex: "#FF836C", name: "Coral (acento del manual)", use: "Acentos sobre fondos oscuros", contrast: "6,0 : 1 sobre #1E293B · AA" },
  { hex: "#F8FAFC", name: "Fondo neutro", use: "Lienzo general", contrast: "Texto #1E293B 13,9 : 1" },
  { hex: "#FFFFFF", name: "Blanco", use: "Tarjetas, contenedores del logo", contrast: "—" },
];

export const HIGHLIGHTED = [
  {
    key: "affordance",
    title: "Affordance",
    source: "Norman · Nielsen H4/H6",
    text: "Los elementos accionables se ven accionables: botones primarios sólidos en rojo con sombra y elevación al pasar el cursor, enlaces subrayados al hover, toggles con forma de interruptor y tarjetas con cursor de mano. Nada que parezca botón deja de serlo.",
    where: "Botón 'Ingresar al Hub', CTA 'Abrir Moodle', toggle 'Modo Monitor', tarjetas de asignatura.",
  },
  {
    key: "consistency",
    title: "Consistencia y estándares",
    source: "Nielsen H4 · Manual UAO 2026",
    text: "Una sola paleta (#A81B1E / #1E293B), una sola familia tipográfica (DM Sans), un solo estilo de botón primario y de tarjeta en todas las vistas. Los sistemas externos conservan su nombre real (Moodle, Teams, Banner) para respetar el modelo mental del estudiante.",
    where: "Sistema de diseño global, encabezado con logo UAO, navegación lateral persistente.",
  },
  {
    key: "prevention",
    title: "Prevención de errores",
    source: "Nielsen H5",
    text: "Validación en línea del dominio @uao.edu.co antes de enviar, botón deshabilitado cuando el correo es rechazado, rol asignado automáticamente (no se puede elegir mal), confirmación antes de cerrar sesión y mensajes de error junto al campo que los produce.",
    where: "Login y registro, diálogo de cierre de sesión, formularios de asesoría.",
  },
];

export const HEURISTICS = [
  { n: 1, title: "Visibilidad del estado del sistema", apply: "Overlay 'Conectando con los sistemas UAO' paso a paso, chip de estado del servidor, 'Sincronizado hace 1 min' en cada widget, estados de carga esqueléticos." },
  { n: 2, title: "Correspondencia con el mundo real", apply: "Lenguaje académico (asignatura, semestre, asesoría, cupo); los sistemas externos se nombran como los conoce el estudiante." },
  { n: 3, title: "Control y libertad del usuario", apply: "Modo Monitor reversible, cancelar reserva, cerrar diálogos con Esc, alternar entre 'Crear una cuenta' y 'Ya tengo cuenta'." },
  { n: 4, title: "Consistencia y estándares", apply: "Manual de Identidad UAO 2026 aplicado globalmente; mismos componentes en todas las vistas." },
  { n: 5, title: "Prevención de errores", apply: "Filtro de dominio, rol automático, confirmación de acciones irreversibles, botones deshabilitados durante el envío." },
  { n: 6, title: "Reconocer antes que recordar", apply: "Navegación con ícono + texto siempre visible, rol y programa en la barra lateral, tarjetas etiquetadas por sistema." },
  { n: 7, title: "Flexibilidad y eficiencia", apply: "Búsqueda global en el encabezado, accesos directos 'Abrir en Moodle/Teams/Banner', flechas del teclado en el carrusel." },
  { n: 8, title: "Diseño estético y minimalista", apply: "Alineación a la izquierda (manual), jerarquía tipográfica clara, tres widgets de integración y amplio espacio en blanco." },
  { n: 9, title: "Reconocer y recuperarse de errores", apply: "Mensajes en lenguaje claro junto al campo ('Solo se permiten correos institucionales @uao.edu.co'), botón 'Reintentar' en la capa de integración." },
  { n: 10, title: "Ayuda y documentación", apply: "Este módulo de evidencias, la carpeta /docs y las notas de ayuda bajo los formularios." },
];

export const NEEDS = [
  { id: "N1", need: "Coordinar y organizar el grupo", data: "67,3 % horarios · 50 % orden", reqs: ["RF-E01", "RF-E02", "RF-E10", "RF-P05"], img: asset("evidencias/04-asesorias.png"), route: "/asignaturas", label: "Asignaturas y tareas" },
  { id: "N2", need: "Localizar información específica", data: "44,2 % · 30,8 % revisa demasiados medios", reqs: ["RF-E03", "RF-E07", "RF-E09", "RNF-10"], img: asset("evidencias/03-inicio.png"), route: "/inicio", label: "Inicio · widgets Moodle / Teams / Banner" },
  { id: "N3", need: "Resolver dudas asincrónicamente", data: "46,2 % horarios · 34,6 % respuesta lenta", reqs: ["RF-E04", "RF-E08", "RF-E11", "RF-P01", "RF-P02"], img: asset("evidencias/05-dudas.png"), route: "/dudas", label: "Dudas por asignatura" },
  { id: "N4", need: "Saber a quién acudir", data: "25 % + confirmación docente", reqs: ["RF-E06", "RF-E09", "RF-E11", "RF-M01", "RF-P04"], img: asset("evidencias/04-asesorias.png"), route: "/asesorias", label: "Asesorías · ruta de apoyo" },
  { id: "N5", need: "Preguntar sin exposición", data: "40,4 % · 23,1 % pena", reqs: ["RF-E05", "RNF-13"], img: asset("evidencias/05-dudas.png"), route: "/dudas", label: "Duda anónima" },
  { id: "N6", need: "Acceder a recursos confiables", data: "32,7 % · 28,8 %", reqs: ["RF-E12", "RF-P03", "RNF-16"], img: asset("evidencias/04-asesorias.png"), route: "/asignaturas", label: "Recursos validados" },
  { id: "T", need: "Identidad y usabilidad (transversal)", data: "Manual UAO 2026 · WCAG 2.1 AA", reqs: ["RNF-04", "RNF-05", "RNF-06", "RNF-07", "RNF-08"], img: asset("evidencias/01-login.png"), route: null, label: "Acceso institucional" },
];
