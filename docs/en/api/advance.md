# Advanced Configuration

Below are configurations for some non-standard scenarios.

## behavior <Badge type="tip" text="0.7.0+" vertical="middle" />

- Optional
- Type:
  ```ts
  type Behavior = {
    /*
     * Whether to enable clicking to jump to IDE code location (default is true)
     */
    locate?: boolean;
    /*
     * Whether to enable clicking to copy source code location info (default is true)
     * Can also set a string and use {file}, {line}, {column} templates to specify the format
     * Default value true is equivalent to the string format "{file}:{line}:{column}"
     */
    copy?: boolean | string;
    /**
     * Clicking elements will jump to the specified url.
     * String type, can use {file}, {line}, {column} templates to replace code location information.
     */
    target?: string;
  };
  ```
- Description: In some scenarios, if you don't need to locate code when clicking elements and only need to copy the source code location information, you can set `locate: false` and `copy: true`. In this case, clicking elements will only copy the source code location information.

In addition to the above behaviors, `lovinsp` will trigger a `code-inspector:trackCode` custom event when clicking elements. You can use this event to customize the desired functionality(This feature is supported in version `1.2.0+`). For example, if you want to log when clicking elements, you can implement it as follows:

```ts
window.addEventListener('code-inspector:trackCode', () => {
  sendLog('trackCode');
});
```

## agent

- Optional
- Type:
  ```ts
  type AgentRequest = {
    prompt: string;
    source: {
      file: string;
      line: number;
      column: number;
      name: string;
      textContent?: string;
      ancestorChain?: string[];
      pageUrl?: string;
      sourceContext?: {
        lines: string[];
        startLine: number;
        targetLine: number;
      } | null;
    };
  };

  type AgentOptions = {
    enabled?: boolean;
    placeholder?: string;
    submitLabel?: string;
    onRequest?: (request: AgentRequest) => Promise<string | void> | string | void;
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    input?: 'prompt' | 'json';
    promptTemplate?: string;
  };
  ```
- Description: Adds a right-side Agent chat sidebar to the inspector. After you select a component, `lovinsp` automatically attaches the selected DOM source context to the sidebar; when you type a component change request, it sends that context to the local Node server and runs either `agent.onRequest` or the configured `agent.command`. The endpoint is protected by a per-dev-server token injected into the client.
- Example using a custom handler:

```ts
lovinspPlugin({
  bundler: 'vite',
  agent: {
    async onRequest(request) {
      // Call your own coding agent here. The handler runs in Node.js
      // and can update files in the local project.
      console.log(request.prompt, request.source.file);
      return 'Request sent to agent.';
    },
  },
});
```

- Example using a local command:

```ts
lovinspPlugin({
  bundler: 'vite',
  agent: {
    command: 'your-agent-cli',
    args: ['--file', '{file}', '--line', '{line}'],
    input: 'prompt',
    timeout: 120000,
  },
});
```



## ip <Badge type="tip" text="0.13.0+" vertical="middle" />

- Optional
- Type: `boolean | string`. Default value `false`
- Description: Whether to send requests to the node server via IP. By default, requests are sent via `localhost`; when set to `true`, it will automatically detect local IP and send requests through IP; when specified as `string` type, it will send requests to the specified value.

## exclude <Badge type="tip" text="0.19.1+" vertical="middle" />

- Optional
- Type: `string | RegExp | (string | RegExp)[]`
- Description: Specify files not to be compiled, default is `/node_modules/`, after configuration, it is the union of `/node_modules/` and `exclude`.

## sourcePriority

- Optional
- Type: `Array<{ match: string | RegExp; priority: number }>`
- Description: Adjust source priority for the default selected node. Higher scores are preferred as the default target; lower-priority nodes remain available in the right-click component tree.
- Example: when shadcn/ui or Radix primitives often take over the default selected node, lower the priority of `src/components/ui`:

```ts
lovinspPlugin({
  bundler: 'vite',
  sourcePriority: [
    { match: /src\/components\/ui\//, priority: -10 },
  ],
});
```

## include <Badge type="tip" text="0.18.0+" vertical="middle" />

- Optional
- Type: `string | RegExp | (string | RegExp)[]`
- Description: By default, `lovinsp` won't compile files in `node_modules`. In some monorepo projects, your local packages referenced by the main project might be linked through `node_modules`. In this case, you need to declare these packages via `include` to allow their code to participate in location.
- Example: Suppose you have the following directory structure:
  ```shell
  my-project
    - pkg-a
    - pkg-b
    - main-pkg # imports pkg-a and pkg-b via package.json `dependencies`
      - node_modules
        - pkg-a
        - pkg-b
  ```
  If you want the source code in `pkg-a` and `pkg-b` to be locatable, you can configure as follows:
  ```ts
  lovinspPlugin({
    bundler: 'vite',
    include: ['pkg-a', 'pkg-b'],
  });
  ```

## mappings <Badge type="tip" text="0.18.1+" vertical="middle" />

- Optional
- Type: `Record<string, string> | Array<{ find: string | RegExp, replacement: string }>`
- Description: Used with `include` to map file paths in `node_modules` to real file paths in your project.
- Example: Suppose you have the following directory structure:
  ```shell
  my-project
    - pkg-a
    - pkg-b
    - main-pkg # imports pkg-a and pkg-b via package.json `dependencies`
      - node_modules
        - pkg-a
        - pkg-b
  ```
  After declaring `pkg-a` and `pkg-b` via `include`, the source code location will point to files in `node_modules` rather than the real file paths in your project. You can use `mappings` to map the paths:
  ```ts
  import path from 'path';

  lovinspPlugin({
    bundler: 'vite',
    include: ['pkg-a', 'pkg-b'],
    mappings: {
      'pkg-a': path.resolve(__dirname, '../pkg-a'),
      'pkg-b': path.resolve(__dirname, '../pkg-b'),
    },
  });
  ```

## hooks <Badge type="tip" text="0.10.0+" vertical="middle" />

- Optional
- Type:
  ```ts
  type SourceInfo = {
    file: string;
    line: number;
    column: number;
  };
  type Hooks = {
    /*
     * Hook function after server receives DOM source code location request
     */
    afterInspectRequest?: (
      options: CodeInspectorOptions,
      source: SourceInfo
    ) => void;
  };
  // Example
  lovinspPlugin({
    bundler: 'vite',
    hooks: {
      afterInspectRequest: (options, source) => {
        sendLog(source);
      },
    },
  });
  ```
- Description: Set callback hooks for certain lifecycles of `lovinsp`. For example, if you want to track how many times your team uses the code location feature, you can implement it through this configuration.

## match <Badge type="tip" text="0.5.0+" vertical="middle" />

- Optional
- Type: `RegExp`, default value is `/\.(vue|jsx|tsx|js|ts|mjs|mts)$/`
- Description: `lovinsp` will only compile files that match the `match` regular expression for source code location. You can use this configuration to reduce unnecessary files from compilation and improve compilation performance.

## injectTo <Badge type="tip" text="0.5.0+" vertical="middle" />

- Optional
- Type: `string | string[]` (only supports `string[]` type in version `0.17.5` and above)
- Description: Specifies the file for injecting client-side code related to DOM filtering and clicking to jump to vscode (must be an absolute path ending with `.js/.ts/.mjs/.mts/.jsx/.tsx`). By default, `lovinsp` will inject client code into the first file matching the `match` regular expression. In some custom SSR framework projects, the first injected file might only run on the server side, causing client-side logic to fail. In this case, you can specify a client file through this configuration to ensure client-side logic works.

## openIn <Badge type="tip" text="0.8.0+" vertical="middle" />

- Optional
- Type: `'reuse' | 'new' | 'auto'`, default value is `'auto'`
- Description: Specifies how to open IDE windows when using vscode or cursor as editor. `reuse` specifies reusing the current window; `new` specifies opening a new window; `auto` automatically chooses based on current IDE installation. It's recommended to configure your preference in IDE settings:

  <img width="978" alt="image" src="https://github.com/user-attachments/assets/b98b819b-363c-4b3b-98bf-8c1606821942">

## pathFormat <Badge type="tip" text="0.8.0+" vertical="middle" />

- Optional
- Type: `string | string[]`, default value is `{file}:{line}:{column}`
- Description: Specifies the command format for opening files in IDE, mainly used with non-built-in IDEs. `{file}`, `{line}`, `{column}` will be dynamically replaced as templates. For example, if your code location is line `5` column `11` of `/root/my-project/index.ts`, and your IDE's command to open files is `yourIDE /root/my-project/index.ts --line 5 --column 11`, you should set this value to `["{file}", "--line", "{line}", "--column", "{column}"]`.

## hideDomPathAttr <Badge type="tip" text="0.12.0+" vertical="middle" />

- Optional
- Type: `boolean`. Default value `false`
- Description: Whether to hide the `data-insp-path` attribute on DOM elements in browser console

## hideConsole

- Optional
- Type: `boolean`, default value is `false`
- Description: Whether to hide the keyboard shortcut hints about `lovinsp` in browser console

## escapeTags <Badge type="tip" text="0.11.0+" vertical="middle" />

- Optional
- Type: `(string | RegExp)[]`
- Description: For tags matching these conditions, the `data-insp-path` attribute will not be injected during compilation

## importClient <Badge type="tip" text="0.14.1+" vertical="middle" />

- Optional
- Type: `string`
- Description: Method of importing client interaction code: `file` means importing the file containing interaction code; `code` means directly injecting interaction code into the entry file.

## needEnvInspector <Badge type="danger" text="Deprecated" vertical="middle" />

- Optional
- Type: `boolean`, default value is `false`
- Description: When set to `true`, the plugin only works when `.env.local` file exists and contains `CODE_INSPECTOR=true`. (Mainly solves the need for some team members who don't want to use this plugin feature)

## port <Badge type="tip" text="0.19.0+" vertical="middle" />

- Optional
- Type: `number`, default value is `5678`
- Description: Specifies the starting port for the server of `lovinsp` to find.

## printServer <Badge type="tip" text="0.19.0+" vertical="middle" />

- Optional
- Type: `boolean`, default value is `false`
- Description: Whether to print the server startup information in the console.

## pathType <Badge type="tip" text="0.20.0+" vertical="middle" />

- Optional
- Type: `'absolute' | 'relative'`, default value is `'relative'`
- Description: Specifies the path type of the `data-insp-path` attribute, defaulting to relative path, optionally using absolute path (in micro-frontend scenarios, if multiple projects are not in the same git repository, absolute path is required).

## cache <Badge type="tip" text="0.20.2+" vertical="middle" />

- Optional
- Type: `boolean`, default value is `false`
- Description: This option only works for `webpack/rspack` projects with `filesystem` cache type. It's mainly used to prevent communication failures between the page and IDE due to inconsistent port numbers. Defaults to `false`, meaning no cache is used on each cold start; when set to `true`, caching will be enabled (when setting to `true`, it's recommended to also set `port` to a fixed port number).

## skipSnippets <Badge type="tip" text="1.2.3+" vertical="middle" />

- Optional
- Type: `('console' | 'htmlScript')[]`, default value is `[]`
- Description: Skip injecting certain code snippets:
  - `console`: Skip injecting `console.error` and `console.warn` code snippets, it's not recommended to skip this item for nextjs and nuxt projects
  - `htmlScript`: Skip injecting `script` tags in html, it's not recommended to skip this item for MPA projects
