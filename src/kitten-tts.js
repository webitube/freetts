import { cleanTextForTTS, chunkText } from './text-cleaner.js';
import { cachedFetch } from './model-cache.js';

export class TextSplitterStream {
    constructor() {
        this.chunks = [];
        this.closed = false;
    }

    push(text) {
        const cleaned = cleanTextForTTS(text);
        const sentences = chunkText(cleaned);
        this.chunks.push(...(sentences.length ? sentences : [text]));
    }

    close() { this.closed = true; }

    async *[Symbol.asyncIterator]() {
        for (const chunk of this.chunks) yield chunk;
    }
}

export class RawAudio {
    constructor(audio, sampling_rate) {
        this.audio = audio;
        this.sampling_rate = sampling_rate;
    }

    get length() { return this.audio.length; }

    toBlob() {
        return new Blob([this._encodeWAV(this.audio, this.sampling_rate)], { type: 'audio/wav' });
    }

    _encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const ws = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
        ws(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        ws(8, 'WAVE');
        ws(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        ws(36, 'data');
        view.setUint32(40, samples.length * 2, true);
        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }
}

export class KittenTTS {
    constructor(voices, session, voiceEmbeddings) {
        this.voices = voices || [];
        this.session = session;
        this.voiceEmbeddings = voiceEmbeddings || {};
        this.wasmSession = null;
        this.tokenizer = null;
        this.vocab = {};
        this.vocabArray = [];
    }

    static async from_pretrained(modelPath, options = {}) {
        const {
            device = 'wasm',
            modelBaseUrl = '',
        } = options;

        try {
            const ort = await import('onnxruntime-web');
            // Single-threaded WASM — no SharedArrayBuffer/COOP requirement (works on GitHub Pages)
            ort.env.wasm.numThreads = 1;

            const modelResponse = await cachedFetch(modelPath);
            const modelBuffer = await modelResponse.arrayBuffer();

            let session;
            if (device === 'webgpu') {
                try {
                    session = await ort.InferenceSession.create(modelBuffer, {
                        executionProviders: [{ name: 'webgpu' }, 'wasm'],
                        optimizationLevel: 'basic',
                    });
                } catch {
                    session = await ort.InferenceSession.create(modelBuffer, {
                        executionProviders: [{ name: 'wasm', simd: true }],
                    });
                }
            } else {
                session = await ort.InferenceSession.create(modelBuffer, {
                    executionProviders: [{ name: 'wasm', simd: true }],
                });
            }

            const voicesResponse = await cachedFetch(`${modelBaseUrl}voices.json`);
            const voicesData = await voicesResponse.json();
            const voices = Object.keys(voicesData).map(key => ({
                id: key,
                name: key
                    .replace('expr-', '')
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())
                    .replace(/\bM\b/, 'Male')
                    .replace(/\bF\b/, 'Female'),
            }));

            return new KittenTTS(voices, session, voicesData);
        } catch (error) {
            console.error('KittenTTS load error:', error);
            return new KittenTTS();
        }
    }

    async _loadTokenizer(modelBaseUrl) {
        if (this.tokenizer) return;
        const response = await cachedFetch(`${modelBaseUrl}tokenizer.json`);
        const data = await response.json();
        this.vocab = data.model.vocab;
        for (const [char, id] of Object.entries(this.vocab)) this.vocabArray[id] = char;
        this.tokenizer = data;
    }

    async _tokenize(text, modelBaseUrl) {
        await this._loadTokenizer(modelBaseUrl);
        const { phonemize } = await import('phonemizer');
        const phonemes = await phonemize(text, 'en-us');
        return `$${phonemes}$`.split('').map(c => this.vocab[c] ?? 0);
    }

    async *stream(textStreamer, options = {}) {
        const { voice = 'expr-voice-2-m', speed = 1.0, modelBaseUrl = '' } = options;

        for await (const text of textStreamer) {
            if (!text.trim()) continue;
            if (!this.session || !this.voiceEmbeddings[voice]) continue;

            try {
                const tokenIds = await this._tokenize(text, modelBaseUrl);
                const inputIds = new BigInt64Array(tokenIds.map(id => BigInt(id)));
                const speakerEmbedding = new Float32Array(this.voiceEmbeddings[voice][0]);
                const ort = await import('onnxruntime-web');

                const inputs = {
                    input_ids: new ort.Tensor('int64', inputIds, [1, inputIds.length]),
                    style: new ort.Tensor('float32', speakerEmbedding, [1, speakerEmbedding.length]),
                    speed: new ort.Tensor('float32', new Float32Array([speed]), [1]),
                };

                let results = await this.session.run(inputs);
                let audioData = results.waveform.data;

                // Fallback to WASM if WebGPU produces NaN
                if (audioData.length > 0 && isNaN(audioData[0])) {
                    if (!this.wasmSession) {
                        this.wasmSession = await ort.InferenceSession.create(
                            await (await cachedFetch(`${modelBaseUrl}model_quantized.onnx`)).arrayBuffer(),
                            { executionProviders: ['wasm'] }
                        );
                    }
                    results = await this.wasmSession.run(inputs);
                    audioData = results.waveform.data;
                }

                let finalAudio = new Float32Array(audioData);
                if (speed !== 1.0) {
                    const newLen = Math.floor(audioData.length / speed);
                    finalAudio = new Float32Array(newLen);
                    for (let i = 0; i < newLen; i++) {
                        finalAudio[i] = audioData[Math.min(Math.floor(i * speed), audioData.length - 1)];
                    }
                }

                // Replace NaN, normalize if too quiet
                let max = 0;
                for (let i = 0; i < finalAudio.length; i++) {
                    if (isNaN(finalAudio[i])) { finalAudio[i] = 0; continue; }
                    max = Math.max(max, Math.abs(finalAudio[i]));
                }
                if (max > 0 && max < 0.1) {
                    const f = 0.5 / max;
                    for (let i = 0; i < finalAudio.length; i++) finalAudio[i] *= f;
                }

                yield { text, audio: new RawAudio(finalAudio, 24000) };
            } catch (err) {
                console.error('KittenTTS inference error:', err);
            }
        }
    }
}
