import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

// e2e real contra Postgres en Docker (ver docker-compose.test.yml y scripts/run-e2e.mjs) —
// sin mocks de Prisma. Cubre el flujo completo: registro, login, crear form, publicar,
// responder, y ver las respuestas — incluyendo los fixes de ownership de esta sesión.
describe('Ciclo de vida de un formulario (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const owner = { email: `owner-${Date.now()}@test.com`, password: 'password123', name: 'Owner' };
  const stranger = { email: `stranger-${Date.now()}@test.com`, password: 'password123', name: 'Stranger' };

  let ownerToken: string;
  let strangerToken: string;
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
    // Limpieza — el contenedor de Docker persiste entre corridas (no se recrea cada vez)
    await prisma.response.deleteMany({ where: { formId } });
    await prisma.form.deleteMany({ where: { id: formId } });
    await prisma.user.deleteMany({ where: { email: { in: [owner.email, stranger.email] } } });
    await app.close();
  });

  it('registra al owner y al stranger', async () => {
    const ownerRes = await request(app.getHttpServer()).post('/api/auth/register').send(owner).expect(201);
    ownerToken = ownerRes.body.token;
    expect(ownerToken).toBeDefined();

    const strangerRes = await request(app.getHttpServer()).post('/api/auth/register').send(stranger).expect(201);
    strangerToken = strangerRes.body.token;
    expect(strangerToken).toBeDefined();
  });

  it('el owner crea un formulario en DRAFT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/forms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Encuesta e2e',
        sections: [
          {
            id: 's1',
            fields: [{ id: 'f1', type: 'text', label: 'Nombre', required: true, sectionId: 's1', validators: [{ name: 'required' }] }],
          },
        ],
      })
      .expect(201);

    formId = res.body.id;
    expect(formId).toBeDefined();
  });

  it('un visitante anónimo no ve pluginConfig ni ownerId en el form (fix de esta sesión)', async () => {
    const res = await request(app.getHttpServer()).get(`/api/forms/${formId}`).expect(200);
    expect(res.body).not.toHaveProperty('ownerId');
    expect(res.body).not.toHaveProperty('pluginConfig');
  });

  it('el owner sí ve pluginConfig y ownerId en su propio form', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/forms/${formId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('ownerId');
    expect(res.body).toHaveProperty('pluginConfig');
  });

  it('no se puede responder un form en DRAFT', async () => {
    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Juan' } })
      .expect(400);
  });

  it('el owner publica el formulario', async () => {
    await request(app.getHttpServer())
      .patch(`/api/forms/${formId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);
  });

  it('un stranger no puede publicar/modificar el form ajeno', async () => {
    await request(app.getHttpServer())
      .patch(`/api/forms/${formId}/status`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ status: 'CLOSED' })
      .expect(400);
  });

  it('cualquiera puede responder el form publicado', async () => {
    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Juan' } })
      .expect(201);
  });

  it('una respuesta sin el campo requerido es rechazada', async () => {
    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: {} })
      .expect(400);
  });

  it('un stranger no puede ver las respuestas del form ajeno (fix de esta sesión)', async () => {
    await request(app.getHttpServer())
      .get(`/api/forms/${formId}/responses`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it('sin token, ver respuestas devuelve 401 (fix de esta sesión)', async () => {
    await request(app.getHttpServer()).get(`/api/forms/${formId}/responses`).expect(401);
  });

  it('el owner ve las respuestas de su form', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/forms/${formId}/responses`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.responses).toHaveLength(1);
    expect(res.body.responses[0].answers.f1).toBe('Juan');
  });
});
