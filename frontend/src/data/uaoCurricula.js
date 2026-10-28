const courses = (items, kind = "core") =>
  items.split("|").map((name) => ({ name: name.trim(), kind }));

const electives = (items) => courses(items, "elective");
const electiveOptions = (items) => courses(items, "elective-option");

// Transcripción de nombres que aparecen en planes y listados publicados por la UAO.
// La oferta real de electivas puede cambiar por periodo; consulta siempre el enlace oficial.
export const UAO_CURRICULA = [
  {
    program: "Ingeniería Informática",
    plan: "Pénsum publicado en 2025 · resolución 2024",
    source: "https://www.uao.edu.co/wp-content/uploads/2025/02/PLAN-DE-ESTUDIO-ING-INFORMATICA.pdf",
    courses: courses("Matemáticas fundamentales|Fundamentos de ingeniería informática|Introducción a la ingeniería|Desarrollo personal|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Cálculo 1|Cálculo 2|Álgebra lineal|Diseño conceptual|Algoritmia y programación|Programación orientada a objetos|Matemática discreta|Física 1|Física 2|Base de datos 1|Base de datos 2|Estructura de datos y algoritmos 1|Estructura de datos y algoritmos 2|Actividad complementaria|Formación ciudadana 1: Identidades y pluralismo|Formación ciudadana 2: Sociedad y Estado|Formación ciudadana 3: Paz y convivencia|Probabilidad y estadística|Pensamiento sistémico|Investigación de operaciones|Arquitectura de computadores|Ingeniería de software 1|Ingeniería de software 2|Redes de datos|Sistemas operativos|Ambiente y desarrollo sostenible|Proyecto informático|Proyecto informático 2|Administración para ingenieros|Formulación y evaluación de proyectos|Gestión de la innovación|Servicios telemáticos|Sistemas informáticos|Seguridad informática|Gestión de TI|Informática forense|Auditoría de sistemas|Seminario de ingeniería informática|Trabajo de grado"),
    electives: electives("Electiva de lectura y escritura|Electiva en ciencias sociales|Electiva profesional 1|Electiva profesional 2|Electiva profesional 3"),
  },
  {
    program: "Ingeniería de Datos e Inteligencia Artificial",
    plan: "Plan 2022 · publicado nuevamente en 2026",
    source: "https://www.uao.edu.co/wp-content/uploads/2026/07/PLAN-DE-ESTUDIO-ING-DATOS-2022.pdf",
    courses: courses("Matemáticas fundamentales|Lógica y matemática discreta|Álgebra lineal|Cálculo 1|Cálculo 2|Estadística y probabilidad 1|Estadística y probabilidad 2|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Formación ciudadana 1|Formación ciudadana 2|Formación ciudadana 3|Ingeniería y sostenibilidad|Sistemas operativos|Seguridad de la información|Inteligencia artificial|Analítica de datos|Almacenamiento de datos|Redes e infraestructura|Programación|Introducción a la ingeniería de datos|ETL: extracción, transformación y carga|Seminario de Ingeniería de Datos e Inteligencia Artificial|Innovación y emprendimiento|Administración para ingenieros|Legislación y ética en el manejo de datos"),
    electives: electives("Electiva libre 1|Electiva de ciencias sociales|Electiva de lectura y escritura|Electiva profesional 1|Electiva profesional 2|Electiva profesional 3|Electiva profesional 4|Electiva profesional 5"),
  },
  {
    program: "Ingeniería Industrial",
    plan: "Plan publicado en 2025",
    source: "https://www.uao.edu.co/wp-content/uploads/2025/01/PLAN-DE-ESTUDIO-ING-INDUSTRIAL-2025.pdf",
    electivesSource: "https://www.uao.edu.co/wp-content/uploads/2025/01/ELECTIVAS-ING-INDUSTRIAL-2022.pdf",
    electivesYear: "Listado de electivas publicado en 2022",
    courses: courses("Matemáticas fundamentales|Fundamentos de Ingeniería Industrial|Introducción a la ingeniería|Desarrollo personal|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Cálculo 1|Cálculo 2|Álgebra lineal|Diseño conceptual|Algoritmia y programación|Estadística 1|Estadística 2|Ecuaciones diferenciales|Química|Física 1|Física 2|Pensamiento sistémico|Economía empresarial|Estudio del trabajo|Sistemas de producción e inventarios|Sistemas de costos|Procesos y materiales|Planeación y control de la producción|Investigación de operaciones 1|Investigación de operaciones 2|Gestión de seguridad y salud en el trabajo|Logística|Procesos industriales|Control estadístico de calidad|Diseño de instalaciones|Simulación|Ingeniería económica y financiera|Gestión avanzada de la producción|Ambiente y desarrollo sostenible|Gestión de la innovación|Gerencia de proyectos|Proyecto integrador de Ingeniería Industrial|Seminario de Ingeniería Industrial|Trabajo de grado"),
    electives: electives("Electiva en ciencias sociales|Electiva de lectura y escritura|Electiva profesional 1|Electiva profesional 2"),
    electiveOptions: electiveOptions("Habilidades gerenciales|Direccionamiento estratégico|Ideas y oportunidades de negocios|Plan de empresa|Calidad Lean Six Sigma|Gestión de la calidad|Ergonomía|Metodologías ágiles para proyectos: Scrum y Kanban|Introducción a la ciencia de datos|Cátedra FabLab|Fundamentos de energías renovables|Diseño responsable|Marketing|Elementos de seguridad para el diseño|Megatendencias de sostenibilidad empresarial|Antropología social y cultural|Política y negocios internacionales|Dibujo asistido por computador para ingeniería|Dinámica de sistemas|Fundamentos y aplicaciones de inteligencia artificial|Medio ambiente y ciudad|Comunicación para el emprendimiento social|High Intermediate English 1|High Intermediate English 2|Advanced English 1|Advanced English 2|Mercado de capitales"),
  },
  {
    program: "Ingeniería Mecatrónica",
    plan: "Plan MK06, reforma 2021",
    source: "https://www.uao.edu.co/wp-content/uploads/2022/07/MK06_JUNIO-9-202.pdf",
    electivesSource: "https://www.uao.edu.co/wp-content/uploads/2023/06/Resumenes-Electivas-DAE-2023-02.pdf",
    electivesYear: "Resumen de electivas ofertadas en 2023-02",
    courses: courses("Matemáticas fundamentales|Fundamentos de Ingeniería Mecatrónica|Introducción a la ingeniería|Desarrollo personal|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Cálculo 1|Cálculo 2|Álgebra lineal|Diseño conceptual|Algoritmia y programación|Programación orientada a objetos|Dibujo asistido por computador|Física 1|Física 2|Señales y sistemas|Circuitos eléctricos 1|Sistemas dinámicos|Control 1|Electrónica|Microprocesadores|Robótica|Mecánica|Termodinámica|Proyecto integrador|Seminario de Ingeniería Mecatrónica|Trabajo de grado"),
    electives: electives("Electiva básica|Electiva libre|Electiva profesional|Electiva profesional virtual|Electiva de lectura y escritura|Electiva socio humanística"),
    electiveOptions: electiveOptions("Inteligencia artificial en dispositivos móviles y embebidos|Autómatas programables|Metrología|Redes neuronales artificiales y Deep Learning|Desarrollo de aplicaciones telemáticas|Percepción robótica|Fundamentos de Internet de las cosas (IoT)|Diseño industrial para ingenieros"),
  },
  {
    program: "Ingeniería Multimedia",
    plan: "Plan publicado en 2021",
    source: "https://www.uao.edu.co/wp-content/uploads/2025/01/PLAN-DE-ESTUDIO-ING-MULTIMEDIA-2021.pdf",
    electivesSource: "https://www.uao.edu.co/wp-content/uploads/2025/01/ELECTIVAS-ING-MULTIMEDIA-2022.pdf",
    electivesYear: "Listado de electivas publicado en 2022",
    courses: courses("Matemáticas fundamentales|Introducción a la ingeniería|Fundamentos de Ingeniería Multimedia|Desarrollo personal|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Cálculo 1|Cálculo 2|Álgebra lineal|Diseño conceptual|Algoritmia y programación|Programación orientada a objetos|Física 1|Física 2|Probabilidad y estadística|Actividad complementaria|Computación gráfica|Seminario taller multimedia|Taller de audio y video digital|Base de datos multimedia|Modelado y animación por computador|Arquitectura de sistemas multimedia|Procesamiento de señales y audio|Fundamentos de realidad virtual|Interacción humano-computador|Desarrollo de experiencias multimedia web|Videojuegos|Diseño multimedia 1|Diseño multimedia 2|Computación física|Redes y servicios multimedia|Sistemas multimedia audiovisuales|Gestión de sistemas y tecnologías multimedia|Trabajo de grado"),
    electives: electives("Electiva profesional 1|Electiva profesional 2|Electiva profesional 3|Electiva socio humanística|Electiva de lectura y escritura"),
    electiveOptions: electiveOptions("Desarrollo de software para plataformas móviles|Aplicaciones para ciudades inteligentes|Big data|Computación en la nube|Futuros posibles|Ingeniería de software 1|Diseño, tecnología y sociedad|Diseño industrial para ingeniería|Percepción robótica|Introducción a la computación evolutiva y sus aplicaciones|Motion graphics|Diseño transmedia virtual|Economía ambiental para ingenieros|Redes neuronales artificiales y Deep Learning|Inteligencia artificial en dispositivos móviles y embebidos|Introducción a la ciencia de datos"),
  },
  {
    program: "Ingeniería Mecánica",
    plan: "Plan publicado en 2025",
    source: "https://www.uao.edu.co/wp-content/uploads/2025/01/PLAN-DE-ESTUDIO-ING-MECANICA-2025.pdf",
    courses: courses("Matemáticas fundamentales|Fundamentos de Ingeniería Mecánica|Introducción a la ingeniería|Desarrollo personal|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Cálculo 1|Cálculo 2|Álgebra lineal|Diseño conceptual|Algoritmia y programación|Dibujo de ingeniería|Física 1|Física 2|Mecánica 1|Mecánica 2|Química de materiales y combustibles|Estructura y propiedades de materiales|Resistencia de materiales 1|Resistencia de materiales 2|Mecánica de fluidos|Procesos de manufactura|Termodinámica|Transferencia de calor|Máquinas hidráulicas|Diseño mecánico|Sistemas dinámicos|Fundamentos de electricidad y electrónica|Máquinas térmicas|Control y automatización|Diseño aplicado en Ingeniería Mecánica|Formulación y evaluación de proyectos|Ambiente y desarrollo sostenible|Gestión de la innovación|Administración para ingenieros|Seminario de Ingeniería Mecánica|Trabajo de grado"),
    electives: electives("Electiva profesional 1|Electiva profesional 2|Electiva profesional virtual|Electiva de ciencias sociales|Electiva de lectura y escritura"),
  },
  {
    program: "Ingeniería Eléctrica",
    plan: "Pénsum 2021",
    source: "https://www.uao.edu.co/wp-content/uploads/2022/05/Plan-de-estudio-Ingenieri%CC%81a-Ele%CC%81ctrica-3.pdf",
    courses: courses("Matemáticas fundamentales|Fundamentos de Ingeniería Eléctrica|Introducción a la ingeniería|Desarrollo personal|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Cálculo 1|Cálculo 2|Álgebra lineal|Diseño conceptual|Algoritmia y programación|Física 1|Física 2|Física 3|Circuitos eléctricos 1|Circuitos eléctricos 2|Electrónica análoga|Electrónica de potencia|Máquinas eléctricas 1|Máquinas eléctricas 2|Accionamientos eléctricos|Señales y sistemas|Sistemas dinámicos|Control|Protecciones eléctricas|Instalaciones eléctricas y normatividad|Sistemas de potencia 1|Sistemas de potencia 2|Líneas y redes|Mercados de energía eléctrica|Energías renovables|Diseño eléctrico integrador|Formulación y evaluación de proyectos|Seminario de Ingeniería Eléctrica|Trabajo de grado"),
    electives: electives("Electiva profesional 1|Electiva profesional 2|Electiva socio humanística|Electiva de lectura y escritura"),
  },
  {
    program: "Ingeniería Electrónica y Telecomunicaciones",
    plan: "Plan publicado en la página oficial del programa",
    source: "https://www.uao.edu.co/programa/ingenieria-electronica-y-telecomunicaciones/",
    courses: courses("Matemáticas fundamentales|Fundamentos de Ingeniería Electrónica y Telecomunicaciones|Desarrollo personal|Introducción a la ingeniería|Expresión oral y escrita|Inglés I|Inglés II|Inglés III|Inglés IV|Inglés V|Cálculo I|Cálculo II|Álgebra lineal|Algoritmia y programación|Diseño conceptual|Ética|Física I|Física II|Física III|Probabilidad y estadística|Señales y sistemas|Sistemas dinámicos|Circuitos eléctricos I|Circuitos electrónicos|Electrónica I|Electrónica II|Electrónica digital|Microprocesadores|Control I|Telecomunicaciones I|Telecomunicaciones II|Telecomunicaciones III|Campos electromagnéticos|Electrónica de potencia|Instrumentación|Sistemas digitales programables|Medios de transmisión|Sistemas inalámbricos|Diseño electrónico|Formulación y evaluación de proyectos|Seminario de Ingeniería Electrónica y Telecomunicaciones|Trabajo de grado|Administración para ingenieros"),
    electives: electives("Electiva básica|Electiva profesional I|Electiva profesional II|Electiva profesional virtual|Electiva de humanidades"),
  },
  {
    program: "Ingeniería Biomédica",
    plan: "Plan publicado en 2024",
    source: "https://www.uao.edu.co/wp-content/uploads/2025/01/PLAN-DE-ESTUDIO-ING-BIOMEDICA-2024.pdf",
    courses: courses("Matemáticas fundamentales|Fundamentos de Ingeniería Biomédica|Introducción a la ingeniería|Desarrollo personal|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Cálculo 1|Cálculo 2|Álgebra lineal|Diseño conceptual|Algoritmia y programación|Física 1|Física 2|Probabilidad y estadística|Química|Señales y sistemas|Sistemas dinámicos|Control 1|Circuitos eléctricos 1|Electrónica análoga|Electrónica digital|Microprocesadores|Bioinstrumentación 1|Bioinstrumentación 2|Morfofisiología 1|Morfofisiología 2|Bioquímica médica|Biofísica médica|Biomateriales|Biomecánica|Diseño biomédico 1|Diseño biomédico 2|Ingeniería clínica 1|Ingeniería clínica 2|Ingeniería de rehabilitación|Formulación y evaluación de proyectos|Seminario de Ingeniería Biomédica|Trabajo de grado"),
    electives: electives("Electiva básica|Electiva profesional 1|Electiva profesional 2|Electiva profesional virtual|Electiva de humanidades|Electiva de ciencias sociales|Electiva de lectura y escritura"),
  },
  {
    program: "Ingeniería Ambiental",
    plan: "Plan publicado en 2025 (plan 2022)",
    source: "https://www.uao.edu.co/wp-content/uploads/2025/01/PLAN-DE-ESTUDIO-ING-AMBIENTAL-2022.pdf",
    electivesSource: "https://www.uao.edu.co/wp-content/uploads/2025/01/ELECTIVAS-ING-AMBIENTAL-2022.pdf",
    electivesYear: "Listado de electivas publicado en 2022",
    courses: courses("Matemáticas fundamentales|Fundamentos de Ingeniería Ambiental|Introducción a la ingeniería|Desarrollo personal|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Cálculo 1|Cálculo 2|Álgebra lineal|Diseño conceptual|Algoritmia y programación|Química ambiental|Laboratorio de química ambiental|Química general|Física 1|Física 2|Ecuaciones diferenciales|Probabilidad y estadística|Fundamentos de biología y ecología|Mecánica de fluidos ambientales|Hidráulica|Microbiología ambiental|Balances de materia y energía en sistemas ambientales|Ambiente y salud|Geomática|Procesos de tratamiento|Contaminación atmosférica|Gestión ambiental|Hidrología|Ingeniería de suelos|Diseño de plantas|Modelación ambiental|Residuos sólidos|Diseño integrador de sostenibilidad|Evaluación de impacto ambiental|Formulación y evaluación de proyectos|Seminario de Ingeniería Ambiental|Trabajo de grado"),
    electives: electives("Electiva en ciencias sociales|Electiva básica|Electiva profesional 1|Electiva profesional 2|Electiva profesional virtual|Electiva de lectura y escritura"),
    electiveOptions: electiveOptions("Física moderna|El universo y sus leyes físicas|Dibujo de ingeniería|Mecánica|Dibujo asistido por computador para ingeniería|Herramientas computacionales para ingeniería|Metrología|Dinámica de sistemas|Fundamentos y aplicaciones de inteligencia artificial|Desarrollo urbano sostenible|Procesos de transformación y aprovechamiento|Ingeniería de proyectos sostenibles|Introducción a la dinámica de fluidos computacional|Ingeniería para la gestión del recurso hídrico|Gestión de residuos especiales e ingeniería de la disposición final|Aprovechamiento de biomasa|Tratamiento avanzado de aguas residuales|Monitoreo y evaluación integrada de la calidad del agua|Control de contaminantes atmosféricos|Agricultura urbana|Gestión del agua residual para reúso y vertimiento|Mitigación y adaptación al cambio climático|Tratamiento de biorresiduos|ODS y sostenibilidad|Economía ambiental para ingenieros"),
  },
  {
    program: "Ingeniería de Manufactura",
    plan: "Plan publicado en 2021",
    source: "https://www.uao.edu.co/wp-content/uploads/2021/06/Plan-de-Estudios-Ingenieria-de-Manufactura-1.pdf",
    courses: courses("Matemáticas fundamentales|Introducción a la Ingeniería de Manufactura|Comunicación oral y escrita|Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Álgebra lineal|Cálculo 1|Cálculo 2|Estadística y probabilidad|Física 1|Física 2|Ingeniería y sostenibilidad|Mecánica aplicada|Costos|Sistemas de producción|Materiales y procesos de manufactura|Diseño para la manufactura y ensamble|Diseño y tecnologías de fabricación digital|Ingeniería asistida por computador|Gestión del ciclo de vida del producto|Control y aseguramiento de la calidad|Gestión y mejora de la producción|Salud y seguridad en el trabajo|Sistemas avanzados de manufactura|Proyecto integrador|Innovación y emprendimiento|Seminario de Ingeniería de Manufactura"),
    electives: electives("Electiva libre|Electiva humanística|Electiva 1|Electiva 2|Electiva 3|Electiva 4"),
  },
  {
    program: "Ingeniería Empresarial",
    plan: "Pénsum 2023",
    source: "https://www.uao.edu.co/wp-content/uploads/2023/12/PLAN-DE-ESTUDIO-INGENIERI%CC%81A-EMPRESARIAL-2023.pdf",
    courses: courses("Inglés 1|Inglés 2|Inglés 3|Inglés 4|Inglés 5|Comunicación oral y escrita|Formación ciudadana 1: Identidades y pluralismo|Formación ciudadana 2: Sociedad y Estado|Formación ciudadana 3: Paz y convivencia|Matemáticas fundamentales|Cálculo 1|Cálculo 2|Física|Álgebra lineal|Ingeniería y sostenibilidad|Introducción a la Ingeniería Empresarial|Innovación y emprendimiento|Pensamiento Lean|Seminario de Ingeniería Empresarial|Herramientas de modelación 1|Herramientas de modelación 2|Contabilidad y finanzas|Legislación de empresa|Simulación empresarial 1|Simulación empresarial 2|Gestión del conocimiento y talento humano|Analítica para la toma de decisiones|Diseño empresarial|Formulación, evaluación y gestión de proyectos|Diseño y gestión de servicios|Inteligencia empresarial|Sistemas integrados de gestión|Negocios internacionales"),
    electives: electives("Electiva de lectura y escritura|Electiva socio-humanística|Electiva libre 1|Electiva profesional 1|Electiva profesional 2"),
  },
];

export const COURSE_KIND_LABELS = {
  core: "Plan de estudios",
  elective: "Electiva del plan",
  "elective-option": "Opción electiva publicada",
};
