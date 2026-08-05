// Prueba manual de envío real via Resend. Uso: node scripts/test-mail.mjs tu@email.com
// Requiere RESEND_API_KEY en .env — si no está, MailerService cae al logger y no manda nada real.
import 'dotenv/config';
import { Resend } from 'resend';

const to = process.argv[2];
if (!to) {
  console.error('Uso: node scripts/test-mail.mjs tu@email.com');
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
const bcc = process.env.RESEND_BCC;

if (!apiKey) {
  console.log('No hay RESEND_API_KEY en .env — MailerService caería al logger, no se manda nada real.');
  process.exit(1);
}

// Mismo layout que apps/backend/src/core/mailer/email-template.ts — duplicado a mano acá
// porque este script es .mjs plano y ese archivo es .ts. Si el template cambia, actualizar ambos.
function renderEmail(title, bodyHtml) {
  return `
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
  <div style="background: #4f46e5; padding: 1.5rem 2rem; border-radius: 8px 8px 0 0;">
    <span style="color: #fff; font-size: 1.1rem; font-weight: 700;">FormDynamic</span>
  </div>
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 2rem; border-radius: 0 0 8px 8px;">
    <h1 style="font-size: 1.1rem; margin: 0 0 1rem;">${title}</h1>
    ${bodyHtml}
  </div>
  <p style="font-size: 0.75rem; color: #9ca3af; text-align: center; margin-top: 1rem;">
    Este es un mail automático de FormDynamic — no respondas a esta dirección.
  </p>
</div>`.trim();
}

const resend = new Resend(apiKey);
const result = await resend.emails.send({
  from,
  to,
  subject: 'FormDynamic — prueba de MailerService',
  html: renderEmail('Prueba de template', '<p>Si ves esto con el layout de marca (header morado, footer), el template compartido está andando bien.</p>'),
  ...(bcc ? { bcc } : {}),
});

if (result.error) {
  console.error('Resend devolvió un error:', JSON.stringify(result.error, null, 2));
  process.exit(1);
}

console.log('Mail enviado. ID de Resend:', result.data?.id);
console.log(`Revisá la bandeja de ${to} (y la carpeta de spam).`);
if (bcc) console.log(`También debería haber llegado copia oculta a ${bcc}.`);
