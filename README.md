# FormDynamic

Sistema de formularios dinámicos con arquitectura de plugins — similar a Google Forms pero extensible por diseño.

## Que es

FormDynamic permite crear formularios con campos configurables, enviarlos por link o mail, y ver las respuestas. La diferencia central es que **cada capacidad extra es un plugin independiente** — el core no conoce los detalles de ninguno.

## Arquitectura

```
core/          → forms, responses, users, form-links, plugin registry
plugins/       → todo lo extensible: validators, field-types, hooks, exporters, access-control
packages/      → lógica pura compartida entre backend y frontend
```

Ver [docs/contracts.md](docs/contracts.md) para los contratos de cada tipo de plugin.
Ver [docs/decisions.md](docs/decisions.md) para las decisiones técnicas y por qué.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript |
| Base de datos | PostgreSQL (con jsonb) |
| ORM | Prisma |
| Monorepo | Turborepo + pnpm |

## Estructura del monorepo

```
FormDynamic/
├── apps/
│   ├── backend/              ← NestJS
│   └── frontend/             ← Next.js
├── packages/
│   └── plugin-contracts/     ← interfaces y lógica pura compartida
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Estado del proyecto

### Lo que está funcionando

**Infraestructura**
- Monorepo con Turborepo + pnpm
- Backend NestJS (puerto 3001) con prefijo global `/api`
- Frontend Next.js (puerto 3000)
- PostgreSQL con Prisma — tablas: `users`, `forms`, `responses`, `form_links`, `form_link_emails`, `otp_codes` (con cascada completa en todas las tablas hijas de `form_links`)
- Plugin registry con soporte para 8 tipos de plugin

**Auth**
- Registro y login con bcrypt + JWT
- Guardia JWT para rutas protegidas
- UI de login (`/login`) y registro (`/register`)

**Formularios**
- Crear formularios con múltiples secciones (drag & drop con DnD Kit)
- Tipos de campo: texto, número, email, teléfono, select, multi-select
- Validadores configurables por campo: required, min, max, min-length, max-length, regex
- Editor de validadores en el builder con badges visuales
- Estados de formulario: DRAFT → PUBLISHED → CLOSED
- Edición de formularios publicados

**Respuestas**
- Renderer para completar formularios públicos (`/forms/:id`)
- Validación en backend via plugins
- Vista de respuestas con labels de campos (`/forms/:id/responses`)
- Exportación CSV y JSON

**Plugins de backend**
- `webhook` — notificación POST a URL externa al recibir respuesta
- `public-link` — acceso libre (comportamiento por defecto)
- `individual-link` — acceso restringido a emails permitidos por link, con límite de respuestas
- `otp-auth` — verificación de identidad via código de 6 dígitos enviado al email. Usa Resend — funciona con `RESEND_API_KEY` en el `.env`, sin la key loguea en consola
- `csv` / `json` — exportadores de respuestas

**Links individuales**
- Un formulario puede tener múltiples links (`/l/:token`)
- Cada link tiene etiqueta, límite de respuestas y lista de emails permitidos
- Flujo del respondente: email → OTP → formulario → envío
- La respuesta queda asociada al email verificado (`respondent` en la BD)
- Tab "Links" en la página de edición para gestionar links, copiar URL y configurar emails

**Condicionales (builder + renderer)**
- Visibilidad condicional por campo — panel "Mostrar solo si..." en el editor de cada campo, con operadores eq/neq/gt/lt/contains/vacío
- Flujo condicional por sección — reglas "Si [campo] [operador] [valor] → ir a [sección]" con salto por defecto configurable
- El renderer evalúa ambos con `defaultVisibilityPlugin` y `defaultSectionFlowPlugin` de `packages/plugin-contracts`
- Las condiciones a medio configurar o con secciones borradas se descartan al guardar

### Lo que falta

1. **Autocomplete** — no existe contrato ni implementación.

2. **Testing end-to-end de los condicionales** — la UI de visibilidad y flujo está implementada pero falta probarla a fondo en navegador.

## Levantar el proyecto

Ver [CONTRIBUTING.md](CONTRIBUTING.md).
