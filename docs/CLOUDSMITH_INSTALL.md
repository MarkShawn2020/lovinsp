# 从 Cloudsmith 安装 code-inspector

## 方法一：.npmrc + tarball URL（推荐）

在你的项目根目录创建 `.npmrc` 文件：

```ini
@code-inspector:registry=https://npm.cloudsmith.io/mark/code-inspector/
```

然后安装主包（使用 tarball URL）：

```bash
pnpm add https://npm.cloudsmith.io/mark/code-inspector/code-inspector-plugin/-/code-inspector-plugin-1.2.11.tgz -D
```

**说明：** pnpm 不支持为无 scope 的单个包配置 registry，所以主包需要用 tarball URL 安装。依赖的 `@code-inspector/*` 包会自动从 Cloudsmith 拉取。

## 方法二：使用 tarball URL

```bash
# 安装主包
pnpm add https://npm.cloudsmith.io/mark/code-inspector/code-inspector-plugin/-/code-inspector-plugin-1.2.11.tgz -D

# 手动安装依赖包
pnpm add https://npm.cloudsmith.io/mark/code-inspector/code-inspector-core/-/code-inspector-core-1.2.11.tgz -D
pnpm add https://npm.cloudsmith.io/mark/code-inspector/code-inspector-vite/-/code-inspector-vite-1.2.11.tgz -D
pnpm add https://npm.cloudsmith.io/mark/code-inspector/code-inspector-webpack/-/code-inspector-webpack-1.2.11.tgz -D
pnpm add https://npm.cloudsmith.io/mark/code-inspector/code-inspector-esbuild/-/code-inspector-esbuild-1.2.11.tgz -D
pnpm add https://npm.cloudsmith.io/mark/code-inspector/code-inspector-turbopack/-/code-inspector-turbopack-1.2.11.tgz -D
pnpm add https://npm.cloudsmith.io/mark/code-inspector/code-inspector-mako/-/code-inspector-mako-1.2.11.tgz -D
```

## 方法三：全局配置（所有项目生效）

编辑 `~/.npmrc`：

```ini
@code-inspector:registry=https://npm.cloudsmith.io/mark/code-inspector/
code-inspector-plugin:registry=https://npm.cloudsmith.io/mark/code-inspector/
```

## 验证安装

```bash
pnpm list code-inspector-plugin
# 应该显示 1.2.11 版本
```

## 更新版本

如果使用方法一或方法三，直接：

```bash
pnpm update code-inspector-plugin
```

如果使用方法二，需要重新安装所有 tarball。

## 私有仓库访问

如果仓库是私有的，需要设置 token：

```bash
# 获取 Cloudsmith API key 后设置环境变量
export CLOUDSMITH_API_KEY=your-api-key

# 或在 .npmrc 中配置：
//npm.cloudsmith.io/mark/code-inspector/:_authToken=${CLOUDSMITH_API_KEY}
```

## 包列表（v1.2.11）

- `code-inspector-plugin@1.2.11` - 主入口包
- `@code-inspector/core@1.2.11` - 核心功能
- `@code-inspector/vite@1.2.11` - Vite 适配器
- `@code-inspector/webpack@1.2.11` - Webpack 适配器
- `@code-inspector/esbuild@1.2.11` - Esbuild 适配器
- `@code-inspector/turbopack@1.2.11` - Turbopack 适配器
- `@code-inspector/mako@1.2.11` - Mako 适配器

## v1.2.11 更新内容

修复 pnpm link 导致的 MODULE_NOT_FOUND 错误：
- 使用相对路径支持 Next.js
- 生成文件写入项目缓存目录
- 自动创建必要的目录结构
