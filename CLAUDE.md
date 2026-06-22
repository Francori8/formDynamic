
# FormDynamic — Contexto para Claude

## Que es este proyecto

Sistema de formularios dinámicos (estilo Google Forms) con **arquitectura de plugins en el backend** como principio central.

## Arquitectura de plugins — SIEMPRE respetar esto

### Reglas que nunca se rompen

1. **El core no importa plugins directamente.** Solo conoce sus contratos (interfaces).
2. **Para agregar cualquier nueva capacidad** — tipo de campo, validador, exportador, notificador: se crea un plugin nuevo, nunca se toca el core.
3. **Cada plugin es autocontenido** — su propia carpeta, config, tests.
4. **Los plugins no dependen entre sí directamente.** Toda comunicación inter-plugin va por el core.
5. **El plugin registry es el único punto de registro.** No hay listas hardcodeadas en la lógica de negocio.

### Tipos de plugins y dónde corren

| Plugin | Corre en | Cuándo actúa |
|--------|----------|--------------|
| `field-type` | Frontend + Backend | Al renderizar el form |
| `validator` | Frontend + Backend | Al validar cada campo |
| `field-visibility` | Frontend + Backend | Al cambiar cualquier respuesta |
| `section-flow` | Frontend + Backend | Al avanzar entre secciones |
| `access-control` | Backend | Al intentar abrir/responder el form |
| `response-hook` | Backend | Al guardar una respuesta |
| `exporter` | Backend | On-demand al exportar |
| `autocomplete` | Backend | Al escribir en campo con autocomplete |

Los plugins puros (primeros 4) viven en `packages/plugin-contracts/` — no pueden importar Nest ni Next.
Los plugins de backend viven en `apps/backend/src/plugins/`.

### Cuando el usuario pide agregar algo nuevo

- ¿Es comportamiento nuevo? → nuevo plugin
- ¿Los contratos no alcanzan? → proponer extensión de contrato, discutir antes de implementar
- ¿Sentís que hay que tocar el core? → probablemente hay que extender el contrato, no bypassearlo

## Stack

- **Backend:** NestJS + TypeScript
- **Frontend:** Next.js + TypeScript
- **BD:** PostgreSQL con jsonb
- **ORM:** Prisma
- **Monorepo:** Turborepo + pnpm

## Estructura

```
FormDynamic/
├── apps/
│   ├── backend/              ← NestJS
│   └── frontend/             ← Next.js
├── packages/
│   └── plugin-contracts/     ← interfaces y lógica pura compartida
├── docs/
│   ├── contracts.md          ← contratos completos de cada plugin
│   └── decisions.md          ← decisiones técnicas y por qué
├── turbo.json
└── pnpm-workspace.yaml
```

## Modelo de datos clave

- Los formularios tienen secciones: `Form → Sections → Fields`
- La configuración de plugins por usuario/form se persiste en BD
- Los plugins que necesitan persistir datos usan un `PluginStore` provisto por el core

## Documentación

- Contratos completos: `docs/contracts.md`
- Decisiones técnicas: `docs/decisions.md`
- Setup y comandos: `CONTRIBUTING.md`
