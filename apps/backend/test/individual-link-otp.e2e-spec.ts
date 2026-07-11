import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

// e2e real: link individual + verificación OTP, de punta a punta contra Postgres real.
// No hay RESEND_API_KEY en .env.test, así que el código OTP no se manda por mail —
// se lee directo de la tabla otp_codes, igual que haría un test end-to-end con un
// proveedor de mail de prueba interceptando el envío.
describe('Link individual con OTP (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const owner = { email: `link-owner-${Date.now()}@test.com`, password: 'password123', name: 'Owner' };
  const allowedEmail = `invitado-${Date.now()}@test.com`;
  const strangerEmail = `no-invitado-${Date.now()}@test.com`;

  let ownerToken: string;
  let formId: string;
  let linkId: string;
  let linkToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.response.deleteMany({ where: { formId } });
    await prisma.otpCode.deleteMany({ where: { linkId } });
    await prisma.formLinkEmail.deleteMany({ where: { linkId } });
    await prisma.formLink.deleteMany({ where: { id: linkId } });
    await prisma.form.deleteMany({ where: { id: formId } });
    await prisma.user.deleteMany({ where: { email: owner.email } });
    await app.close();
  });

  it('setup: registra al owner, crea y publica un form con individual-link activo', async () => {
    const registerRes = await request(app.getHttpServer()).post('/api/auth/register').send(owner).expect(201);
    ownerToken = registerRes.body.token;

    const formRes = await request(app.getHttpServer())
      .post('/api/forms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Encuesta con link individual',
        sections: [
          { id: 's1', fields: [{ id: 'f1', type: 'text', label: 'Nombre', required: true, sectionId: 's1', validators: [] }] },
        ],
        pluginConfig: { 'individual-link': { enabled: true } },
      })
      .expect(201);
    formId = formRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/forms/${formId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const linkRes = await request(app.getHttpServer())
      .post(`/api/forms/${formId}/links`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Equipo ventas' })
      .expect(201);
    linkId = linkRes.body.id;
    linkToken = linkRes.body.token;

    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/links/${linkId}/emails`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ emails: [allowedEmail] })
      .expect(201);
  });

  it('cualquiera puede resolver el link público por token', async () => {
    const res = await request(app.getHttpServer()).get(`/api/l/${linkToken}`).expect(200);
    expect(res.body.id).toBe(linkId);
  });

  it('responder sin verificación OTP es rechazado', async () => {
    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Juan' }, linkToken })
      .expect(403);
  });

  it('un email no invitado no puede completar la verificación OTP', async () => {
    await request(app.getHttpServer())
      .post('/api/l/otp')
      .send({ linkId, email: strangerEmail })
      .expect(201);

    const otp = await prisma.otpCode.findFirst({ where: { linkId, email: strangerEmail }, orderBy: { createdAt: 'desc' } });
    expect(otp).not.toBeNull();

    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Juan' }, linkToken, email: strangerEmail, otpToken: otp!.code })
      .expect(403);
  });

  it('el email invitado puede pedir OTP, verificarse y responder', async () => {
    await request(app.getHttpServer())
      .post('/api/l/otp')
      .send({ linkId, email: allowedEmail })
      .expect(201);

    const otp = await prisma.otpCode.findFirst({ where: { linkId, email: allowedEmail }, orderBy: { createdAt: 'desc' } });
    expect(otp).not.toBeNull();

    const res = await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Juan' }, linkToken, email: allowedEmail, otpToken: otp!.code })
      .expect(201);

    expect(res.body.respondent).toMatchObject({ id: allowedEmail.toLowerCase(), type: 'email' });
  });

  it('el mismo código OTP no se puede reusar', async () => {
    const usedOtp = await prisma.otpCode.findFirst({
      where: { linkId, email: allowedEmail },
      orderBy: { createdAt: 'desc' },
    });

    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Otra vez' }, linkToken, email: allowedEmail, otpToken: usedOtp!.code })
      .expect(403);
  });
});
