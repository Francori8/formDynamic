import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

// e2e real: verificación OTP abierta a nivel formulario, SIN FormLink — cualquiera que
// entra al form público debe identificarse con su email, sin lista de invitados.
// Contraparte de individual-link-otp.e2e-spec.ts (que sí usa un link con emails pre-cargados).
describe('OTP abierto por formulario, sin link (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const owner = { email: `open-otp-owner-${Date.now()}@test.com`, password: 'password123', name: 'Owner' };
  const respondentEmail = `respondente-${Date.now()}@test.com`;

  let ownerToken: string;
  let formId: string;

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
    await prisma.otpCode.deleteMany({ where: { formId } });
    await prisma.form.deleteMany({ where: { id: formId } });
    await prisma.user.deleteMany({ where: { email: owner.email } });
    await app.close();
  });

  it('setup: registra al owner, crea y publica un form con otp-auth activo (sin individual-link)', async () => {
    const registerRes = await request(app.getHttpServer()).post('/api/auth/register').send(owner).expect(201);
    ownerToken = registerRes.body.token;

    const formRes = await request(app.getHttpServer())
      .post('/api/forms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Encuesta con OTP abierto',
        sections: [
          { id: 's1', fields: [{ id: 'f1', type: 'text', label: 'Nombre', required: true, sectionId: 's1', validators: [] }] },
        ],
        pluginConfig: { 'otp-auth': { enabled: true } },
      })
      .expect(201);
    formId = formRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/forms/${formId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);
  });

  it('un visitante anónimo ve requiresOtp: true en la vista pública del form', async () => {
    const res = await request(app.getHttpServer()).get(`/api/forms/${formId}`).expect(200);
    expect(res.body.requiresOtp).toBe(true);
    // sigue sin exponer pluginConfig completo a un visitante anónimo (fix de sesión anterior)
    expect(res.body).not.toHaveProperty('pluginConfig');
  });

  it('responder sin verificación OTP, sin ningún link, es rechazado', async () => {
    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Juan' } })
      .expect(403);
  });

  it('cualquier email (sin lista de invitados) puede pedir el código y responder', async () => {
    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/otp`)
      .send({ email: respondentEmail })
      .expect(201);

    const otp = await prisma.otpCode.findFirst({ where: { formId, email: respondentEmail }, orderBy: { createdAt: 'desc' } });
    expect(otp).not.toBeNull();
    expect(otp!.linkId).toBeNull();

    const res = await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Juan' }, email: respondentEmail, otpToken: otp!.code })
      .expect(201);

    expect(res.body.respondent).toMatchObject({ id: respondentEmail.toLowerCase(), type: 'email', plugin: 'otp-auth' });
  });

  it('el mismo código no se puede reusar', async () => {
    const usedOtp = await prisma.otpCode.findFirst({
      where: { formId, email: respondentEmail },
      orderBy: { createdAt: 'desc' },
    });

    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Otra vez' }, email: respondentEmail, otpToken: usedOtp!.code })
      .expect(403);
  });
});

describe('Form sin otp-auth activado (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const owner = { email: `no-otp-owner-${Date.now()}@test.com`, password: 'password123', name: 'Owner' };
  let ownerToken: string;
  let formId: string;

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
    await prisma.form.deleteMany({ where: { id: formId } });
    await prisma.user.deleteMany({ where: { email: owner.email } });
    await app.close();
  });

  it('sin ningún access-control activado, el form queda sin restricciones (fallback public-link)', async () => {
    const registerRes = await request(app.getHttpServer()).post('/api/auth/register').send(owner).expect(201);
    ownerToken = registerRes.body.token;

    const formRes = await request(app.getHttpServer())
      .post('/api/forms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Encuesta sin restricciones',
        sections: [{ id: 's1', fields: [{ id: 'f1', type: 'text', label: 'Nombre', required: false, sectionId: 's1', validators: [] }] }],
      })
      .expect(201);
    formId = formRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/forms/${formId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const publicView = await request(app.getHttpServer()).get(`/api/forms/${formId}`).expect(200);
    expect(publicView.body.requiresOtp).toBe(false);

    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Juan' } })
      .expect(201);
  });
});
