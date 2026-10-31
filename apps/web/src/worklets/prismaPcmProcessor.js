class PrismaPcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.previousSample = null;
    this.nextSourcePosition = 0;
    this.samplesInFrame = 0;
    this.frame = new DataView(new ArrayBuffer(1024));
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (!input?.length) return true;

    const hasPreviousSample = this.previousSample !== null;
    const source = hasPreviousSample ? new Float32Array(input.length + 1) : input;
    if (hasPreviousSample) {
      source[0] = this.previousSample;
      source.set(input, 1);
    }

    const sourceStep = sampleRate / 16000;
    while (this.nextSourcePosition < source.length - 1) {
      const before = Math.floor(this.nextSourcePosition);
      const fraction = this.nextSourcePosition - before;
      const sample = source[before] * (1 - fraction) + source[before + 1] * fraction;
      const clamped = Math.max(-1, Math.min(1, sample));
      const pcmSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      this.frame.setInt16(this.samplesInFrame * 2, pcmSample, true);
      this.samplesInFrame += 1;
      this.nextSourcePosition += sourceStep;

      if (this.samplesInFrame === 512) {
        const frameBuffer = this.frame.buffer;
        this.port.postMessage(frameBuffer, [frameBuffer]);
        this.frame = new DataView(new ArrayBuffer(1024));
        this.samplesInFrame = 0;
      }
    }

    this.nextSourcePosition -= input.length - (hasPreviousSample ? 0 : 1);
    this.previousSample = input[input.length - 1];
    for (const output of outputs) {
      for (const channel of output) channel.fill(0);
    }
    return true;
  }
}

registerProcessor('prisma-pcm-capture', PrismaPcmProcessor);
