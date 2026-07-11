# Prueba manual — flujos de email

Los tests automatizados (unitarios y e2e) mockean `MailerService` o corren sin `RESEND_API_KEY` —
verifican que el código *intenta* mandar el mail con los datos correctos, pero nunca confirman que
un mail real llega a una bandeja de entrada. Esta checklist cubre eso: probar a mano, en el
navegador, contra Resend real con el dominio verificado (`notifications.francoorizonte.com`).

Estado: sin probar todavía (2026-07-11) — completar la columna Resultado a medida que se prueba.

## Prerrequisitos

- [ ] Backend corriendo con `.env` real (no `.env.test`) — `RESEND_API_KEY` y `RESEND_FROM` configurados con el dominio verificado.
- [ ] Frontend corriendo (`pnpm dev`).
- [ ] Tener a mano 2 direcciones de mail reales que puedas revisar (una como "owner", otra como "respondente" — pueden ser la misma cuenta con alias `+algo@gmail.com` si no tenés dos).

## Caso 1 — OTP de acceso a link individual

**Qué prueba:** que `otp-auth` manda el código real por mail (no solo lo loguea).

1. Logueate como owner, creá un formulario con un campo cualquiera, publicalo.
2. En la pestaña de plugins del form, activá **"Enlace individual (con OTP)"**.
3. Andá a la pestaña de Links, creá un link nuevo, agregá tu email de prueba a la lista de emails permitidos.
4. Copiá la URL del link y abrila en una ventana privada/incógnito (para simular un respondente sin sesión).
5. Ingresá tu email de prueba, pedí el código.
6. Revisá tu bandeja (y spam) — **¿llegó el mail con el código de 6 dígitos?**
7. Cargá el código, confirmá que te deja pasar al formulario.
8. Completá y enviá una respuesta.

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| Pedir código | Mail recibido en <1 min, asunto "Tu código de acceso" | |
| Código correcto | Acceso concedido, formulario visible | |
| Reusar el mismo código | Rechazado (código ya usado) | |
| Email NO invitado pide código | ¿Se manda igual o se bloquea antes? Revisar comportamiento | |

## Caso 2 — Aviso al dueño (`owner-notify`)

**Qué prueba:** que el owner recibe un mail real cuando llega una respuesta nueva.

1. En un formulario publicado, activá **"Aviso por email al dueño"** en la pestaña de plugins.
2. Guardá los cambios.
3. Desde otra pestaña/incógnito, respondé el formulario (puede ser vía link público, no hace falta OTP para este caso).
4. Revisá la bandeja del email con el que te registraste como owner.

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| Responder el form | Owner recibe mail "Nueva respuesta en {título}" | |
| Contenido del mail | Menciona el título correcto del formulario | |
| Múltiples respuestas seguidas | ¿Llega un mail por cada una, o se acumulan? | |

## Caso 3 — Confirmación al respondente (`respondent-confirmation`)

**Qué prueba:** que el respondente recibe confirmación SOLO si su identidad fue verificada por email (OTP), y que con link público (sin verificación) no pasa nada raro.

1. En el mismo form del Caso 1 (con `individual-link` + `otp-auth` activos), activá también **"Confirmación por email al respondente"**.
2. Repetí el flujo de verificación OTP y respondé.
3. Revisá la bandeja del email respondente — debería llegar un segundo mail (distinto al del código OTP) confirmando la respuesta.
4. Aparte, probá el caso negativo: un formulario con **"Enlace público"** (sin OTP) que también tenga `respondent-confirmation` activo — respondé sin dar ningún email.

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| Responder con email verificado (OTP) | Llega mail "Recibimos tu respuesta" | |
| Responder por link público, sin email | NO llega mail (ni error visible) — el plugin no tiene a quién mandarle | |

## Caso 4 — Remitente y entregabilidad

**Qué prueba:** que el dominio verificado funciona de punta a punta, no solo hacia tu propia cuenta de Resend.

- [ ] El remitente que aparece en los mails recibidos es `notificaciones@notifications.francoorizonte.com` (o el que hayas configurado en `RESEND_FROM`).
- [ ] Probar con un destinatario que NO sea tu cuenta de Resend (ya confirmado una vez con `scripts/test-mail.mjs`, pero vale reconfirmar en el flujo real de la app, no solo con el script).
- [ ] Revisar que el mail no cae en spam de entrada — si cae, puede valer la pena revisar el contenido (HTML muy simple hoy, sin texto plano alternativo) o esperar reputación del dominio nuevo.

## Puntos de seguridad a re-confirmar en el navegador (fixes de esta sesión)

Estos ya están cubiertos por tests automatizados, pero vale la pena verlos con tus propios ojos una vez:

- [ ] Un formulario ajeno (no tuyo) en `/forms/:id` — como visitante sin sesión, la respuesta no debe incluir `pluginConfig` ni `ownerId` visibles en la Network tab del navegador.
- [ ] Ver `/forms/:id/responses` de un form que no es tuyo, logueado con otra cuenta — debe dar error 403, no mostrar las respuestas.
- [ ] Ver `/forms/:id/responses` sin sesión iniciada — debe redirigir a login o dar 401.
