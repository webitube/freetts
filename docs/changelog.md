# Changelog

All notable changes to FreeTTS will be documented in this file.

## [Unreleased]

### Added
- Kokoro TTS neural engine support with ONNX Runtime
- Chunk-based audio playback with DOM card rendering
- Word-level highlighting in both Source and Visual modes
- Reactive state management via AppStore singleton
- Settings persistence to localStorage
- Mobile device detection and Kokoro disablement
- Theme toggle (Light/Dark mode)
- Help modal with Markdown cheatsheet
- Copy to clipboard and Download .md functionality
- Comprehensive test suite with Vitest

### Changed
- Migrated from manual state management to ReactiveTypescript
- Updated editor to Milkdown 7.20
- Updated build tool to Vite 8
- Updated testing to Vitest 4

### Fixed
- Markdown syntax cleaning for natural TTS playback
- Safari browser detection and compatibility
- Mobile autoplay policy compliance

## [1.0.0] - Initial Release

### Added
- Dual-mode Markdown editor (Source/Visual)
- Web Speech API TTS integration
- Syntax cleaning for TTS playback
- Voice selection and restoration
- Speed and pitch controls
- Tailwind CSS responsive design
- Lucide icons via inline SVG
- GitHub Flavored Markdown support
