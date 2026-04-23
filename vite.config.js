import { defineConfig } from 'vite';

export default defineConfig({
    base: '/freetts_dist/',
    optimizeDeps: {
        exclude: ['onnxruntime-web', 'phonemizer'],
    },
});
