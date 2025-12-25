# Changelog

## 1.6.0

### Minor Changes

- 85c8ed2: feat(client): copy 时输出组件树路径，格式为 `file:line:col(祖先>当前)`

## 1.5.0

### Minor Changes

- eae6e48: feat(client): add lock mode toggle

  - Press `Shift+Alt+T` to toggle lock mode (overlay always visible without holding hotkeys)
  - Press `ESC` to exit lock mode
  - In lock mode, clicking executes action but continues tracking

## 1.4.17

### Patch Changes

- e2fa95b: refactor: 提取鼠标偏移量为常量

## 1.4.16

### Patch Changes

- 99790b1: fix: 悬浮窗跟随鼠标位置，避免遮挡光标

## 1.4.15

### Patch Changes

- 8eecbbf: 修复右键时文本被选中的问题

  - 在 handleContextMenu 中添加 stopImmediatePropagation 阻止事件透传
  - 新增 handleSelectStart 阻止 Shift+点击触发的浏览器扩展选择行为

## 1.4.14

### Patch Changes

- 修复按住快捷键右键时事件透传导致文本被选中的问题

## 1.4.13

### Patch Changes

- 7f1d545: 添加 changeset 版本管理

## [1.4.4] - 2025-12-15

- 移除浮动开关按钮，简化界面交互

## [1.4.3] - 2025-12-15

- 优化 Switch UI 设计

## [1.4.2] - 2025-12-14

- 新增元素尺寸显示功能
- 优化底部品牌标识
