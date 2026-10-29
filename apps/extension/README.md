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

- `src/sidepanel/` - Placeholder side-panel UI and bundled styles
- `src/background.ts` - Toolbar-to-side-panel behavior, with sanitized errors
- `src/components/ui/` - shadcn/ui button, card, badge, separator
- `manifest.config.ts` - Chrome extension manifest configuration

## Documentation

- [React Documentation](https://reactjs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [CRXJS Documentation](https://crxjs.dev/vite-plugin)

## Chrome Extension Development Notes

- Use `manifest.config.ts` to configure your extension
- The CRXJS plugin automatically handles manifest generation
- Step 3 has no popup, content scripts, website access, or local-service bridge.
- Only the `sidePanel` permission is requested in production.
- Run `npm run typecheck` and `npm run lint` before building.
- Production ZIP output: `release/crx-piko-extension-0.1.0.zip`.
- See [the root setup guide](../../docs/04-development-setup.md) for full setup
  and manual toolbar verification.
