import { KittenTTS, TextSplitterStream } from './kitten-tts.js';

const MODEL_CDN = 'https://cdn.jsdelivr.net/gh/clowerweb/kitten-tts-web-demo@main/public/tts-model/';
const MODEL_PATH = `${MODEL_CDN}model_quantized.onnx`;

let tts = null;
let device = 'wasm';

async function detectWebGPU() {
    if (!navigator.gpu) return false;
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch {
        return false;
    }
}

async function initializeModel(useWebGPU = false) {
    try {
        const webGPUSupported = useWebGPU ? await detectWebGPU() : false;
        device = webGPUSupported ? 'webgpu' : 'wasm';
        self.postMessage({ status: 'device', device });

        tts = await KittenTTS.from_pretrained(MODEL_PATH, {
            device,
            modelBaseUrl: MODEL_CDN,
        });

        self.postMessage({ status: 'ready', voices: tts.voices, device });
    } catch (e) {
        console.error('Worker init error:', e);
        self.postMessage({ status: 'error', data: e.message });
    }
}

self.addEventListener('message', async (e) => {
    const { type, useWebGPU, text, voice, speed, sampleRate = 24000 } = e.data;

    if (type === 'init') {
        await initializeModel(useWebGPU);
        return;
    }

    if (!tts) {
        self.postMessage({ status: 'error', data: 'Model not initialized' });
        return;
    }

    const streamer = new TextSplitterStream();
    streamer.push(text);
    streamer.close();

    const stream = tts.stream(streamer, { voice, speed, modelBaseUrl: MODEL_CDN });
    const chunks = [];

    try {
        for await (const { text: chunkText, audio } of stream) {
            self.postMessage({ status: 'stream', chunk: { audio: audio.toBlob(), text: chunkText } });
            chunks.push(audio);
        }
    } catch (error) {
        console.error('Streaming error:', error);
        self.postMessage({ status: 'error', data: error.message });
        return;
    }

    if (chunks.length === 0) {
        self.postMessage({ status: 'complete', audio: null });
        return;
    }

    try {
        const originalRate = chunks[0].sampling_rate;
        const length = chunks.reduce((sum, c) => sum + c.audio.length, 0);
        let waveform = new Float32Array(length);
        let offset = 0;
        for (const c of chunks) { waveform.set(c.audio, offset); offset += c.audio.length; }

        normalizePeak(waveform, 0.9);
        waveform = trimSilence(waveform, 0.002, Math.floor(originalRate * 0.02));

        if (sampleRate !== originalRate) {
            if (sampleRate < originalRate) waveform = antiAliasFilter(waveform, originalRate, sampleRate);
            waveform = resampleLinear(waveform, originalRate, sampleRate);
        }

        const merged = new chunks[0].constructor(waveform, sampleRate);
        self.postMessage({ status: 'complete', audio: merged.toBlob() });
    } catch (error) {
        console.error('Audio merge error:', error);
        self.postMessage({ status: 'error', data: error.message });
    }
});

function normalizePeak(f32, target = 0.9) {
    if (!f32?.length) return;
    let max = 1e-9;
    for (let i = 0; i < f32.length; i++) max = Math.max(max, Math.abs(f32[i]));
    const g = Math.min(4, target / max);
    if (g < 1) for (let i = 0; i < f32.length; i++) f32[i] *= g;
}

function trimSilence(f32, thresh = 0.002, minSamples = 480) {
    let s = 0, e = f32.length - 1;
    while (s < e && Math.abs(f32[s]) < thresh) s++;
    while (e > s && Math.abs(f32[e]) < thresh) e--;
    s = Math.max(0, s - minSamples);
    e = Math.min(f32.length, e + minSamples);
    return f32.slice(s, e);
}

function antiAliasFilter(input, inRate, outRate) {
    const cutoff = Math.min(outRate / 2, inRate / 2) * 0.9;
    const a = Math.exp(-2 * Math.PI * (cutoff / (inRate / 2)));
    const output = new Float32Array(input.length);
    output[0] = input[0] * (1 - a);
    for (let i = 1; i < input.length; i++) output[i] = input[i] * (1 - a) + output[i - 1] * a;
    return output;
}

function resampleLinear(input, inRate, outRate) {
    if (inRate === outRate) return input;
    const ratio = outRate / inRate;
    const outLen = Math.floor(input.length * ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
        const pos = i / ratio;
        const i0 = Math.floor(pos);
        const i1 = Math.min(input.length - 1, i0 + 1);
        out[i] = input[i0] * (1 - (pos - i0)) + input[i1] * (pos - i0);
    }
    return out;
}
