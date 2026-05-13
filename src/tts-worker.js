/**
 * tts-worker.js — Web Worker for Kokoro TTS streaming
 * 
 * Runs KokoroTTS (ONNX Runtime) to generate speech from text chunks.
 * Communicates with main thread via postMessage for streaming audio generation.
 * 
 * @requires kokoro-js — ONNX Runtime-based TTS engine
 * 
 * Worker Messages (from main thread):
 * - { status: 'init', useWebGPU: boolean } — Initialize worker with device preference
 * - { text, voice, speed } — Generate TTS for given text
 * 
 * Worker Messages (to main thread):
 * - { status: 'device', device: string } — Confirms device selection (webgpu/wasm)
 * - { status: 'ready', voices, device } — Model loaded, voices available
 * - { status: 'stream', chunk } — New audio chunk streamed (text + WAV Blob)
 * - { status: 'complete', mergedAudio } — All chunks done, merged WAV Blob
 * - { status: 'error', data: string } — Error message
 */

import { KokoroTTS, TextSplitterStream } from 'kokoro-js';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

/**
 * Whether to use WebGPU backend (true) or WASM fallback (false).
 * Detected on main thread and sent via 'init' message.
 * @type {boolean}
 */
let useWebGPU = false;

/**
 * Main worker entry point.
 * 
 * Waits for device initialization, loads Kokoro model, and listens for TTS requests.
 * Each text submission triggers streaming generation of audio chunks.
 * 
 * @async
 */
async function main() {
    // Wait for the main thread to tell us which backend to use.
    const initDone = new Promise((resolve) => {
        const handler = (e) => {
            if (e.data?.status === 'init') {
                useWebGPU = !!e.data.useWebGPU;
                self.removeEventListener('message', handler);
                resolve();
            }
        };
        self.addEventListener('message', handler);
    });

    await initDone;
    const device = useWebGPU ? 'webgpu' : 'wasm';
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
                // Explicit WAV format with correct sample rate metadata for mobile compatibility
                self.postMessage({
                    status: 'stream',
                    chunk: { audio: audio.toBlob({ mimeType: 'audio/wav' }), text: chunkText },
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
            self.postMessage({ status: 'complete', mergedAudio: merged.toBlob({ mimeType: 'audio/wav' }) });
        } catch (error) {
            self.postMessage({ status: 'error', data: error.message });
        }
    });
}

main();
