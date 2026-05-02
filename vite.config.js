import { defineConfig } from 'vite';

export default defineConfig({
    base: '/freetts/',
    assetsInclude: ['**/*.onnx', '**/*.json'],
    optimizeDeps: {
        exclude: ['onnxruntime-web'],
    },
});
