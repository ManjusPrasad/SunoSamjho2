export const encodeMonoWav = (audioBuffer: AudioBuffer, targetSampleRate = 16000): Blob => {
  const input = audioBuffer.getChannelData(0);
  const outputLength = Math.max(1, Math.floor(input.length * targetSampleRate / audioBuffer.sampleRate));
  const buffer = new ArrayBuffer(44 + outputLength * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + outputLength * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, outputLength * 2, true);

  for (let index = 0; index < outputLength; index++) {
    const position = index * audioBuffer.sampleRate / targetSampleRate;
    const before = Math.floor(position);
    const after = Math.min(before + 1, input.length - 1);
    const fraction = position - before;
    const sample = Math.max(-1, Math.min(1, input[before] * (1 - fraction) + input[after] * fraction));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

export async function playWavBase64(context: AudioContext, audioBase64: string): Promise<void> {
  if (!audioBase64) throw new Error('The speech service returned empty audio.');

  const binary = window.atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const audioBuffer = await context.decodeAudioData(bytes.buffer);
  await context.resume();
  const source = context.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(context.destination);

  await new Promise<void>((resolve, reject) => {
    source.onended = () => resolve();
    try {
      source.start();
    } catch (error) {
      reject(error);
    }
  });
}
