# 05 · Ideación y evaluación de alternativas

## 1. Alternativas generadas

A partir de los seis insights de la indagación se idearon tres alternativas de solución. Las tres responden al mismo problema (fragmentación de la comunicación y del apoyo académico), pero con enfoques distintos.

| Alternativa | Nombre | Enfoque | Qué incluye | Qué deja fuera |
|---|---|---|---|---|
| **A** | **Hub UAO Conecta** | Capa de integración institucional por asignatura | SSO con cuenta UAO, tablero unificado de Moodle / Teams / Banner, dudas asíncronas (con anonimato), asesorías reservables, ruta de apoyo visible, chat por asignatura | Reemplazar los sistemas existentes |
| **B** | **SincroUAO** | Coordinación ligera de grupos + tareas | Horarios comunes, reparto de tareas, recordatorios, archivos del grupo | Dudas, rutas de apoyo, integración con sistemas institucionales |
| **C** | **Red de Apoyo** | Preguntas y respuestas anónimas + rutas de acompañamiento | Dudas anónimas por asignatura, directorio de monitores y docentes, recursos recomendados | Coordinación de grupos, integración con Moodle / Teams / Banner |

## 2. Criterios y ponderación

Los criterios provienen directamente de las necesidades priorizadas (N1–N6) más un criterio de **viabilidad de integración**, que recibe el mayor peso porque la indagación mostró que los usuarios **no adoptan plataformas nuevas** si deben abandonar las que ya usan (insight 6) y porque la UAO ya opera SSO con Microsoft 365, Moodle y Banner.

| Criterio | Peso | Origen |
|---|---|---|
| C1 · Coordinación del grupo | 0,15 | N1 (67,3 % horarios · 50 % orden) |
| C2 · Encontrabilidad de la información | 0,15 | N2 (44,2 % · 30,8 %) |
| C3 · Apoyo asíncrono | 0,15 | N3 (46,2 % · 34,6 %) |
| C4 · Rutas de apoyo visibles | 0,15 | N4 (25 % + docentes) |
| C5 · Reducción de la barrera social | 0,10 | N5 (23,1 % pena) |
| C6 · Baja fricción de uso | 0,10 | Insight 6 · WhatsApp 88,5 % |
| C7 · Viabilidad de integración (SSO con sistemas UAO) | 0,20 | Benchmarking · H3 (adopción docente) |
| **Total** | **1,00** | |

Escala de calificación: 1 (muy bajo) – 5 (muy alto).

## 3. Matriz de decisión multicriterio

| Criterio (peso) | A · Hub UAO Conecta | B · SincroUAO | C · Red de Apoyo |
|---|---|---|---|
| C1 Coordinación (0,15) | 4 → 0,60 | **5** → 0,75 | 2 → 0,30 |
| C2 Encontrabilidad (0,15) | **5** → 0,75 | 3 → 0,45 | 4 → 0,60 |
| C3 Apoyo asíncrono (0,15) | 4 → 0,60 | 3 → 0,45 | 4 → 0,60 |
| C4 Rutas de apoyo (0,15) | 4 → 0,60 | 2 → 0,30 | **5** → 0,75 |
| C5 Barrera social (0,10) | 3 → 0,30 | 2 → 0,20 | **5** → 0,50 |
| C6 Baja fricción (0,10) | 3 → 0,30 | **5** → 0,50 | 3 → 0,30 |
| C7 Viabilidad de integración / SSO (0,20) | **5** → 1,00 | 3 → 0,60 | 3 → 0,60 |
| **Puntaje ponderado** | **4,15** | **3,25** | **3,65** |

### Justificación de las calificaciones

- **A · Hub UAO Conecta.** Obtiene el máximo en **encontrabilidad** porque reúne en una sola pantalla lo que hoy está en Moodle, Teams, Banner y el chat; y en **viabilidad de integración** porque se apoya en la cuenta institucional existente y no exige migrar cursos ni contenidos (condición de adopción docente, H3). Su fricción es media (3): un hub tiene más superficie que un chat, lo que se mitiga con una navegación de cinco secciones y una pantalla de inicio orientada a la acción.
- **B · SincroUAO.** Es la mejor en **coordinación** y **fricción**, pero no responde a tres de las cuatro necesidades altas (encontrabilidad, apoyo asíncrono, rutas) y no se conecta con los sistemas institucionales; sería una herramienta más en el ecosistema fragmentado.
- **C · Red de Apoyo.** Sobresale en **rutas de apoyo** y **barrera social** (anonimato), pero ignora la coordinación de grupos y la información académica dispersa. Su lógica de anonimato y directorio se **incorpora al Hub** (RF-E05, RF-E06, RNF-13).

## 4. Análisis de sensibilidad

Para comprobar que la decisión no depende de un solo peso se recalculó el puntaje con dos escenarios:

| Escenario | A | B | C | Ganadora |
|---|---|---|---|---|
| Pesos originales | 4,15 | 3,25 | 3,65 | A |
| Sin ponderar (todos 1/7) | 4,00 | 3,29 | 3,71 | A |
| C7 reducido a 0,10 y C5 subido a 0,20 | 3,95 | 3,15 | 3,85 | A |

El Hub se mantiene como primera opción en los tres escenarios; la distancia con C se reduce cuando se privilegia la barrera social, lo que confirma la decisión de absorber las fortalezas de C dentro de A.

## 5. Decisión

Se selecciona la **Alternativa A · Hub UAO Conecta** con un puntaje de **4,15 / 5**. El factor decisivo es la **viabilidad de integración mediante SSO**: al reutilizar la identidad institucional y leer los sistemas existentes, el Hub resuelve la fragmentación **sin agregar un silo nuevo**, lo que ninguna de las otras alternativas logra.

La solución final integra además:

- de **C**, las dudas anónimas y el directorio de rutas de apoyo;
- de **B**, la coordinación ligera (asesorías reservables hoy; horarios comunes y espacio de grupo en la próxima iteración).

## 6. Próxima iteración

1. Conectar los widgets de integración a las APIs reales (Moodle Web Services, Microsoft Graph, Banner Ethos) usando el SSO institucional.
2. Implementar "Mi grupo" (horarios comunes, acuerdos y reparto de tareas) para elevar C1 a 5.
3. Medir intención de adopción frente a WhatsApp con la Matriz de Hallazgos de las pruebas de usabilidad.
