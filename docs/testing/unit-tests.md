# Unit Tests

Unit tests focus on individual modules in isolation, verifying correct behavior of each component.

## Test Files

| File | Module | Coverage |
|------|--------|----------|
| `debug-log.test.js` | `debug-log.ts` | Logging utilities |
| `editor-manager.test.js` | `editor-manager.ts` | Editor mode switching |
| `global-switches.test.js` | `global-switches.ts` | Debug mode flags |
| `highlighting-utils.test.js` | `highlighting-utils.ts` | Word highlighting |
| `kokoro-audio-player.test.js` | `kokoro-audio-player.ts` | Audio element management |
| `kokoro-chunk-renderer.test.js` | `kokoro-chunk-renderer.ts` | Chunk card rendering |
| `settings-persistence.test.js` | `settings-persistence.ts` | localStorage sync |
| `tts-controller.test.js` | `tts-controller.ts` | TTS orchestration |
| `ui-manager.test.js` | `ui-manager.ts` | UI controls |
| `voice-manager.test.js` | `voice-manager.ts` | Voice selection |

## Running Unit Tests

```bash
# All unit tests
npx vitest run tests/unit/

# Specific test
npx vitest run tests/unit/tts-controller.test.js
```

## Key Test Scenarios

### Editor Manager
- Source mode initialization
- Visual mode lazy initialization
- Markdown sync from Visual to Source
- DOM visibility toggling
- AppStore state updates

### TTS Controller
- Web Speech playback flow
- Kokoro playback delegation
- Syntax cleaning before TTS
- Word-level highlighting callbacks
- Playback state subscriptions

### Settings Persistence
- Save settings to localStorage
- Load settings from localStorage
- Per-engine voice storage
- Settings reset
- Backward compatibility with DOM elements

### Voice Manager
- Voice selector population
- Saved voice by name resolution
- Saved voice by index resolution
- Fallback to first voice
- Web Speech voice loading

### UI Manager
- Theme toggle (light/dark)
- Help modal open/close
- Playback control icon updates
- Clipboard copy
- Markdown download

### Highlighting Utils
- TreeWalker-based word highlighting
- Cursor info retrieval
- Markdown syntax cleaning (headings, bold, italic, links, tables)

### Kokoro Audio Player
- Audio element creation from Blob
- Chunk playback
- Stop all playback
- Cleanup and URL revocation

### Kokoro Chunk Renderer
- Chunk card DOM creation
- Audio event handler binding
- Play button state updates
- Seek-by-click handling

### Debug Log
- Debug mode on/off filtering
- Formatted output with markers
- Performance timer start/end
- Array logging with headers/footers

### Global Switches
- Debug mode flag setting
- Debug mode flag retrieval
