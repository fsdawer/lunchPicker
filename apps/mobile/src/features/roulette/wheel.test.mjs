import assert from 'node:assert/strict';
import test from 'node:test';
import { nextRotation, sectorPath } from './wheel.ts';

test('chosen sector lands under the top pointer for every supported candidate count', () => {
  for (let count = 2; count <= 8; count++) {
    for (let index = 0; index < count; index++) {
      const rotation = nextRotation(137, index, count);
      const center = -90 + ((index + 0.5) * 360) / count;
      assert.ok(rotation > 137);
      assert.ok(Math.abs(((center + rotation) % 360 + 360) % 360 - 270) < 0.00001);
      assert.ok(sectorPath(index, count).startsWith('M 150 150 L '));
    }
  }
});
