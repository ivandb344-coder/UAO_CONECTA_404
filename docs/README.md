# Documentación DCU · Hub de Integración Estudiantil UAO (UAO Conecta)

**Curso:** Interacción Humano-Computador · Facultad de Ingeniería · Universidad Autónoma de Occidente
**Docente:** Paola Andrea Castillo
**Equipo 404**

| Integrante | Rol en el equipo |
|---|---|
| **Iván David Bejarano** | Líder del equipo |
| Julián Andrés Vásquez | Líder de documentación y calidad |
| Johan Santiago López | Diseñador visual |
| Laura Valentina Henao | Diseñadora de producto |
| Idaira Yeli Gutiérrez | Representante de diseño UX |

## Índice

| Archivo | Contenido |
|---|---|
| [01_objetivo_hipotesis.md](./01_objetivo_hipotesis.md) | Problema, objetivo, hipótesis y justificación centrada en la **fragmentación de plataformas** |
| [02_benchmarking.md](./02_benchmarking.md) | Comparativo Piazza · Discord · Teams · Moodle · WhatsApp y conclusión: el Hub como **capa integradora** |
| [03_indagacion.md](./03_indagacion.md) | Resultados de la indagación (52 encuestados, 4 docentes) con cruces de variables y citas |
| [04_requerimientos.md](./04_requerimientos.md) | Tablas formales de requerimientos funcionales y no funcionales (IDs completos y trazables) |
| [05_evaluacion_alternativas.md](./05_evaluacion_alternativas.md) | Matriz de decisión multicriterio: Hub UAO Conecta (4.15) · SincroUAO (3.25) · Red de Apoyo (3.65) |
| [06_pruebas_usabilidad.md](./06_pruebas_usabilidad.md) | Protocolo de pruebas con estudiantes y Matriz de Hallazgos (plantilla) |
| [auth_testing.md](./auth_testing.md) | Guía técnica de pruebas de autenticación (heredada) |

## Perfiles de usuario (clasificación corregida)

| Perfil | Tipo | Persona |
|---|---|---|
| Estudiante de Ingeniería | **Usuario principal** | Daniel Rodríguez |
| Monitor académico | Usuario secundario | Sebastián Castro |
| Docente de Ingeniería | Usuario secundario | Laura Mendoza |
| Programas académicos de Ingeniería | Stakeholder | Dirección de programa |
| Equipo de proyecto (404) | Stakeholder interno | — |

### Ficha docente · Laura Mendoza — **Puntos de dolor** (antes titulado erróneamente "Necesidades")

- Recibe preguntas sin suficiente contexto (sin asignatura, tema ni intento previo).
- Solicitudes dispersas entre Teams, correo, WhatsApp y pasillo.
- Mensajes enviados fuera de los horarios de disponibilidad.
- Repetir la misma explicación a varios estudiantes.
- No encontrar fácilmente archivos o conversaciones anteriores.

### Ficha docente — Necesidades (derivadas de los puntos de dolor)

- Recibir preguntas contextualizadas por asignatura y tema.
- Un único canal académico con horarios de asesoría visibles.
- Reutilizar respuestas y recursos ya publicados.

## Correcciones formales aplicadas respecto al Avance 1

| Antes | Ahora | Ubicación |
|---|---|---|
| "Ivan David Diaz" / "Ivan David Bejarano" | **Iván David Bejarano** (Líder del equipo) | Portada, tabla de integrantes |
| "Aprendizaje educativo" | **Aprendizaje colaborativo** | Marco teórico |
| "DCU en Acción" | **DCU en acción** | Sección 16 |
| "Ideacción" | **Ideación** | Sección 20 |
| "Próxima Iteracción" | **Próxima iteración** | Sección 23 |
| "Arbol de problemas" | **Árbol de problemas** | Sección 6 |
| "Diseño y Ejecucion" | **Diseño y Ejecución** | Sección 13 |
| Ficha docente: "Necesidades" listaba problemas | Sección renombrada a **Puntos de dolor**; se añaden necesidades reales | Sección 10 |
| Perfiles sin jerarquía | Estudiante (principal) · Monitor/Docente (secundarios) · Programas/Equipo (stakeholders) | Sección 9-10 |
| Requerimientos con IDs faltantes | Se completan RF-E09, RF-E11, RF-P02, RNF-06 a RNF-12, RNF-14 y RNF-15 | 04_requerimientos.md |

## Evidencia en la aplicación

La ruta `/#/evidencias-dcu` del frontend muestra tres pestañas: **Propuesta de valor y prototipo**, **Análisis de conceptos HCI** y **Satisfacción de necesidades**, con capturas reales de la interfaz rediseñada según el Manual de Identidad UAO 2026.
