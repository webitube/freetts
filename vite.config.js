import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    base: '/freetts/',
    assetsInclude: ['**/*.onnx', '**/*.json'],
    resolve: {
        alias: {
            reactivetypescript: path.resolve(__dirname, 'ReactiveTypescript/dist/index.js'),
        },
    },
    optimizeDeps: {
        exclude: ['onnxruntime-web'],
    },
    worker: {
        format: 'es',
    },
});
