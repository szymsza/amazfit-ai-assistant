import { spawnSync } from 'child_process';
import OpusScript from 'opusscript';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const RATE = 16000;
const CHANNELS = 1;

/**
 * Detect whether a buffer is standard OGG/Opus (starts with "OggS")
 * or Zepp OS raw framed Opus.
 */
function isOgg(audio: Buffer): boolean {
  return audio.length >= 4 && audio.toString('ascii', 0, 4) === 'OggS';
}

/**
 * Decode Zepp OS raw framed Opus to PCM (s16le).
 * Format per the Zepp OS docs: [4-byte BE length][4 bytes padding][length bytes Opus payload] × N
 */
function decodeZeppOpusToPcm(audio: Buffer): Buffer {
  const encoder = new OpusScript(RATE, CHANNELS, OpusScript.Application.AUDIO);
  const out: Buffer[] = [];
  for (let pos = 0; pos < audio.byteLength; ) {
    const len = audio.readUInt32BE(pos);
    const payload = audio.subarray(pos + 8, pos + 8 + len);
    out.push(encoder.decode(payload));
    pos += 8 + len;
  }
  return Buffer.concat(out);
}

/** Write a minimal WAV header + PCM data. */
function pcmToWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcm.length;
  const fileSize = 36 + dataSize;
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);        // fmt chunk size
  header.writeUInt16LE(1, 20);         // PCM format
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * CHANNELS * 2, 28); // byte rate
  header.writeUInt16LE(CHANNELS * 2, 32);        // block align
  header.writeUInt16LE(16, 34);        // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

function convertToWav(audio: Buffer): Buffer {
  const magic = audio.slice(0, 8).toString('hex');
  console.log(`[stt] audio magic=${magic} size=${audio.length}b`);

  if (isOgg(audio)) {
    const result = spawnSync('ffmpeg', [
      '-v', 'error',
      '-i', 'pipe:0',
      '-f', 'wav',
      '-ar', String(RATE),
      '-ac', String(CHANNELS),
      'pipe:1',
    ], { input: audio, maxBuffer: 10 * 1024 * 1024 });
    if (result.error) throw new Error(`ffmpeg spawn failed: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr?.toString()}`);
    return result.stdout as Buffer;
  }

  const pcm = decodeZeppOpusToPcm(audio);
  return pcmToWav(pcm);
}

export async function transcribeAudio(audio: Buffer, groqApiKey: string): Promise<string> {
  const wav = convertToWav(audio);
  console.log(`[stt] converted to WAV: ${wav.length}b`);

  const blob = new Blob([wav], { type: 'audio/wav' });
  const form = new FormData();
  form.append('file', blob, 'recording.wav');
  form.append('model', 'whisper-large-v3');

  const response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq Whisper API error ${response.status}: ${errorText}`);
  }

  const json = (await response.json()) as { text?: unknown };
  if (typeof json.text !== 'string') {
    throw new Error('Unexpected Groq Whisper response: missing text field');
  }
  return json.text;
}
