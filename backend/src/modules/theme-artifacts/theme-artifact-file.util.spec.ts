import { Readable } from 'node:stream';
import { sha256Stream } from './theme-artifact-file.util';

describe('theme artifact integrity helpers', () => {
  it('computes SHA-256 incrementally from a stream', async () => {
    await expect(
      sha256Stream(Readable.from([Buffer.from('abc')])),
    ).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
