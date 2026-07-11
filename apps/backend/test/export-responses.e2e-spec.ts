import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

// e2e real del export CSV/JSON — incluye una respuesta con coma y comillas en el
// texto a propósito, el mismo edge case que destapó el bug de doble escapado en
// csv.exporter.ts (ver csv.exporter.spec.ts).
describe('Exportar respuestas (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const owner = { email: `export-owner-${Date.now()}@test.com`, password: 'password123', name: 'Owner' };
  const stranger = { email: `export-stranger-${Date.now()}@test.com`, password: 'password123', name: 'Stranger' };

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
    await prisma.response.deleteMany({ where: { formId } });
    await prisma.form.deleteMany({ where: { id: formId } });
    await prisma.user.deleteMany({ where: { email: { in: [owner.email, stranger.email] } } });
    await app.close();
  });

  it('setup: registra al owner y al stranger, crea form publicado con una respuesta con comas y comillas', async () => {
    const ownerRes = await request(app.getHttpServer()).post('/api/auth/register').send(owner).expect(201);
    ownerToken = ownerRes.body.token;
    const strangerRes = await request(app.getHttpServer()).post('/api/auth/register').send(stranger).expect(201);
    strangerToken = strangerRes.body.token;

    const formRes = await request(app.getHttpServer())
      .post('/api/forms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Encuesta export',
        sections: [{ id: 's1', fields: [{ id: 'f1', type: 'text', label: 'Comentario', required: false, sectionId: 's1', validators: [] }] }],
      })
      .expect(201);
    formId = formRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/forms/${formId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/forms/${formId}/responses`)
      .send({ answers: { f1: 'Hola, dijo "buen día"' } })
      .expect(201);
  });

  it('un stranger no puede exportar el form ajeno', async () => {
    await request(app.getHttpServer())
      .get(`/api/forms/${formId}/responses/export/csv`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it('sin token, exportar devuelve 401', async () => {
    await request(app.getHttpServer()).get(`/api/forms/${formId}/responses/export/csv`).expect(401);
  });

  it('el owner exporta a CSV con el escapado correcto (comas y comillas)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/forms/${formId}/responses/export/csv`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const lines = (res.text as string).trim().split('\n');
    expect(lines[0]).toBe('ID respuesta,Fecha,Comentario');
    // una sola celda escapada, no doble-escapada — el bug que encontramos con mocks
    expect(lines[1]).toContain('"Hola, dijo ""buen día"""');
  });

  it('el owner exporta a JSON', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/forms/${formId}/responses/export/json`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const data = JSON.parse(res.text);
    expect(data[0].Comentario).toBe('Hola, dijo "buen día"');
  });
});
