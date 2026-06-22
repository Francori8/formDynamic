# Decisiones Técnicas

Registro de decisiones de arquitectura y por qué se tomaron. Antes de cambiar algo de esto, leer el razonamiento.

---

## Stack

### NestJS + Next.js + TypeScript

**Decisión:** Backend en NestJS, frontend en Next.js, todo TypeScript.

**Por qué:**
- NestJS tiene un sistema de módulos que es naturalmente compatible con arquitectura de plugins — cada plugin es un módulo autocontenido que se registra en el módulo raíz
- El equipo ya conoce el stack, lo que permite concentrar la energía en diseñar bien la arquitectura de plugins en lugar de aprender sintaxis
- TypeScript permite definir contratos de plugins como interfaces, lo que el compilador verifica en tiempo de build

**Alternativas descartadas:**
- Go — bueno para concurrencia real, pero este dominio no tiene ese problema. Responses a un form son requests HTTP independientes sin estado compartido, no hay concurrencia real. La curva de aprendizaje no se justifica.

---

### PostgreSQL + jsonb

**Decisión:** Una sola base de datos, PostgreSQL, usando jsonb para las partes variables.

**Por qué:**
- Los formularios parecen schema-less pero en realidad tienen estructura relacional clara: Form → Sections → Fields, Form → Responses → Answers
- PostgreSQL con jsonb da flexibilidad donde varía (configuración de campos, valores de respuestas) y estructura donde importa (foreign keys, transactions, queries relacionales)
- Una sola BD simplifica el setup, el deploy, y el modelo mental del proyecto

**Alternativas descartadas:**
- MongoDB — intuitivo para forms dinámicos pero pierde las ventajas relacionales. Queries entre forms y responses con filtros complejos son más difíciles. Transactions al guardar respuestas multi-campo son más frágiles.
- MongoDB + PostgreSQL — dos bases de datos para un proyecto que arranca es complejidad innecesaria.

**Cuándo podría cambiar:** Si hay necesidad de caché de forms publicados (Redis), logs de eventos a gran escala (Mongo), o analytics pesados (ClickHouse). Nada de eso es prioritario ahora.

---

### Prisma como ORM

**Decisión:** Prisma para acceso a base de datos.

**Por qué:**
- Schema tipado que el compilador verifica
- Migraciones con control de versiones
- Encaja bien con TypeScript y NestJS

---

## Arquitectura

### Monorepo con Turborepo + pnpm

**Decisión:** Un solo repositorio con Turborepo como task runner y pnpm como package manager.

**Por qué:**
- Los plugins puros (validators, field-visibility, section-flow, field-type) necesitan correr en frontend y backend. Sin monorepo, la lógica se duplica o se diverge.
- Turborepo maneja el orden de build automáticamente según dependencias entre paquetes.
- pnpm es más eficiente en espacio y velocidad que npm para monorepos.

**Alternativa descartada — schema-driven validation:**
- Idea: el backend devuelve los validadores como datos (JSON) y el frontend tiene un intérprete fijo que los ejecuta.
- Problema: el frontend igual necesita conocer todos los validadores posibles para interpretarlos. Cuando se agrega un plugin nuevo en el backend, hay que agregar su implementación en el frontend también. Es la misma duplicación, pero implícita y más difícil de detectar.
- El monorepo hace ese acoplamiento explícito y verificable por el compilador.

---

### Plugins como código, configuración en BD

**Decisión:** Los plugins son módulos de código que se registran al bootear. La configuración de qué plugins tiene activo cada usuario/formulario se persiste en PostgreSQL.

**Por qué:**
- Plugins dinámicos (cargar código en runtime desde BD) son extremadamente complejos y fuente de bugs difíciles de debuggear.
- El modelo "plugins en código + config en BD" da toda la flexibilidad que se necesita: el administrador agrega un plugin al sistema deployando código, el usuario activa/configura ese plugin desde la UI sin tocar código.

**Schema de persistencia:**

La configuración de plugins se guarda en la columna `pluginConfig Json?` del modelo `Form`. Es un objeto plano donde cada clave es el nombre del plugin y el valor es su configuración:

```json
{
  "webhook": { "url": "https://..." }
}
```

Esta decisión se eligió sobre tablas normalizadas (`plugins`, `user_plugins`, `form_plugins`) porque el dominio de configuración de plugins es inherentemente variable — forzar normalización agrega complejidad sin beneficio real para esta escala.

---

### Formularios con secciones

**Decisión:** Los formularios tienen secciones. La estructura es `Form → Sections → Fields`, no `Form → Fields`.

**Por qué:**
- Los plugins de flujo (`section-flow`, `field-visibility`) necesitan secciones para funcionar.
- Permite flujos condicionales: "si respondió X, saltar a sección Y".
- Es más expresivo para formularios largos o complejos.

---

### PluginStore para persistencia de plugins

**Decisión:** Los plugins que necesitan persistir datos (ej: OTP para `individual-link`) no acceden directamente a la BD. El core les provee un `PluginStore` genérico.

```typescript
interface PluginStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
```

**Por qué:**
- Mantiene el plugin autocontenido — no sabe si por debajo hay Redis, PostgreSQL o memoria.
- El core controla la infraestructura, el plugin solo usa la abstracción.

---

### Ciclo de vida de formularios: DRAFT → PUBLISHED → CLOSED

**Decisión:** Los formularios tienen tres estados y las transiciones son unidireccionales.

**Por qué:**
- Un formulario DRAFT no acepta respuestas — permite iterar el diseño sin contaminar los datos.
- La transición es irreversible hacia adelante para evitar inconsistencias: no se puede volver a DRAFT un formulario que ya recibió respuestas, ni reabrir uno cerrado.
- El estado se guarda en `Form.status String @default("DRAFT")` — simple, consultable con índice, sin tablas de estado separadas.

---

### Auth con JWT

**Decisión:** Autenticación propia con JWT + bcrypt, sin OAuth ni sesiones de servidor.

**Por qué:**
- Simple de implementar y de entender. No hay dependencia de un proveedor externo.
- JWT stateless: el backend no guarda sesiones, escala horizontalmente sin cambios.
- El token se guarda en `localStorage` en el frontend — aceptable para esta etapa. Si se necesita más seguridad, se migra a httpOnly cookies sin cambios en la arquitectura.

**Variables de entorno requeridas:** `JWT_SECRET` — debe ser una clave aleatoria larga en producción.

---

## Lo que se dejó afuera (por ahora)

- **Plugins externos / marketplace** — que terceros escriban plugins agrega complejidad de sandboxing, versionado y seguridad. No es el objetivo inicial.
- **Dynamic plugin loading** — activar plugins sin reiniciar el servidor. El modelo actual requiere un redeploy para agregar un plugin nuevo. Aceptable para esta etapa.
- **Librería pública** — extraer el core como librería npm es una consecuencia natural de un buen diseño, no un objetivo inicial. Si los contratos están bien definidos, hacerlo después es casi automático.
