import { KokoroTTS, TextSplitterStream } from 'kokoro-js';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

async function detectWebGPU() {
    if (!navigator.gpu) return false;
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch {
        return false;
    }
}

async function main() {
    const device = (await detectWebGPU()) ? 'webgpu' : 'wasm';
    self.postMessage({ status: 'device', device });

    const deviceType = device === 'wasm' ? 'q8' : 'fp32';
    let tts;
    try {
        tts = await KokoroTTS.from_pretrained(MODEL_ID, {
            dtype: deviceType,
            device,
        });
    } catch (e) {
        self.postMessage({ status: 'error', data: e.message });
        return;
    }

    self.postMessage({ status: 'ready', voices: tts.voices, device });

    self.addEventListener('message', async (e) => {
        const { text, voice, speed } = e.data;

        const streamer = new TextSplitterStream();
        streamer.push(text);
        streamer.close();

        const stream = tts.stream(streamer, { voice, speed });
        const chunks = [];

        try {
            for await (const { text: chunkText, audio } of stream) {
                self.postMessage({
                    status: 'stream',
                    chunk: { audio: audio.toBlob(), text: chunkText },
                });
                chunks.push(audio);
            }
        } catch (error) {
            self.postMessage({ status: 'error', data: error.message });
            return;
        }

        if (chunks.length === 0) {
            self.postMessage({ status: 'complete', mergedAudio: null });
            return;
        }

        try {
            const samplingRate = chunks[0].sampling_rate;
            const length = chunks.reduce((sum, c) => sum + c.audio.length, 0);
            const waveform = new Float32Array(length);
            let offset = 0;
            for (const c of chunks) {
                waveform.set(c.audio, offset);
                offset += c.audio.length;
            }

            const merged = new chunks[0].constructor(waveform, samplingRate);
            self.postMessage({ status: 'complete', mergedAudio: merged.toBlob() });
        } catch (error) {
            self.postMessage({ status: 'error', data: error.message });
        }
    });
}

main();
