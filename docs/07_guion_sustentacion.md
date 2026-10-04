# Guion de Sustentación — Hub de Integración Estudiantil UAO (Grupo 404)

**Audiencia:** Prof. Paola Andrea Castillo · Curso de Interacción Humano-Computador (DCU)
**Duración objetivo:** 3:30 – 4:00 min
**Lema de la presentación:** *"No es otra plataforma. Es la capa que une Moodle, Teams y Banner."*

---

## 0. Checklist previo (30 s antes de empezar)

- [ ] Backend y frontend corriendo (verde en `GET /api/health`).
- [ ] Cuentas demo activas (misma contraseña): `UAOdemo2026!`
  - Docente: `pacastillo@uao.edu.co`
  - Estudiante: `estudiante.demo@uao.edu.co`
- [ ] Navegador en la ruta de login: `/` (sin sesión iniciada).
- [ ] DevTools listo con vista de **360 px** para el momento responsive.

---

## 1. Apertura — Propuesta de valor (0:00 – 0:35)

**Pantalla:** Login (`/`).

**Acción:** No escribir nada aún. Señalar el panel izquierdo.

**Guion:**
> "Los estudiantes de la UAO revisan hoy Moodle para las notas, Teams para hablar y Banner para la matrícula. Eso es **fragmentación**: tres silos, tres inicios de sesión, información dispersa. Nuestra propuesta **no es crear una sexta plataforma**, es una **capa de unificación** que se conecta a los sistemas que ya existen y los trae a un solo tablero."

**Principio HCI que se evidencia:** Correspondencia con el mundo real (los sistemas conservan su nombre real: Moodle, Teams, Banner).

---

## 2. Seguridad e Identidad — SSO y rol automático (0:35 – 1:25)

**Pantalla:** Login.

**Acción (docente):**
1. Escribir `pacastillo@uao.edu.co` y salir del campo (clic en Contraseña).
2. **Esperar el badge verde "Docente verificado · Directorio docente · Facultad de Ingeniería".**
3. Escribir la contraseña y pulsar **"Ingresar al Hub"**.

**Guion:**
> "El acceso es con la **cuenta institucional `@uao.edu.co`**: si escribo un correo externo, el sistema lo rechaza antes de enviar — eso es **prevención de errores**. Al escribir el correo de la profesora, el Hub **verifica la identidad contra el directorio docente** y le asigna el rol **docente automáticamente**, sin que nadie elija su rol. Una sola sesión institucional — SSO — abre todo."

**Principios HCI:** Prevención de errores (filtro de dominio + botón deshabilitado), Visibilidad del estado del sistema (badge de verificación en vivo).

**Detalle a destacar:** El rol lo decide el sistema (lista blanca docente), no el usuario → se elimina el error de "registrarse con el rol equivocado".

---

## 3. Capa de integración — Cero fragmentación (1:25 – 2:05)

**Pantalla:** Inicio del **docente** (`/#/inicio`).

**Acción:** Recorrer con el cursor las tres tarjetas (Moodle, Teams, Banner). Señalar el chip "Sesión institucional · pacastillo@uao.edu.co".

**Guion:**
> "Este es el corazón del Hub. Una sola pantalla muestra lo que hoy está en tres sistemas: en **Moodle**, la profesora tiene *14 entregas por calificar*; en **Teams**, una *asesoría grupal en curso*; en **Banner**, sus *cursos asignados* y el *cierre de notas*. Cada tarjeta tiene su acción directa **'Abrir en…'**. El estudiante no salta entre plataformas: **el Hub las trae a él**."

**Principio HCI:** Encontrabilidad + Diseño estético y minimalista (tres widgets, amplio espacio en blanco, un solo vistazo).

---

## 4. Dualidad de roles + Modo Monitor (2:05 – 2:45)

**Acción:**
1. Cerrar sesión.
2. Entrar como `estudiante.demo@uao.edu.co` / `UAOdemo2026!`.
3. Mostrar que el tablero **cambia** (Moodle: *"Nuevas calificaciones"*; Banner: *"Promedio acumulado 4.5 · Matrícula activa"*).
4. Activar el toggle **"Modo Monitor"** → aparece el panel *"Hoy acompañas a tu asignatura"*.

**Guion:**
> "El mismo Hub se adapta al rol. Como **estudiante**, ve su promedio y sus entregas. Y si es **monitor**, activa el **Modo Monitor** — un rol visual **reversible** — y el tablero le muestra las acciones de acompañamiento a su asignatura. Tres perspectivas, una sola identidad institucional."

**Principio HCI:** Control y libertad del usuario (Modo Monitor reversible), Flexibilidad y eficiencia.

---

## 5. Criterios HCI — Evidencias DCU (2:45 – 3:30)

**Pantalla:** `/#/evidencias-dcu`.

**Acción:** Recorrer las tres pestañas.
1. **Propuesta de valor y prototipo** → pasar 2-3 diapositivas del carrusel (incluye la **vista docente** y el **Modo Monitor**).
2. **Análisis de conceptos HCI** → señalar la **paleta del Manual de Identidad UAO 2026** con sus contrastes medidos.
3. **Satisfacción de necesidades** → mostrar la tabla *Necesidad → ID Requerimiento → Captura de UI*.

**Guion:**
> "Todo el diseño sigue el **Manual de Identidad UAO 2026**: el rojo institucional `#A81B1E` y el azul `#1E293B`. Medimos el contraste según **WCAG 2.1**: blanco sobre rojo da **7.4:1 (AAA)**, blanco sobre azul **14.6:1 (AAA)** — superamos el nivel AA. La interfaz es **responsive hasta 360 px** sin scroll horizontal. Y este módulo de **Evidencias DCU** documenta la trazabilidad completa: cada **necesidad** de la indagación conecta con su **requerimiento** y con la **captura real** de la pantalla que la satisface."

**Principios HCI:** Consistencia y estándares (Manual UAO), Affordance, y las 10 heurísticas de Nielsen aplicadas (listadas en la pestaña 2).

---

## 6. Cierre (3:30 – 4:00)

**Guion:**
> "En resumen: el Hub de Integración Estudiantil **resuelve la fragmentación** uniendo Moodle, Teams y Banner bajo una sola identidad `@uao.edu.co`, con **seguridad por diseño** (rol automático, filtro de dominio) y con **criterios HCI verificables** (Manual UAO 2026, contraste AAA, responsive 360 px, evidencias trazables). No es otro silo: es la capa que los conecta. ¿Preguntas?"

---

## Anexo A — Datos de apoyo (por si preguntan)

| Tema | Dato |
|------|------|
| Contraste blanco / `#A81B1E` | 7.39 : 1 → **AAA** |
| Contraste blanco / `#1E293B` | 14.63 : 1 → **AAA** |
| Contraste coral `#FF836C` / `#1E293B` | 6.07 : 1 → **AA** |
| Responsive | **360 px** sin scroll horizontal (RNF-03) |
| Indagación | 52 estudiantes + 4 docentes (`docs/03_indagacion.md`) |
| Alternativa ganadora | Hub UAO Conecta, 4.15/5 (`docs/05_evaluacion_alternativas.md`) |
| Seguridad | Filtro `@uao.edu.co` (front + back) · rol automático por lista blanca docente |

## Anexo B — Plan B (si algo falla en vivo)

- **Si el login tarda:** mencionar el overlay "Conectando con los sistemas UAO" (Visibilidad del estado del sistema) — es parte del diseño.
- **Si no carga una imagen:** las capturas reales están en `/public/assets/evidencias/` y también dentro del carrusel de `/evidencias-dcu`.
- **Si piden ver el código:** `backend/app/routers/integrations.py` (capa mock Moodle/Teams/Banner) y `backend/app/core/institution.py` (lista blanca docente y filtro de dominio).

## Anexo C — Rutas rápidas

| Pantalla | Ruta |
|----------|------|
| Login | `/` |
| Inicio (capa de integración) | `/#/inicio` |
| Asesorías (ruta de apoyo) | `/#/asesorias` |
| Dudas (asincrónicas / anónimas) | `/#/dudas` |
| **Evidencias DCU** | `/#/evidencias-dcu` |
