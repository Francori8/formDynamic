# Dominio propio — francoorizonte.com

## Qué se compró

- **Dominio**: `francoorizonte.com`
- **Registrador**: Cloudflare Registrar
- **Costo**: ~USD 10-20/año en renovación normal (Cloudflare vende a precio de costo, sin markup — se comparó contra Hostinger, que con su promo inicial parecía más barato pero en régimen normal salía similar o peor)
- **Fecha**: julio 2026

## Sistema de mail — resumen

El dominio quedó configurado con dos piezas separadas, una para **mandar** mails desde la app y otra para **recibir/leer** mails como persona:

| | Para qué | Proveedor | Dirección |
|---|---|---|---|
| Envío (app) | Notificaciones automáticas del backend (OTP, avisos, confirmaciones) | Resend | `notificaciones@notifications.francoorizonte.com` |
| Recepción (humano) | Bandejas reales que se leen desde el celu/web | Zoho Mail | `contacto@`, `logs@`, `franco@` (admin) |

Cada mail que manda la app llega también, en copia oculta, a `logs@francoorizonte.com` — así queda un registro auditable de todo lo que el sistema envía, sin mezclarse con el mail personal.

## Envío — Resend

- **Subdominio verificado**: `notifications.francoorizonte.com`
- **Registros DNS** (cargados en Cloudflare vía "Auto configure" de Resend, autorización OAuth única):
  - `MX` → `send.notifications` → `feedback-smtp.sa-east-1.amazonses.com`
  - `TXT` (SPF) → `send.notifications` → `v=spf1 include:amazonses.com ~all`
  - `TXT` (DKIM) → `resend._domainkey.notifications` → clave pública larga

Estos registros le dicen a Gmail/Outlook/etc. "Resend tiene autorización para mandar mails en nombre de este dominio" — sin eso, los mails se marcarían como spam o se rechazarían directamente.

**Config en `apps/backend/.env`:**
```
RESEND_API_KEY="..."
RESEND_FROM="notificaciones@notifications.francoorizonte.com"
RESEND_BCC="logs@francoorizonte.com"
```

**Confirmado funcionando en producción real**: probado con `apps/backend/scripts/test-mail.mjs <email>` mandando a una dirección que no es la cuenta de Resend del dueño del proyecto, y llegó correctamente — el dominio salió del modo "sandbox" de Resend (antes solo entregaba a la propia casilla del dueño de la cuenta). Esto habilita en producción real a los plugins: `otp-auth` (códigos de verificación), `owner-notify` (aviso al dueño del form), y `respondent-confirmation` (confirmación al respondente).

## Recepción — Zoho Mail

Se usa el plan **Forever Free** de Zoho Mail (5 casillas, 5GB c/u, gratis, 1 dominio). Este plan existe pero Zoho lo esconde bastante en su flujo de ventas — el wizard normal empuja siempre a planes pagos (Mail Lite, Mail Premium, Workplace). El camino que funcionó:

1. Signup eligiendo **"Correo electrónico empresarial"** (no "personal", que da un `@zohomail.com` genérico).
2. En la pantalla de selección de plan (que solo muestra pagos), **volver atrás** en vez de comprar — ahí aparece la pantalla real: *"Puede usar un dominio que ya posee o comprar uno nuevo"*.
3. Elegir **"Agregar un dominio existente"** → escribir `francoorizonte.com`.
4. Verificar propiedad del dominio con **"Iniciar sesión en mi DNS"** (auto-configura un TXT en Cloudflare vía OAuth, igual que con Resend).
5. Crear las casillas de usuario deseadas.
6. En **Configuración de correo electrónico → SPF / DKIM**, configurar ambos con "Iniciar sesión en mi DNS" (mismo mecanismo OAuth). Sin esto, los mails salientes desde las casillas de Zoho tienden a caer en spam.
7. Pasos de "Grupos de configuración" y "Migración de datos" son opcionales — se pueden saltear si no hay nada que migrar de otro proveedor ni se necesitan reglas grupales.

**Limitación del plan free**: no tiene IMAP/POP — no se puede conectar a Gmail ni a ningún cliente de mail externo. Se lee únicamente desde `mail.zoho.com` (web) o la app oficial de **Zoho Mail** (celular, disponible en App Store/Play Store). La app permite loguear varias cuentas del dominio a la vez (como tener varios Gmail en la app de Gmail) y silenciar notificaciones por cuenta individualmente — no es todo o nada.

**Casillas creadas:**
- `franco@francoorizonte.com` (superadministrador) — solo gestiona el panel de Zoho (usuarios, DNS). No recibe tráfico de la app. Sin notificaciones activas.
- `contacto@francoorizonte.com` — casilla pública de uso activo, con notificaciones activadas en el celular.
- `logs@francoorizonte.com` — recibe copia oculta (BCC) automática de cada mail que manda el backend. Notificaciones silenciadas — se revisa solo cuando se quiere auditar.

**Registros DNS de Zoho** en Cloudflare: `MX`, `TXT` SPF (`v=spf1 include:zohomail.com ~all`), `TXT` DKIM (`zmail._domainkey`).

## BCC automático — cómo funciona en código

`apps/backend/src/core/mailer/mailer.service.ts`: si existe la env var `RESEND_BCC`, cada mail que manda `MailerService.send()` (usado por `otp-auth`, `owner-notify`, `respondent-confirmation`) incluye copia oculta a esa dirección automáticamente. Si la env var no está seteada, no se agrega ningún BCC — no rompe nada en entornos donde no se configuró (ej. `.env.test`).

Confirmado funcionando con `apps/backend/scripts/test-mail.mjs` — el mail principal y la copia oculta llegaron correctamente a destinos distintos.

## Qué más se puede hacer con este dominio

Comprar un dominio no es "una casilla de mail" — es control total sobre los registros DNS de ese nombre. Con `francoorizonte.com` ya pago, se puede usar para mucho más sin costo adicional (los subdominios son gratis, ya están incluidos en la compra del dominio):

### 1. Más subdominios para mail (mismo patrón que ya se hizo)

Si en el futuro hay otro proyecto que necesite mandar mails, no hace falta comprar otro dominio — se verifica otro subdominio en Resend (o el proveedor de mail que sea), por ejemplo `notifications.otroproyecto.francoorizonte.com` o simplemente `mail-otroproyecto.francoorizonte.com`.

### 2. Hosting de sitios web

Se puede apuntar cualquier subdominio a un frontend desplegado (Vercel, Netlify, Railway, un VPS, etc.):
- `francoorizonte.com` (dominio raíz) → un sitio personal, portfolio, landing page.
- `formdynamic.francoorizonte.com` o similar → el frontend de este proyecto, si algún día se despliega a producción.
- `app.francoorizonte.com`, `otroproyecto.francoorizonte.com` → cualquier otra app futura.

Esto se hace agregando un registro `CNAME` (apuntando al proveedor de hosting) o `A`/`AAAA` (apuntando a una IP) en el mismo panel de DNS de Cloudflare que ya se usó para el mail.

### 3. Certificados HTTPS gratis

Cualquier subdominio que se agregue queda automáticamente cubierto por el proxy/CDN de Cloudflare (si se activa "Proxied" en vez de "DNS only" al crear el registro), lo que da HTTPS gratis y protección básica contra ataques, sin configurar nada manualmente.

### 4. Redirecciones

Cloudflare permite reglas simples de "Page Rules" o "Redirect Rules" gratis — por ejemplo, que `www.francoorizonte.com` redirija a `francoorizonte.com`, o que una URL vieja redirija a una nueva.

## Dónde se administra todo

- **DNS/dominio**: panel de Cloudflare → `francoorizonte.com` → **DNS → Records** (registros), **SSL/TLS** (certificados), **Rules** (redirecciones).
- **Envío de mail (app)**: dashboard de Resend → historial de envíos, estado de entrega.
- **Recepción de mail (casillas)**: panel de administración de Zoho Mail (gestión de usuarios) + `mail.zoho.com` o app de Zoho Mail (leer los mails).
