/* Datos documentales del producto. Las pantallas se abren en la app actual. */

export const PALETTE = [
  { hex: "#FF051E", name: "Rojo principal UAO", use: "Logotipo y acentos gráficos; se limita en texto pequeño por contraste", contrast: "3,97 : 1 con blanco · solo texto grande" },
  { hex: "#AC0B32", name: "Rojo secundario accesible", use: "Acciones, estados activos y texto interactivo", contrast: "7,37 : 1 con blanco · AAA" },
  { hex: "#FBF5EC", name: "Crema UAO", use: "Fondo cálido y superficies de énfasis", contrast: "Texto #1E293B 13,50 : 1" },
  { hex: "#1E293B", name: "Neutro de interfaz", use: "Textos, paneles oscuros y contraste", contrast: "14,63 : 1 con blanco · AAA" },
  { hex: "#FF836C", name: "Coral secundario UAO", use: "Acentos sobre fondos oscuros", contrast: "6,07 : 1 sobre #1E293B · AA" },
  { hex: "#FFFFFF", name: "Blanco", use: "Tarjetas y contenedores del logotipo", contrast: "—" },
];

export const HIGHLIGHTED = [
  {
    key: "affordance",
    title: "Affordance",
    source: "Norman · Nielsen H4/H6",
    text: "Las acciones se reconocen por su forma, etiqueta y estado: botones para tareas principales, enlaces para navegación y controles con estado visible.",
    where: "Acceso al Hub, navegación de asignaturas, selector Calendario/Lista y controles de perfil.",
  },
  {
    key: "consistency",
    title: "Consistencia y estándares",
    source: "Nielsen H4 · Sistema visual UAO Conecta",
    text: "La interfaz mantiene los colores, la tipografía y los controles de UAO Conecta de una pantalla a otra, con nombres reconocibles para cada herramienta institucional.",
    where: "Encabezado, navegación, botones, tarjetas de sistema y estados de selección.",
  },
  {
    key: "prevention",
    title: "Prevención de errores",
    source: "Nielsen H5",
    text: "Los formularios indican los datos requeridos y muestran los errores junto al campo o a la acción que los originó. La contraseña de UAO Conecta se distingue de las claves de servicios externos.",
    where: "Acceso, recuperación, perfil y solicitud de asesoría.",
  },
];

export const HEURISTICS = [
  { n: 1, title: "Visibilidad del estado del sistema", apply: "La interfaz muestra estados de carga, disponibilidad, envío y error en las funciones que requieren una respuesta." },
  { n: 2, title: "Correspondencia con el mundo real", apply: "Lenguaje académico (asignatura, semestre, asesoría, cupo); los sistemas externos se nombran como los conoce el estudiante." },
  { n: 3, title: "Control y libertad del usuario", apply: "La navegación permite volver, cerrar diálogos, cancelar formularios y cambiar entre vistas disponibles." },
  { n: 4, title: "Consistencia y estándares", apply: "La paleta, tipografía, navegación y etiquetas se mantienen consistentes entre secciones." },
  { n: 5, title: "Prevención de errores", apply: "Los formularios validan campos obligatorios y muestran confirmación antes de completar acciones sensibles." },
  { n: 6, title: "Reconocer antes que recordar", apply: "Navegación con ícono + texto siempre visible, rol y programa en la barra lateral, tarjetas etiquetadas por sistema." },
  { n: 7, title: "Flexibilidad y eficiencia", apply: "La búsqueda global, los accesos directos y los filtros ayudan a llegar rápido a la información." },
  { n: 8, title: "Diseño estético y minimalista", apply: "La jerarquía tipográfica, el espacio entre bloques y las tarjetas facilitan el escaneo de cada pantalla." },
  { n: 9, title: "Reconocer y recuperarse de errores", apply: "Los mensajes indican qué ocurrió y qué puede hacer la persona para continuar o corregir la entrada." },
  { n: 10, title: "Ayuda y documentación", apply: "El tutorial, las rutas directas a funciones y la documentación académica ofrecen orientación contextual." },
];

export const NEEDS = [
  { id: "N1", need: "Coordinar y organizar el grupo", data: "67,3 % horarios · 50 % orden", reqs: ["RF-E01", "RF-E02", "RF-E10", "RF-P05"], route: "/chat", label: "Abrir Chat" },
  { id: "N2", need: "Localizar información específica", data: "44,2 % · 30,8 % revisa demasiados medios", reqs: ["RF-E03", "RF-E07", "RF-E09", "RNF-10"], route: "/inicio", label: "Abrir Inicio" },
  { id: "N3", need: "Resolver dudas asincrónicamente", data: "46,2 % horarios · 34,6 % respuesta lenta", reqs: ["RF-E04", "RF-E08", "RF-E11", "RF-P01", "RF-P02"], route: "/dudas", label: "Abrir Dudas" },
  { id: "N4", need: "Saber a quién acudir", data: "25 % + confirmación docente", reqs: ["RF-E06", "RF-E09", "RF-E11", "RF-M01", "RF-P04"], route: "/asesorias", label: "Abrir Asesorías" },
  { id: "N5", need: "Preguntar sin exposición", data: "40,4 % · 23,1 % pena", reqs: ["RF-E05", "RNF-13"], route: "/dudas", label: "Publicar una duda" },
  { id: "N6", need: "Acceder a recursos confiables", data: "32,7 % · 28,8 %", reqs: ["RF-E12", "RF-P03", "RNF-16"], route: "/asignaturas?vista=catalogo", label: "Abrir catálogo UAO" },
  { id: "T", need: "Identidad y usabilidad (transversal)", data: "Contraste, tamaño de texto y controles accesibles", reqs: ["RNF-04", "RNF-05", "RNF-06", "RNF-07", "RNF-08"], route: "/configuracion", label: "Abrir Configuración" },
];
