# App INJUVE Link — Fase 1

Landing pública + formulario de inscripción con aviso de privacidad (derechos ARCO) y ruta de consentimiento para menores de edad.

## Estructura

- `app/page.jsx` — Landing: programa, costos, niveles, FAQ
- `app/inscripcion/page.jsx` — Formulario con validación (CURP, edad 12+, tutor si es menor)
- `app/aviso-de-privacidad/page.jsx` — Aviso integral (borrador, pendiente validación jurídica)
- `app/api/inscripcion/route.js` — API: valida, genera folio vía RPC en Supabase, replica a Sheets (webhook Apps Script)
- `app/login/page.jsx` — Login del alumno (clave de alumno + WhatsApp)
- `app/alumno/page.jsx` — Portal del alumno: info general, grupo/horario y botón "Tomar clase" (Google Meet)
- `app/api/alumno/login/route.js` y `app/api/alumno/data/route.js` — Sesión del alumno (cookie firmada) y datos del panel
- `app/admin/page.jsx` — Panel del equipo (inscripciones, grupos, Google Meet, estado y acceso)
- `supabase/migrations/` — `0001`–`0005`, aplicar en orden. `0005` añade `liga_meet` (Google Meet) y habilita el portal del alumno
- `public/logos/` — Logos con fondo transparente

## Para desplegar (cuando estén las cuentas institucionales)

1. Supabase (cuenta La Nueva Escuela): crear proyecto `injuve-link` y aplicar `supabase/migrations/0001_fase1.sql`
2. Vercel: importar este proyecto y configurar variables de entorno (ver `.env.example`)
3. Probar una inscripción de prueba end-to-end

## Variables de entorno

Ver `.env.example`. La app funciona sin ellas (modo mantenimiento en el formulario), pero no guarda inscripciones.
