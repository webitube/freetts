import { defineConfig } from 'vite';

export default defineConfig({
    base: '/dist/',
    assetsInclude: ['**/*.onnx', '**/*.json'],
    optimizeDeps: {
        exclude: ['onnxruntime-web'],
    },
});
