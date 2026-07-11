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

if (!apiKey) {
  console.log('No hay RESEND_API_KEY en .env — MailerService caería al logger, no se manda nada real.');
  process.exit(1);
}

const resend = new Resend(apiKey);
const result = await resend.emails.send({
  from,
  to,
  subject: 'FormDynamic — prueba de MailerService',
  html: '<p>Si ves esto, Resend está andando bien con la config actual.</p>',
});

if (result.error) {
  console.error('Resend devolvió un error:', JSON.stringify(result.error, null, 2));
  process.exit(1);
}

console.log('Mail enviado. ID de Resend:', result.data?.id);
console.log(`Revisá la bandeja de ${to} (y la carpeta de spam).`);
