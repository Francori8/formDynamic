# Contribuir a FormDynamic

## Requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

Instalar pnpm si no lo tenés:
```bash
npm install -g pnpm
```

## Setup inicial

```bash
# Clonar el repo
git clone <repo-url>
cd FormDynamic

# Instalar dependencias de todos los paquetes
pnpm install

# Copiar variables de entorno y completar JWT_SECRET
cp apps/backend/.env.example apps/backend/.env

# Correr migraciones de BD
pnpm --filter backend prisma migrate dev
```

> **Nota sobre Prisma CLI:** El proyecto usa `prisma.config.ts` en ESM pero la CLI de Prisma espera CJS. Si `prisma generate` o `prisma migrate` falla con un error de parsing, renombrá el archivo temporalmente:
> ```bash
> mv apps/backend/prisma.config.js apps/backend/prisma.config.js.bak
> npx prisma generate
> mv apps/backend/prisma.config.js.bak apps/backend/prisma.config.js
> ```

## Levantar en desarrollo

```bash
# Levanta backend y frontend en paralelo
pnpm dev
```

Esto corre `turbo dev` que:
1. Buildea `plugin-contracts` primero
2. Levanta backend (puerto 3001) y frontend (puerto 3000) en paralelo

## Comandos disponibles

```bash
pnpm dev          # desarrollo — todos los servicios
pnpm build        # build de producción
pnpm test         # tests en todos los paquetes
pnpm lint         # lint en todos los paquetes
```

También podés correr comandos en un paquete específico:

```bash
pnpm --filter backend dev
pnpm --filter frontend dev
pnpm --filter plugin-contracts build
```

## Tests

`pnpm test` desde la raíz corre los tests de todos los paquetes vía Turborepo. Hoy hay dos runners distintos:

- **`packages/plugin-contracts`** — Vitest. Cubre la lógica pura de condicionales (`evaluateCondition`, visibilidad, flujo de secciones).
- **`apps/backend`** — Jest. Cubre servicios del core (`FormsService`, `ResponsesService`, `PluginRegistryService`) y cada plugin de backend, con `PrismaService`/`MailerService` mockeados a mano (sin librería de mocking de Prisma).

Para correr solo el backend:
```bash
cd apps/backend
npx jest              # toda la suite
npx jest forms.service   # filtra por nombre de archivo
```

Para correr solo `plugin-contracts`:
```bash
cd packages/plugin-contracts
npx vitest run
```

**Importante — estos son tests unitarios con mocks, no reemplazan e2e.** Los mocks de Prisma validan la lógica de negocio (ownership, transiciones de estado, validaciones) pero no detectan problemas reales de query, schema, o integración con Postgres.

### Tests e2e (contra Postgres real, sin mocks)

```bash
pnpm test:e2e
```

Esto orquesta todo automáticamente (`apps/backend/scripts/run-e2e.mjs`):
1. Levanta Postgres en Docker (`docker-compose.test.yml`, puerto **5433** — distinto al 5432 de desarrollo para no pisar tu BD local; datos en `tmpfs`, se descartan al bajar el contenedor).
2. Aplica las migraciones de Prisma contra esa base (`prisma migrate deploy`).
3. Corre los specs `test/*.e2e-spec.ts` con Jest (config en `test/jest-e2e.json`), levantando la app real (`AppModule` completo, sin mocks) contra esa base.

El contenedor queda arriba entre corridas (se reutiliza, no se recrea cada vez). Para bajarlo manualmente:
```bash
docker compose -f docker-compose.test.yml down
```

Requiere Docker Desktop corriendo. Las credenciales de test están en `apps/backend/.env.test` (sin secretos reales — se versiona).

### Correr todo junto

```bash
pnpm test:all   # unitarios (todos los paquetes) + e2e, en secuencia
```

### Convención al agregar tests de un plugin

Cada plugin tiene su `.spec.ts` (Jest) al lado del archivo del plugin, no en un directorio centralizado — coherente con "cada plugin es autocontenido". Ejemplo: `apps/backend/src/plugins/access-control/otp-auth.plugin.ts` → `otp-auth.plugin.spec.ts` en la misma carpeta.

## Crear un nuevo plugin

1. Identificá el tipo de plugin que necesitás (ver [docs/contracts.md](docs/contracts.md))
2. Si es un plugin puro (validator, field-type, flow): crealo en `packages/plugin-contracts/src/plugins/`
3. Si es un plugin de backend (hook, exporter, access-control): crealo en `apps/backend/src/plugins/<categoria>/<nombre>/`
4. Implementá la interfaz correspondiente
5. Registralo en el registry — es la única línea que tocás fuera de tu carpeta de plugin
6. Agregá un `.spec.ts` al lado del archivo del plugin (ver sección [Tests](#tests))

**Regla principal: si sentís que necesitás modificar el core para que tu plugin funcione, primero discutí si el contrato necesita extenderse.**

## Convenciones

- Nombres de plugins en kebab-case: `multiple-of`, `individual-link`, `webhook-notifier`
- Cada plugin en su propia carpeta con su propio `index.ts`
- Los plugins puros no pueden importar nada de Nest ni de Next
- Los plugins de backend no pueden importar nada de Next
