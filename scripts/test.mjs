// Compila lib/ y tests/ a un directorio temporal y lanza el runner de Node.
//
// Se compila en vez de usar el type stripping de Node porque los módulos de
// lib/ se importan entre sí sin extensión (como espera el bundler de Next) y
// el resolutor de ESM de Node exige la extensión.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const OUT = '.tmp/test';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const sources = [
  ...readdirSync('lib').filter((f) => f.endsWith('.ts')).map((f) => join('lib', f)),
  ...readdirSync('tests').filter((f) => f.endsWith('.ts')).map((f) => join('tests', f)),
];

try {
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsc', ...sources, '--module', 'commonjs', '--target', 'ES2022',
      '--moduleResolution', 'node', '--esModuleInterop', '--skipLibCheck',
      '--strict', '--outDir', OUT],
    { stdio: 'inherit' },
  );
} catch {
  console.error('\nLa compilación de las pruebas falló.');
  process.exit(1);
}

const compiled = readdirSync(join(OUT, 'tests')).filter((f) => f.endsWith('.test.js'));
if (!compiled.length) {
  console.error('No se encontró ninguna prueba compilada.');
  process.exit(1);
}

try {
  execFileSync(process.execPath, ['--test', ...compiled.map((f) => join(OUT, 'tests', f))], {
    stdio: 'inherit',
  });
} catch {
  process.exit(1);
}
