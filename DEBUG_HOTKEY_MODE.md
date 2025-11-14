# 快捷键模式调试指南

## 问题症状

之前的 Bug：即使按下 Cmd 键，显示的模式依然是 "Copy Path"，没有切换到 "Open in IDE"。

## 根本原因

在 `packages/core/src/server/use-client.ts` 中，动态生成的 `locateKeys` 配置有字符串拼接错误：

### ❌ 错误的代码（已修复）

```typescript
// 第 179 行 - 错误版本
locateKeys = `' + (${isMacDetection} ? 'shiftKey,altKey,metaKey' : 'shiftKey,altKey,ctrlKey') + '`;

// 生成的注入代码：
inspector.locateKeys = '' + ((/mac|iphone|ipad|ipod/i.test(navigator.userAgent)) ? 'shiftKey,altKey,metaKey' : 'shiftKey,altKey,ctrlKey') + '';
```

这看起来会在运行时求值，**但实际上被包裹在单引号字符串中**：

```javascript
// 实际注入的代码（第 192 行）
inspector.locateKeys = '${locateKeys}';
// 结果：
inspector.locateKeys = '' + ((/mac|iphone|ipad|ipod/i.test(navigator.userAgent)) ? 'shiftKey,altKey,metaKey' : 'shiftKey,altKey,ctrlKey') + '';
```

这意味着 `locateKeys` 被设置为一个**字面字符串**，而不是运行时求值的结果！

### ✅ 正确的代码（当前版本）

```typescript
// 使用条件拼接，避免字符串包裹
inspector.locateKeys = ${useDynamicLocateKeys
  ? `(/mac|iphone|ipad|ipod/i.test(navigator.userAgent)) ? 'shiftKey,altKey,metaKey' : 'shiftKey,altKey,ctrlKey'`
  : `'${locateKeysValue}'`};
```

**关键区别**：不再使用字符串模板包裹，而是直接将条件表达式嵌入到生成的 JavaScript 代码中。

## 验证修复

### 1. 检查生成的注入代码

在浏览器开发者工具中，查找注入的代码（通常在 `<script>` 标签或某个 `.js` 文件中）：

```javascript
// 应该看到（Mac 平台）：
inspector.locateKeys = (/mac|iphone|ipad|ipod/i.test(navigator.userAgent)) ? 'shiftKey,altKey,metaKey' : 'shiftKey,altKey,ctrlKey';

// 而不是字符串：
inspector.locateKeys = '' + ((/mac|iphone|ipad|ipod/i.test...
```

### 2. 在浏览器控制台检查属性值

打开浏览器控制台，运行：

```javascript
const inspector = document.querySelector('code-inspector-component');
console.log('copyKeys:', inspector.copyKeys);
console.log('locateKeys:', inspector.locateKeys);
console.log('targetKeys:', inspector.targetKeys);
```

**期望输出（Mac）：**
```
copyKeys: shiftKey,altKey
locateKeys: shiftKey,altKey,metaKey
targetKeys:
```

**期望输出（Windows）：**
```
copyKeys: shiftKey,altKey
locateKeys: shiftKey,altKey,ctrlKey
targetKeys:
```

### 3. 测试快捷键响应

#### 测试 Copy 模式：
1. 按住 `Shift + Alt`（不要按 Cmd）
2. 鼠标悬停在页面元素上
3. 检查元素信息弹窗：应显示 `Shift+Opt=Copy · Shift+Opt+Cmd=IDE`
4. 右键打开图层面板：标题应显示 `🔍️ Click node · Copy Path`
5. 点击元素或图层节点：应执行复制路径操作

#### 测试 Locate (IDE) 模式：
1. 按住 `Shift + Alt + Cmd` (Mac) 或 `Shift + Alt + Ctrl` (Windows)
2. 鼠标悬停在页面元素上
3. 检查元素信息弹窗：应显示 `Shift+Opt=Copy · Shift+Opt+Cmd=IDE`
4. 右键打开图层面板：标题应显示 `🔍️ Click node · Open in IDE`
5. 点击元素或图层节点：应在 IDE 中打开对应文件

### 4. 动态模式切换测试

1. 按住 `Shift + Alt`，右键打开图层面板
2. 面板标题显示 "Copy Path"
3. **保持右键面板打开**，继续按下 `Cmd` 键
4. 面板标题应立即切换为 "Open in IDE"
5. 松开 `Cmd` 键（保持 Shift + Alt）
6. 面板标题应恢复为 "Copy Path"

## 技术细节

### 为什么之前的实现会失败？

JavaScript 模板字符串的求值时机：

```javascript
// 在 TypeScript/Node.js 中构建字符串时
const locateKeys = `' + (condition ? 'a' : 'b') + '`;

// 在模板字符串中使用：
const code = `inspector.locateKeys = '${locateKeys}';`;

// 结果（错误）：
inspector.locateKeys = '' + (condition ? 'a' : 'b') + '';
// 这是一个字面字符串！

// 正确做法：
const code = `inspector.locateKeys = ${condition ? "'a'" : "'b'"};`;
// 结果：
inspector.locateKeys = 'a'; // 或 'b'，在运行时求值
```

### 修复的核心原理

使用**条件模板字符串拼接**而不是**嵌套字符串**：

```typescript
// 构建时决定如何生成代码
inspector.locateKeys = ${useDynamicLocateKeys
  ? `condition ? 'a' : 'b'`  // 生成运行时条件表达式
  : `'${staticValue}'`        // 生成静态字符串
};
```

生成的代码：
```javascript
// 动态模式：
inspector.locateKeys = (/mac/.test(navigator.userAgent)) ? 'shiftKey,altKey,metaKey' : 'shiftKey,altKey,ctrlKey';

// 静态模式：
inspector.locateKeys = 'shiftKey,altKey,metaKey';
```

## 相关文件

- `packages/core/src/server/use-client.ts:158-207` - 修复位置
- `packages/core/src/client/index.ts:193-206` - `matchesKeys` 函数
- `packages/core/src/client/index.ts:208-240` - `getTriggeredAction` 函数

## 如果问题仍然存在

### 排查步骤：

1. **清除缓存重新构建**
   ```bash
   pnpm build
   ```

2. **重启开发服务器**
   ```bash
   cd demos/vite-react  # 或其他 demo 项目
   pnpm dev
   ```

3. **硬刷新浏览器**
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`

4. **检查控制台错误**
   打开浏览器开发者工具，查看是否有 JavaScript 错误

5. **验证注入的代码**
   在 Sources 面板中搜索 `inspector.locateKeys`，查看生成的代码是否正确

6. **调试快捷键检测**
   在 `getTriggeredAction` 方法中添加断点或 console.log：
   ```javascript
   private getTriggeredAction(e: any): InspectorAction | null {
     console.log('Event keys:', {
       shift: e.shiftKey,
       alt: e.altKey,
       meta: e.metaKey,
       ctrl: e.ctrlKey
     });
     console.log('copyKeys:', this.copyKeys);
     console.log('locateKeys:', this.locateKeys);
     // ...
   }
   ```

## 预期行为总结

| 平台 | 快捷键组合 | 期望模式 | 面板标题 |
|------|-----------|---------|---------|
| Mac | Shift + Alt | Copy | 🔍️ Click node · Copy Path |
| Mac | Shift + Alt + Cmd | Locate | 🔍️ Click node · Open in IDE |
| Windows | Shift + Alt | Copy | 🔍️ Click node · Copy Path |
| Windows | Shift + Alt + Ctrl | Locate | 🔍️ Click node · Open in IDE |
