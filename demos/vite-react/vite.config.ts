import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { LovinspPlugin } from 'lovinsp';

// https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  plugins: [
    // lovinsp need to be used before @vitejs/plugin-react
    LovinspPlugin({
      bundler: 'vite',
      printServer: true,
      agent: {
        placeholder: '描述你想怎样修改这个组件',
        submitLabel: 'Codex',
        command: 'codex',
        args: [
          '-a',
          'never',
          'exec',
          '--sandbox',
          'workspace-write',
          '--skip-git-repo-check',
          '-'
        ],
        input: 'prompt',
        timeout: 300000,
        promptTemplate: [
          '你是被 lovinsp 从浏览器组件 inspector 触发的 Codex coding agent。',
          '请根据用户需求直接修改本地源码，不要启动 dev server，不要提问。',
          '优先只修改选中组件相关文件；如果需要改其他文件，保持范围最小。',
          '',
          '用户需求：{prompt}',
          '',
          '当前组件：',
          '- file: {file}',
          '- line: {line}',
          '- column: {column}',
          '- element: {name}',
          '- text: {textContent}',
          '- chain: {ancestorChain}',
          '- page: {pageUrl}',
          '',
          '源码上下文：',
          '{source}'
        ].join('\n')
      }
    }),
    react(),
    splitVendorChunkPlugin(),
    AutoImport({
      imports: ['react'],
      dts: 'src/auto-imports.d.ts',
      dirs: ['src/hooks', 'src/store/reducer'],
      eslintrc: {
        enabled: true, // Default `false`
        filepath: './.eslintrc-auto-import.json', // Default `./.eslintrc-auto-import.json`
        globalsPropValue: true // Default `true`, (true | false | 'readonly' | 'readable' | 'writable' | 'writeable')
      }
    })
  ]
});
