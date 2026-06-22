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
- PostgreSQL con Prisma — tablas: `users`, `forms`, `responses`, `form_links`, `form_link_emails`, `otp_codes`
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
- `otp-auth` — verificación de identidad via código de 6 dígitos enviado al email (por ahora se loguea en consola)
- `csv` / `json` — exportadores de respuestas

**Links individuales**
- Un formulario puede tener múltiples links (`/l/:token`)
- Cada link tiene etiqueta, límite de respuestas y lista de emails permitidos
- Flujo del respondente: email → OTP → formulario → envío
- La respuesta queda asociada al email verificado (`respondent` en la BD)
- Tab "Links" en la página de edición para gestionar links, copiar URL y configurar emails

### Lo que falta

1. **Envío real de emails para OTP** — hay un `TODO` en `otp-auth.plugin.ts` donde conectar Resend, Nodemailer u otro servicio SMTP. Hoy el código se loguea en consola.

2. **Carga de emails existentes en la UI** — al abrir el panel de emails de un link, el textarea empieza vacío aunque ya haya emails guardados. Falta cargar los emails actuales desde la BD al expandir el link.

3. **Página de respuestas con respondent** — la tabla de respuestas en `/forms/:id/responses` no muestra quién respondió. Con el campo `respondent` ahora disponible, se puede agregar esa columna.

4. **Visibilidad condicional de campos** — el contrato `FieldVisibilityPlugin` existe pero no hay plugins implementados ni UI para configurar condiciones.

5. **Flujo de secciones condicional** — el contrato `SectionFlowPlugin` existe pero no está implementado.

6. **Autocomplete** — el contrato `AutocompletePlugin` existe pero no hay plugins ni UI.

## Levantar el proyecto

Ver [CONTRIBUTING.md](CONTRIBUTING.md).
