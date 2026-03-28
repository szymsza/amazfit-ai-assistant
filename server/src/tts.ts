import { spawn } from 'child_process';

const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const DEFAULT_VOICE = 'austin';
const TTS_MODEL = 'playai-tts';

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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq TTS API error ${response.status}: ${errorText}`);
  }

  const wavBuffer = Buffer.from(await response.arrayBuffer());
  return convertWavToOpus(wavBuffer);
}

function convertWavToOpus(wavBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'wav',
      '-i', 'pipe:0',
      '-c:a', 'libopus',
      '-b:a', '32k',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'ogg',
      'pipe:1',
    ]);

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk));

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        const errMsg = Buffer.concat(errChunks).toString();
        reject(new Error(`ffmpeg exited with code ${code}: ${errMsg}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`ffmpeg spawn error: ${err.message}`));
    });

    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}
