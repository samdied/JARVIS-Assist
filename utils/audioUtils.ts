import { Blob } from '@google/genai';

/**
 * Decodes a base64 string into a Uint8Array.
 * @param base64 The base64 encoded string.
 * @returns The decoded Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 * @param data The Uint8Array containing raw PCM audio data.
 * @param ctx The AudioContext to create the AudioBuffer with.
 * @param sampleRate The sample rate of the audio data.
 * @param numChannels The number of audio channels.
 * @returns A Promise that resolves with the decoded AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Encodes a Float32Array into a base64 string.
 * @param bytes The Uint8Array to encode.
 * @returns The base64 encoded string.
 */
export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Creates a Blob object from Float32Array audio data for Live API input.
 * Converts Float32Array (microphone input) to Int16Array and then to a base64 encoded string.
 * @param data The Float32Array containing audio data.
 * @returns A Blob object suitable for Gemini Live API.
 */
export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768; // Convert to 16-bit PCM
  }
  return {
    data: encodeBase64(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000', // Supported audio MIME type
  };
}

/**
 * Plays an AudioBuffer using the provided AudioContext.
 * @param audioBuffer The AudioBuffer to play.
 * @param outputAudioContext The AudioContext for playback.
 * @param outputNode The AudioNode to connect the source to.
 * @param currentNextStartTime A mutable number tracking the next available start time for audio playback.
 * @param activeSources A Set to keep track of active AudioBufferSourceNodes to allow for interruption.
 * @returns The updated nextStartTime.
 */
export function playAudioBuffer(
  audioBuffer: AudioBuffer,
  outputAudioContext: AudioContext,
  outputNode: GainNode,
  currentNextStartTime: number,
  activeSources: Set<AudioBufferSourceNode>,
): number {
  let nextStartTime = Math.max(
    currentNextStartTime,
    outputAudioContext.currentTime,
  );
  const source = outputAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(outputNode);
  source.addEventListener('ended', () => {
    activeSources.delete(source);
  });

  source.start(nextStartTime);
  nextStartTime = nextStartTime + audioBuffer.duration;
  activeSources.add(source);
  return nextStartTime;
}