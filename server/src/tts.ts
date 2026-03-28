import { spawnSync } from 'child_process';
import OpusScript from 'opusscript';

const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const DEFAULT_VOICE = 'austin';
const TTS_MODEL = 'canopylabs/orpheus-v1-english';

const RATE = 16000;
const CHANNELS = 1;
const FRAME_SIZE = 960; // 60ms at 16kHz — matches Zepp OS recorder output

export async function synthesizeSpeech(
  text: string,
  groqApiKey: string,
  voice: string = DEFAULT_VOICE,
): Promise<Buffer> {
  const response = await fetch(GROQ_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: text,
      voice,
      response_format: 'wav',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq TTS API error ${response.status}: ${errorText}`);
  }

  const wavBuffer = Buffer.from(await response.arrayBuffer());
  return wavToZeppOpus(wavBuffer);
}

/**
 * Convert WAV (16-bit PCM) to Zepp OS framed Opus.
 * Resamples to 16kHz mono via ffmpeg first, then encodes with opusscript.
 * Output format: [4-byte BE len][4-byte zeros][opus payload] × N
 */
function wavToZeppOpus(wavBuffer: Buffer): Buffer {
  // Resample to 16kHz mono s16le PCM via ffmpeg
  const result = spawnSync('ffmpeg', [
    '-v', 'error',
    '-f', 'wav',
    '-i', 'pipe:0',
    '-f', 's16le',
    '-ar', String(RATE),
    '-ac', String(CHANNELS),
    'pipe:1',
  ], { input: wavBuffer, maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw new Error(`ffmpeg spawn failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr?.toString()}`);
  const pcm = result.stdout as Buffer;

  // Encode PCM to Opus frames and wrap in Zepp OS format
  const encoder = new OpusScript(RATE, CHANNELS, OpusScript.Application.AUDIO);
  const bytesPerFrame = FRAME_SIZE * CHANNELS * 2; // 16-bit samples
  const parts: Buffer[] = [];

  for (let offset = 0; offset + bytesPerFrame <= pcm.length; offset += bytesPerFrame) {
    const framePcm = pcm.subarray(offset, offset + bytesPerFrame);
    const encoded = encoder.encode(framePcm, FRAME_SIZE);
    const header = Buffer.alloc(8);
    header.writeUInt32BE(encoded.length, 0); // 4-byte BE length
    // bytes 4-7 left as zeros
    parts.push(header, Buffer.from(encoded));
  }

  return Buffer.concat(parts);
}
