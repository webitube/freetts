import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            reactivetypescript: path.resolve(__dirname, 'ReactiveTypescript/dist/index.js'),
        },
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.{js,ts}'],
        exclude: [
            'ReactiveTypescript/**',
            'node_modules/**',
            'dist/**',
        ],
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts', 'src/**/*.js'],
            exclude: [
                'src/app.ts',
                'src/app.js',
                'src/tts-worker.js',
                'src/tts-worker.ts',
            ],
        },
    },
});