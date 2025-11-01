<div align="center">
<img src="https://github.com/zh-lx/code-inspector/assets/73059627/842c3e88-dca7-4743-854c-d61093d3d34f" width="160px" style="margin-bottom: 12px;" />

<p align="center">
  <h2>code-inspector (Enhanced)</h2>
  <a href="https://inspector.fe-dev.cn">中文文档</a> | <a href="https://inspector.fe-dev.cn/en">Documentation</a>
</p>

[![NPM version](https://img.shields.io/npm/v/@markshawn/code-inspector-plugin.svg)](https://www.npmjs.com/package/@markshawn/code-inspector-plugin)
[![GITHUB star](https://img.shields.io/github/stars/MarkShawn2020/code-inspector?style=flat&label=%E2%AD%90%EF%B8%8F%20stars)](https://github.com/MarkShawn2020/code-inspector)
[![NPM Downloads](https://img.shields.io/npm/dm/@markshawn/code-inspector-plugin.svg)](https://npmcharts.netlify.app/compare/@markshawn/code-inspector-plugin?minimal=true)
[![MIT-license](https://img.shields.io/npm/l/@markshawn/code-inspector-plugin.svg)](https://opensource.org/licenses/MIT)

> 🎉 **Enhanced version** based on [zh-lx/code-inspector](https://github.com/zh-lx/code-inspector)
> ✨ **New Feature**: Press `Shift+Alt+C` to toggle between **IDE mode** and **Copy mode**

</div>

<hr />

## 🆕 What's Enhanced?

This fork adds a **mode switching feature** that lets you:

| Mode | Icon | Action | Shortcut |
|------|------|--------|----------|
| **IDE Mode** | 📝 | Click element → Open in your IDE | Default |
| **Copy Mode** | 📋 | Click element → Copy path to clipboard | `Shift+Alt+C` |

### Why This Enhancement?

Sometimes you want to **copy the file path** instead of opening it:
- Share code locations with teammates
- Paste into documentation
- Reference in issue trackers
- Quick file navigation via terminal

**Demo**:
1. Press `Shift + Alt` to activate
2. Press `C` to toggle: 📝 IDE ↔️ 📋 Copy
3. Click any element!

Toast notifications and status indicators keep you informed of the current mode.

---

## 📖 Introduction

Click the element on the page, it can automatically open the code editor and position the cursor to the source code of the element.

![code-inspector](https://cdn.jsdelivr.net/gh/zh-lx/static-img/code-inspector/demo.gif)

---

## 🚀 Quick Start

### Installation

```bash
npm i @markshawn/code-inspector-plugin -D
# or
yarn add @markshawn/code-inspector-plugin -D
# or
pnpm add @markshawn/code-inspector-plugin -D
```

### Configuration (Vite Example)

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { codeInspectorPlugin } from '@markshawn/code-inspector-plugin'

export default defineConfig({
  plugins: [
    codeInspectorPlugin({
      bundler: 'vite',
    }),
    react(),
  ],
})
```

### Usage

1. **Activate**: Press `Shift + Alt` (Windows) or `Shift + Option` (Mac)
2. **Toggle Mode**: Press `C` to switch between:
   - 📝 **IDE Mode**: Click to open in editor
   - 📋 **Copy Mode**: Click to copy path (`/path/to/file.tsx:42:10`)
3. **Click**: Click any element on the page

**Console Output**:
```
[code-inspector-plugin] Press and hold ⌥option + shift to enable the feature...
```

---

## 🎨 Support

The following are which compilers, web frameworks and editors we supported now:

- **Bundlers**:<br />
  ✅ webpack | ✅ vite | ✅ rspack/rsbuild | ✅ farm | ✅ esbuild | ✅ turbopack | ✅ mako

- **Frameworks**:<br />
  ✅ vue2/vue3/nuxt | ✅ react/nextjs/umijs | ✅ preact | ✅ solid | ✅ qwik | ✅ svelte | ✅ astro

- **Editors**:<br />
  [VSCode](https://code.visualstudio.com/) | [Cursor](https://www.cursor.com/) | [Windsurf](https://codeium.com/windsurf) | [WebStorm](https://www.jetbrains.com/webstorm/) | [Atom](https://atom.io/) | [HBuilderX](https://www.dcloud.io/hbuilderx.html) | [PhpStorm](https://www.jetbrains.com/phpstorm/) | [PyCharm](https://www.jetbrains.com/pycharm/) | [IntelliJ IDEA](https://www.jetbrains.com/idea/) | [and Others](https://inspector.fe-dev.cn/en/guide/ide.html)

---

## 📦 Configuration Examples

<details>
  <summary>Click to expand: <b>webpack</b></summary>

```js
// webpack.config.js
const { codeInspectorPlugin } = require('@markshawn/code-inspector-plugin');

module.exports = () => ({
  plugins: [
    codeInspectorPlugin({
      bundler: 'webpack',
    }),
  ],
});
```

</details>

<details>
  <summary>Click to expand: <b>vite</b></summary>

```js
// vite.config.js
import { defineConfig } from 'vite';
import { codeInspectorPlugin } from '@markshawn/code-inspector-plugin';

export default defineConfig({
  plugins: [
    codeInspectorPlugin({
      bundler: 'vite',
    }),
  ],
});
```

</details>

<details>
  <summary>Click to expand: <b>Next.js 15+</b></summary>

```js
// next.config.js
import type { NextConfig } from 'next';
import { codeInspectorPlugin } from '@markshawn/code-inspector-plugin';

const nextConfig: NextConfig = {
  turbopack: {
    rules: codeInspectorPlugin({
      bundler: 'turbopack',
    }),
  },
};

export default nextConfig;
```

</details>

<details>
  <summary>Click to expand: <b>Nuxt 3</b></summary>

```js
// nuxt.config.js
import { codeInspectorPlugin } from '@markshawn/code-inspector-plugin';

export default defineNuxtConfig({
  vite: {
    plugins: [codeInspectorPlugin({ bundler: 'vite' })],
  },
});
```

</details>

For more bundler configurations, see the [official documentation](https://inspector.fe-dev.cn/en/guide/start.html#configuration).

---

## 🆚 Comparison with Original

| Feature | Original | Enhanced (This Fork) |
|---------|----------|----------------------|
| Open in IDE | ✅ | ✅ |
| Copy file path | ❌ | ✅ **New!** |
| Mode switching | ❌ | ✅ **Shift+Alt+C** |
| Toast notifications | ❌ | ✅ |
| Mode indicator | ❌ | ✅ |
| All original features | ✅ | ✅ |

---

## 🔄 Migration from Original

If you're using the original `code-inspector-plugin`:

```bash
# 1. Uninstall original
npm uninstall code-inspector-plugin

# 2. Install enhanced version
npm install -D @markshawn/code-inspector-plugin

# 3. Update imports in config files
# Change:
import { codeInspectorPlugin } from 'code-inspector-plugin'
# To:
import { codeInspectorPlugin } from '@markshawn/code-inspector-plugin'
```

**No other changes needed!** The API is 100% compatible.

---

## 📋 Detailed Features

### 1. IDE Mode (Default)
Click on any element → Automatically opens in your configured IDE with cursor positioned at the exact line and column.

### 2. Copy Mode (New!)
Click on any element → Copies the file path to your clipboard in the format:
```
/Users/you/project/src/components/Button.tsx:42:10
```

Perfect for:
- Creating issue references
- Sharing code locations
- Documentation
- Terminal navigation (`code $(pbpaste)`)

### 3. Visual Feedback
- **Toast Notifications**: "Switched to 📋 Copy mode" / "Switched to 📝 IDE mode"
- **Status Indicator**: Shows current mode in the overlay
- **Keyboard Shortcut**: `Shift+Alt+C` to toggle

---

## 🙏 Credits

This enhanced version is based on the excellent work of [@zh-lx](https://github.com/zh-lx) and the [code-inspector](https://github.com/zh-lx/code-inspector) project.

**Original Project**: https://github.com/zh-lx/code-inspector
**Original Author**: [@zh-lx](https://github.com/zh-lx)

All credits for the core functionality go to the original author. This fork only adds the mode switching enhancement.

---

## 📧 Communication and Feedback

- **Issues**: [Submit an issue](https://github.com/MarkShawn2020/code-inspector/issues)
- **Original Project Issues**: [Original project issues](https://github.com/zh-lx/code-inspector/issues)
- **Pull Request**: [PR to upstream](https://github.com/zh-lx/code-inspector/pull/406) (pending merge)

---

## 📄 License

MIT License - Same as the original project

**Copyright**:
- Original: © 2024 zh-lx
- Enhanced: © 2024 MarkShawn2020

---

## 🌟 Star History

If you find this enhancement useful, please consider:
- ⭐ Starring this repository
- ⭐ Starring the [original repository](https://github.com/zh-lx/code-inspector)
- 🔄 Sharing with your team

---

<div align="center">
Made with ❤️ by <a href="https://github.com/MarkShawn2020">MarkShawn2020</a><br/>
Based on <a href="https://github.com/zh-lx/code-inspector">code-inspector</a> by <a href="https://github.com/zh-lx">zh-lx</a>
</div>
