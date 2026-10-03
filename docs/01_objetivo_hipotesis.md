# 01 · Objetivo, hipótesis y justificación

## 1. Problema

En los programas de Ingeniería de la UAO la vida académica del estudiante está **fragmentada en plataformas que no conversan entre sí**: las aulas y calificaciones viven en **Moodle**, las clases y reuniones en **Microsoft Teams**, el registro, la matrícula y el promedio en **Banner**, los grupos de estudio en **WhatsApp** y los avisos en el **correo institucional**. Ninguna de estas herramientas fue diseñada para responder la pregunta que el estudiante se hace cada semana: *"¿qué tengo pendiente, a quién le pregunto y dónde estaba eso?"*.

La indagación (52 estudiantes encuestados, 4 docentes entrevistados) confirmó que el problema no es la falta de herramientas sino su **dispersión**: el 30,8 % revisa demasiados medios para encontrar información, el 44,2 % tiene dificultad para localizarla y una cuarta parte (25 %) **no sabe a quién acudir**. Esta fragmentación afecta especialmente a los estudiantes de primeros semestres (40,4 % de la muestra), que aún no conocen las rutas institucionales de apoyo.

> Esta formulación corrige el Avance 1, donde la dispersión se presentaba como un agravante secundario. La evidencia la ubica como **causa estructural**: coordinación, encontrabilidad y rutas de apoyo fallan *porque* la información está repartida en silos.

## 2. Objetivo general

Diseñar y prototipar un **Hub de Experiencia Estudiantil e Integración UAO** que, mediante autenticación institucional única (SSO con correo `@uao.edu.co`), **unifique en una sola interfaz** la información y las acciones académicas que hoy están repartidas entre Moodle, Teams y Banner, e incorpore las funciones de apoyo entre pares (dudas, asesorías, grupos y rutas de acompañamiento) que esas plataformas no cubren.

## 3. Objetivos específicos

| # | Objetivo específico | Verificación |
|---|---|---|
| OE1 | Centralizar el estado académico del estudiante (calificaciones, entregas, mensajes, promedio, matrícula) en un tablero único alimentado por los sistemas existentes. | Widgets Moodle / Teams / Banner en el Inicio (RF-E09). |
| OE2 | Hacer visible la **ruta de apoyo** por asignatura: docente, monitor y recursos validados, con horarios de asesoría reservables. | Módulo Asesorías + perfiles por rol (RF-E06, RF-E11, RF-P02, RF-M01). |
| OE3 | Reducir el costo social de preguntar mediante dudas asíncronas, opcionalmente anónimas, con estado visible. | Módulo Dudas (RF-E04, RF-E05, RNF-13). |
| OE4 | Aplicar el Manual de Identidad UAO 2026 y principios de usabilidad (affordance, consistencia, retroalimentación, prevención de errores) verificables con heurísticas. | Sistema de diseño + `/evidencias-dcu` (RNF-05 a RNF-09). |
| OE5 | Validar la propuesta con usuarios reales mediante pruebas de usabilidad moderadas. | Protocolo y Matriz de Hallazgos (06_pruebas_usabilidad.md). |

## 4. Hipótesis

**H1 (principal).** Si el estudiante accede, con una sola cuenta institucional, a una capa que integra la información de Moodle, Teams y Banner y la combina con rutas de apoyo visibles, entonces disminuirá el tiempo y el número de plataformas que necesita revisar para saber qué tiene pendiente y a quién acudir.

**H2.** Un flujo de dudas asíncrono y con opción de anonimato aumentará la disposición a preguntar en los estudiantes que hoy declaran "pena al preguntar" (23,1 %).

**H3.** Los docentes aceptarán el Hub en la medida en que **no les exija migrar** sus cursos ni duplicar contenido: la integración de lectura (no de reemplazo) es condición de adopción.

### Métricas asociadas

| Hipótesis | Métrica | Línea base (indagación) | Meta del prototipo |
|---|---|---|---|
| H1 | Plataformas revisadas para resolver "¿qué tengo pendiente?" | 3 – 5 | 1 |
| H1 | Tiempo para encontrar a quién acudir en una asignatura | No medido (25 % no sabe) | < 60 s en prueba de usabilidad |
| H2 | Intención declarada de publicar una duda | — | ≥ 70 % de participantes en prueba |
| H3 | Docentes que aceptarían usar el Hub sin migrar Moodle | 4 entrevistados | ≥ 3 de 4 |

## 5. Justificación: por qué una capa de integración y no "otra plataforma"

1. **Anti-fragmentación.** Crear un sistema aislado más (foro, repositorio, red social) *aumentaría* la dispersión que queremos resolver. El Hub se posiciona como **capa de unificación**: lee lo que ya existe y lo presenta con una sola identidad visual, una sola sesión y una sola arquitectura de información.
2. **Evidencia de uso real.** El 88,5 % usa WhatsApp y el 71,2 % usa IA para resolver dudas; no tiene sentido competir con esos hábitos. El Hub organiza y hace visible lo que ya ocurre (dudas, grupos, rutas) y deja los sistemas de registro donde están.
3. **Viabilidad institucional.** La UAO ya opera SSO con Microsoft 365 (Teams), Moodle y Banner. Una capa que consume esas fuentes mediante la cuenta institucional es técnicamente más viable y menos costosa que una migración; este criterio pesa un 20 % en la matriz de decisión (ver 05_evaluacion_alternativas.md).
4. **Alineación con el ODS 4.** Centralizar el acceso a información y acompañamiento reduce barreras para estudiantes nuevos y favorece una educación más inclusiva y de calidad.
5. **Marco teórico.** Desde la comunicación educativa dialógica y el **aprendizaje colaborativo** (constructivismo social), el valor no está en almacenar contenidos sino en estructurar la interacción: quién sabe, cuándo está disponible y cómo se pregunta.

## 6. Alcance del prototipo (Avance 2)

- **Incluye:** autenticación institucional con detección automática de rol (directorio docente), tablero de integración con datos simulados de Moodle/Teams/Banner, dudas, asignaturas, asesorías con reservas, chat, perfiles, módulo de evidencias DCU, sistema de diseño UAO 2026.
- **No incluye (simulado):** conexión real a las APIs de Moodle, Teams y Banner. Los datos de integración son *mocks* servidos por el backend para demostrar la propuesta de valor y evaluar la interfaz con usuarios.
