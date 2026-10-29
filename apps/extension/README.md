# Piko Chrome extension

This template helps you quickly start developing Chrome extensions with React, TypeScript and Vite. It includes the CRXJS Vite plugin for seamless Chrome extension development.

## Features

- React with TypeScript
- TypeScript support
- Vite build tool
- CRXJS Vite plugin integration
- Chrome extension manifest configuration

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open Chrome and navigate to `chrome://extensions/`, enable "Developer mode", and load the unpacked extension from the `dist` directory.

4. Build for production:

```bash
npm run build
```

## Project Structure

- `src/sidepanel/` - CRXJS HTML entry, React bootstrap, and bundled styles
- `src/App.tsx` - Assistant container and seven-stage workflow
- `src/features/assistant/` - Typed reducer, actions, and synthetic fixtures
- `src/components/layout/` - Header, shell, and workflow progress
- `src/components/assistant/` - Runtime status, conversation, and disabled microphone
- `src/components/review/` - Editable proposals and simulated approval summary
- `src/background/service-worker.ts` - Toolbar behavior, active-tab checks, injection, and lifecycle coordination
- `src/components/ui/` - shadcn/ui primitives (nine components)
- `manifest.config.ts` - Chrome extension manifest configuration

## Documentation

- [React Documentation](https://reactjs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [CRXJS Documentation](https://crxjs.dev/vite-plugin)

## Chrome Extension Development Notes

- Use `manifest.config.ts` to configure your extension
- The CRXJS plugin automatically handles manifest generation
- Step 5 adds explicit read-only inspection to the separate synthetic demo.
  No microphone capture, persistence, service integration, or form filling is added.
- Production permissions are `sidePanel`, `activeTab`, and `scripting`; no
  persistent host permissions or automatic content-script registrations.
- Run `npm run typecheck` and `npm run lint` before building.
- Production ZIP output: `release/crx-piko-extension-0.1.0.zip`.
- See [the root setup guide](../../docs/04-development-setup.md) for full setup
  and manual toolbar verification.
- See [the UI guide](../../docs/05-extension-ui.md) for the demo workflow and tests.
- See [the scanner guide](../../docs/06-form-scanner.md) for scanner architecture,
  the metadata-only contract, fixture setup, and test limitations.
- `src/content/` contains the isolated scanner, registry, labels, visibility, and mutation watcher.
- `src/features/scanner/` contains messages, validation, lifecycle state, and inventory UI.
- `scripts/generate-scanner-validator.cjs` generates a CSP-safe validator from the shared contracts
  before dev, build, and typecheck; the generated JS is ignored and requires no runtime code generation.
