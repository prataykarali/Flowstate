import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('PrismLab S0 Model Registry Validation', () => {
  const modelsTsPath = resolve(__dirname, '../src/data/models.ts');
  const fileContent = readFileSync(modelsTsPath, 'utf-8');

  test('contains all six canonical model keys', () => {
    const requiredKeys = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
    for (const key of requiredKeys) {
      assert.ok(
        fileContent.includes(`${key}: {`),
        `Expected canonical key '${key}' in models.ts`
      );
    }
  });

  test('maps correct accessories to canonical models', () => {
    assert.ok(fileContent.includes("accessories: ['glasses']"), 'vision model must have glasses');
    assert.ok(fileContent.includes("accessories: ['headphones']"), 'audio model must have headphones');
    assert.ok(fileContent.includes("accessories: ['glasses', 'headphones']"), 'omni model must have glasses and headphones');
    assert.ok(fileContent.includes("accessories: ['monocle', 'prism']"), 'd1 model must have monocle and prism');
    assert.ok(fileContent.includes("accessories: ['hat', 'magnifier']"), 'd1_omni model must have hat and magnifier');
  });

  test('maps distinct character slugs', () => {
    const slugs = ['lfm3-17b', 'lfm3-vl-2b', 'lfm3-audio-2b', 'lfm3-omni-2b', 'd1-2b', 'd1-omni-2b'];
    for (const slug of slugs) {
      assert.ok(fileContent.includes(`characterSlug: '${slug}'`), `Expected slug '${slug}'`);
    }
  });
});

describe('PrismLab S0 Routing Validation', () => {
  const routesTsPath = resolve(__dirname, '../src/app/routes.ts');
  const fileContent = readFileSync(routesTsPath, 'utf-8');

  test('defines all nine navigation routes', () => {
    const expectedRoutes = [
      'world',
      'playground',
      'chat',
      'trivia',
      'arcade',
      'research',
      'architecture',
      'championship',
      'settings'
    ];

    for (const route of expectedRoutes) {
      assert.ok(
        fileContent.includes(`id: '${route}'`),
        `Expected route '${route}' in routes.ts`
      );
    }
  });
});
