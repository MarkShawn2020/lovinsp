# @markshawn/code-inspector-enhanced

Enhanced version of code-inspector with **mode switching** feature. Automatically patches the official `code-inspector-plugin` with enhanced client files.

## Features

- **📝 IDE Mode** (default): Click DOM to open in your IDE
- **📋 Copy Mode**: Click DOM to copy file path to clipboard
- **⌨️ Toggle**: Press `Shift+Alt+C` to switch modes
- **💡 Toast**: Visual feedback on mode switch
- **🎯 Indicator**: Shows current mode in overlay

## Installation

```bash
# Install official plugin
pnpm add -D code-inspector-plugin

# Install enhanced version (auto-patches)
pnpm add -D @markshawn/code-inspector-enhanced
```

That's it! The postinstall script automatically patches the client files.

## Usage

```typescript
// vite.config.ts
import { CodeInspectorPlugin } from 'code-inspector-plugin'

export default defineConfig({
  plugins: [
    CodeInspectorPlugin({ bundler: 'vite' }),
    react(),
  ],
})
```

Start dev server and use:
- **Shift+Alt**: Activate inspector
- **Shift+Alt+C**: Toggle mode
- Click elements to use current mode

## How It Works

This package automatically downloads enhanced client files from the fork repository and replaces the official ones in `node_modules`. The replacement happens during `postinstall`.

## Source

- Fork: https://github.com/MarkShawn2020/code-inspector
- Original: https://github.com/zh-lx/code-inspector

## License

MIT
