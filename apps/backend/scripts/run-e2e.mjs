// Orquesta los tests e2e: levanta Postgres de test en Docker si no está corriendo,
// espera a que esté healthy, aplica migraciones, corre Jest e2e, y deja el contenedor arriba
// (se reutiliza en la próxima corrida — usar `docker compose -f docker-compose.test.yml down` para bajarlo).
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const backendDir = resolve(__dirname, '..');

const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/formdynamic_test?schema=public';

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('→ Levantando Postgres de test (docker compose)...');
run('docker', ['compose', '-f', 'docker-compose.test.yml', 'up', '-d', '--wait'], { cwd: repoRoot });

console.log('→ Aplicando migraciones a la base de test...');
run('npx', ['prisma', 'migrate', 'deploy'], {
  cwd: backendDir,
  env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
});

console.log('→ Corriendo tests e2e...');
run('npx', ['jest', '--config', './test/jest-e2e.json'], { cwd: backendDir });
