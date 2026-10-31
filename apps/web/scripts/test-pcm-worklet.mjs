import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(appRoot, 'src', 'worklets', 'prismaPcmProcessor.js'), 'utf8');
const frames = [];
let registeredName = '';
let Processor;

class MockAudioWorkletProcessor {
  constructor() {
    this.port = {
      postMessage: (frame) => frames.push(frame),
    };
  }
}

vm.runInNewContext(source, {
  AudioWorkletProcessor: MockAudioWorkletProcessor,
  registerProcessor: (name, processor) => {
    registeredName = name;
    Processor = processor;
  },
  sampleRate: 48_000,
});

assert.equal(registeredName, 'prisma-pcm-capture');
const processor = new Processor();
const input = new Float32Array(4096).fill(0.5);
const outputs = [[new Float32Array(128)]];
processor.process([[input]], outputs);
processor.process([[input]], outputs);

assert.ok(frames.length >= 5, '48 kHz capture should produce 16 kHz 512-sample PCM frames');
for (const frame of frames) assert.equal(frame.byteLength, 1024);
assert.equal(new DataView(frames[0]).getInt16(0, true), 16383, 'PCM samples must be signed 16-bit little-endian');

console.log('PCM worklet check passed: 1,024-byte, 16 kHz mono frames.');
