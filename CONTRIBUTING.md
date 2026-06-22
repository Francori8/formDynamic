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

## Crear un nuevo plugin

1. Identificá el tipo de plugin que necesitás (ver [docs/contracts.md](docs/contracts.md))
2. Si es un plugin puro (validator, field-type, flow): crealo en `packages/plugin-contracts/src/plugins/`
3. Si es un plugin de backend (hook, exporter, access-control): crealo en `apps/backend/src/plugins/<categoria>/<nombre>/`
4. Implementá la interfaz correspondiente
5. Registralo en el registry — es la única línea que tocás fuera de tu carpeta de plugin
6. Agregá tests en `__tests__/` dentro de tu carpeta

**Regla principal: si sentís que necesitás modificar el core para que tu plugin funcione, primero discutí si el contrato necesita extenderse.**

## Convenciones

- Nombres de plugins en kebab-case: `multiple-of`, `individual-link`, `webhook-notifier`
- Cada plugin en su propia carpeta con su propio `index.ts`
- Los plugins puros no pueden importar nada de Nest ni de Next
- Los plugins de backend no pueden importar nada de Next
