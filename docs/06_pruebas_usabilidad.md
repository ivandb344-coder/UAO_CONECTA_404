# 06 · Pruebas de usabilidad

## 1. Objetivo de la evaluación

Verificar, con estudiantes de Ingeniería de la UAO, que el prototipo del **Hub de Integración Estudiantil** permite (a) saber qué tienen pendiente sin salir de la plataforma, (b) identificar a quién acudir en una asignatura y reservar una asesoría, y (c) publicar una duda con la opción de anonimato; y detectar problemas de usabilidad según las heurísticas de Nielsen y el Manual de Identidad UAO 2026.

## 2. Protocolo de pruebas con estudiantes

### 2.1 Participantes

| Criterio | Definición |
|---|---|
| Perfil | Estudiantes activos de programas de Ingeniería (usuario principal) |
| Cantidad | 5 participantes por ronda (Nielsen: 5 usuarios detectan ~85 % de los problemas); 2 rondas |
| Reclutamiento | 3 de 1.º–3.º semestre y 2 de 4.º o más (según el cruce 4.1 de la indagación) |
| Exclusión | Integrantes del equipo 404 o personas que hayan visto el prototipo |
| Complementario | 1 docente y 1 monitor en sesión de validación de la vista secundaria |

### 2.2 Tipo de prueba

- **Moderada, presencial o remota** (Teams con pantalla compartida), con protocolo de **pensar en voz alta**.
- Duración estimada: **30 minutos** por participante.
- Dispositivos: portátil (1366 px) y teléfono (360–390 px) para verificar RNF-03.

### 2.3 Materiales

1. Prototipo desplegado (URL pública) con las cuentas de prueba `estudiante.demo@uao.edu.co` / `UAOdemo2026!`.
2. Guion del moderador y consentimiento informado (grabación de pantalla y audio).
3. Cronómetro, hoja de registro por tarea y cuestionario **SUS** (System Usability Scale) post-prueba.
4. Matriz de Hallazgos (sección 3) para consolidar resultados.

### 2.4 Guion de la sesión

| Fase | Tiempo | Actividad |
|---|---|---|
| Bienvenida | 3 min | Presentación, objetivo ("evaluamos la interfaz, no a ti"), consentimiento informado. |
| Pre-cuestionario | 3 min | Semestre, programa, plataformas que usa hoy para resolver dudas. |
| Tareas | 18 min | Ejecución de las 5 tareas con pensar en voz alta. El moderador no ayuda salvo bloqueo total. |
| Post-cuestionario | 4 min | SUS (10 ítems) + 3 preguntas abiertas. |
| Cierre | 2 min | Agradecimiento, aclaraciones, entrega de constancia de participación. |

### 2.5 Tareas

| # | Tarea (escenario) | Requerimiento evaluado | Criterio de éxito | Métricas |
|---|---|---|---|---|
| T1 | "Ingresa con tu cuenta institucional y dime qué calificación nueva tienes en Moodle y si tu matrícula está activa, sin salir de la aplicación." | RF-E09, RNF-04, RNF-07 | Identifica ambos datos en el Inicio | Tiempo, éxito, nº de clics |
| T2 | "Tienes una duda de Cálculo I. Averigua quién puede ayudarte y cuándo atiende." | RF-E06, RF-P04, RF-M01 | Llega a la asesoría de Cálculo I y nombra al monitor/docente y el horario | Tiempo, éxito, ruta seguida |
| T3 | "Reserva un cupo en esa asesoría." | RF-E11, RNF-08 | Reserva confirmada con mensaje de éxito | Éxito, errores, comprensión del estado |
| T4 | "Publica una duda sobre derivadas sin que los demás estudiantes sepan que fuiste tú." | RF-E04, RF-E05, RNF-13 | Duda publicada con la opción anónima activa | Éxito, uso de la casilla, confianza declarada |
| T5 | "Cambia a Modo Monitor y vuelve a Modo Estudiante. ¿Qué cambió?" | Roles visuales, RNF-07 | Describe al menos un cambio en la navegación o el tablero | Comprensión, tiempo |

### 2.6 Métricas e instrumentos

| Métrica | Instrumento | Umbral de aceptación |
|---|---|---|
| Tasa de éxito por tarea | Hoja de registro | ≥ 80 % |
| Tiempo por tarea | Cronómetro | T1 ≤ 60 s · T2 ≤ 60 s · T3 ≤ 45 s · T4 ≤ 90 s · T5 ≤ 30 s |
| Errores por tarea | Observación | ≤ 1 error crítico por tarea en el total de participantes |
| Satisfacción | SUS | Promedio ≥ 70 (aceptable) · meta ≥ 80 |
| Severidad de hallazgos | Escala Nielsen 0–4 | Ningún hallazgo de severidad 4 sin plan de corrección |
| Contraste y responsive | Inspección en 360 px + verificador WCAG | Sin desbordes; contraste ≥ 4,5:1 |

### 2.7 Preguntas abiertas post-prueba

1. ¿Qué plataformas dejarías de revisar si usaras este Hub cada semana?
2. ¿Hubo algún momento en el que no supiste qué hacer o qué estaba pasando?
3. ¿Qué cambiarías de la pantalla de inicio?

### 2.8 Consideraciones éticas

- Consentimiento informado firmado; participación voluntaria y retiro posible en cualquier momento.
- Datos anonimizados (P1…P5); grabaciones eliminadas al finalizar el curso.
- Sin evaluación del participante: se evalúa el producto.

## 3. Matriz de Hallazgos

> Plantilla exigida por la rúbrica. Se diligencia una fila por hallazgo (o por pregunta de la rúbrica) tras cada ronda. **Severidad**: 0 = no es problema · 1 = cosmético · 2 = menor · 3 = mayor · 4 = catastrófico.

| # | Pregunta de rúbrica | Evidencia (tarea, participante, cita o captura) | Conclusión | Sugerencias | Modificaciones realizadas |
|---|---|---|---|---|---|
| 1 | ¿El usuario comprende la propuesta de valor del Hub (integración vs. nueva plataforma) en el primer minuto? | | | | |
| 2 | ¿La pantalla de inicio permite saber qué está pendiente sin salir de la aplicación? (T1) | | | | |
| 3 | ¿El usuario identifica a quién acudir y cuándo atiende? (T2) | | | | |
| 4 | ¿La reserva de asesoría ofrece retroalimentación clara de éxito o error? (T3) | | | | |
| 5 | ¿La opción de anonimato es visible y genera confianza? (T4) | | | | |
| 6 | ¿El cambio de rol visual (Modo Monitor) es comprensible y reversible? (T5) | | | | |
| 7 | ¿La interfaz respeta el Manual de Identidad UAO 2026 (color, tipografía, logo)? | | | | |
| 8 | ¿Los botones de acción tienen affordance suficiente (se reconocen como clicables)? | | | | |
| 9 | ¿Se previenen errores (validación en línea, confirmaciones)? | | | | |
| 10 | ¿El contraste y la legibilidad cumplen WCAG 2.1 AA en móvil (360 px)? | | | | |
| 11 | ¿La navegación es consistente entre secciones? | | | | |
| 12 | ¿Qué plataformas declararon que dejarían de revisar? (pregunta abierta 1) | | | | |

### Registro por participante (plantilla)

| Participante | Semestre | T1 (s / éxito) | T2 | T3 | T4 | T5 | SUS | Observaciones |
|---|---|---|---|---|---|---|---|---|
| P1 | | | | | | | | |
| P2 | | | | | | | | |
| P3 | | | | | | | | |
| P4 | | | | | | | | |
| P5 | | | | | | | | |

## 4. Plan de iteración

1. Consolidar la Matriz de Hallazgos tras la ronda 1 y clasificar por severidad.
2. Corregir hallazgos de severidad 3–4 antes de la ronda 2.
3. Documentar en la columna "Modificaciones realizadas" el cambio con su captura antes/después y actualizar `/evidencias-dcu`.
