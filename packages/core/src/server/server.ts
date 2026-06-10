// 启动本地接口，访问时唤起vscode
import http from 'http';
import fs from 'fs';
import portFinder from 'portfinder';
import { launchIDE } from 'launch-ide';
import { DefaultPort } from '../shared/constant';
import { getIP, getProjectRecord, setProjectRecord, findPort } from '../shared';
import type {
  AgentOptions,
  AgentRequest,
  AgentResponse,
  PathType,
  CodeOptions,
  RecordInfo,
} from '../shared';
import { execSync, spawn } from 'child_process';
import { randomBytes } from 'crypto';
import path from 'path';
import chalk from 'chalk';

// 获取项目 git 根目录
function getProjectRoot(): string {
  try {
    const command = 'git rev-parse --show-toplevel';
    const gitRoot = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return gitRoot;
  } catch (error) {
    return '';
  }
}

// 项目根目录
export const ProjectRootPath = getProjectRoot();
export function getRelativePath(filePath: string): string {
  if (ProjectRootPath) {
    return filePath.replace(`${ProjectRootPath}/`, '');
  }
  return filePath;
}

// 根据用户配置返回绝对路径或者相对路径
export function getRelativeOrAbsolutePath(
  filePath: string,
  pathType?: PathType
) {
  return pathType === 'relative' ? getRelativePath(filePath) : filePath;
}

// 获取源代码片段（上下文）
function getSourceContext(filePath: string, line: number, contextLines: number = 5): { lines: string[], startLine: number } | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n');
    const startLine = Math.max(1, line - contextLines);
    const endLine = Math.min(allLines.length, line + contextLines);
    const lines = allLines.slice(startLine - 1, endLine);
    return { lines, startLine };
  } catch {
    return null;
  }
}

function isAgentEnabled(agent?: AgentOptions | false) {
  return !!agent && agent.enabled !== false;
}

function getProjectBase(record?: RecordInfo) {
  return ProjectRootPath || record?.root || record?.envDir || process.cwd();
}

function isPathInside(parent: string, target: string) {
  const relative = path.relative(parent, target);
  return (
    relative === '' ||
    (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

function resolveProjectFile(file: string, record?: RecordInfo) {
  const projectBase = path.resolve(getProjectBase(record));
  const resolvedFile = path.isAbsolute(file)
    ? path.normalize(file)
    : path.resolve(projectBase, file);

  if (!isPathInside(projectBase, resolvedFile)) {
    throw Object.assign(new Error('file is outside of project root'), {
      statusCode: 403,
    });
  }

  return resolvedFile;
}

function readJsonBody<T>(
  req: http.IncomingMessage,
  maxBytes = 1024 * 128
): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf-8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(Object.assign(new Error('request body is too large'), {
          statusCode: 413,
        }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(Object.assign(new Error('invalid json body'), {
          statusCode: 400,
        }));
      }
    });
    req.on('error', reject);
  });
}

function toAgentResponse(result: AgentResponse | string | void): AgentResponse {
  if (typeof result === 'string') {
    return { message: result };
  }
  return result || { message: 'Change request completed.' };
}

function formatSourceContext(request: AgentRequest) {
  const context = request.source.sourceContext;
  if (!context?.lines?.length) {
    return '';
  }

  return context.lines
    .map((line, index) => {
      const lineNumber = context.startLine + index;
      const marker = lineNumber === context.targetLine ? '>' : ' ';
      return `${marker} ${lineNumber}: ${line}`;
    })
    .join('\n');
}

function renderAgentPrompt(request: AgentRequest, promptTemplate?: string) {
  const source = formatSourceContext(request);
  const json = JSON.stringify(request, null, 2);
  const values: Record<string, string> = {
    prompt: request.prompt,
    file: request.source.file,
    line: String(request.source.line),
    column: String(request.source.column),
    name: request.source.name,
    textContent: request.source.textContent || '',
    ancestorChain: request.source.ancestorChain?.join(' > ') || '',
    source,
    pageUrl: request.source.pageUrl || '',
    json,
  };

  if (promptTemplate) {
    return applyAgentTemplate(promptTemplate, values);
  }

  return [
    'Modify the selected frontend component source code according to this request.',
    '',
    `Request: ${request.prompt}`,
    '',
    'Selected component:',
    `- file: ${request.source.file}`,
    `- line: ${request.source.line}`,
    `- column: ${request.source.column}`,
    `- element: ${request.source.name}`,
    request.source.ancestorChain?.length
      ? `- ancestor chain: ${request.source.ancestorChain.join(' > ')}`
      : '',
    request.source.textContent ? `- text: ${request.source.textContent}` : '',
    request.source.pageUrl ? `- page: ${request.source.pageUrl}` : '',
    '',
    source ? `Source context:\n${source}` : '',
  ].filter(Boolean).join('\n');
}

function applyAgentTemplate(template: string, values: Record<string, string>) {
  return template.replace(
    /\{(prompt|file|line|column|name|textContent|ancestorChain|source|pageUrl|json)\}/g,
    (_, key: string) => values[key] || ''
  );
}

function renderAgentArgs(args: string[] = [], request: AgentRequest) {
  const values: Record<string, string> = {
    prompt: request.prompt,
    file: request.source.file,
    line: String(request.source.line),
    column: String(request.source.column),
    name: request.source.name,
    textContent: request.source.textContent || '',
    ancestorChain: request.source.ancestorChain?.join(' > ') || '',
    source: formatSourceContext(request),
    pageUrl: request.source.pageUrl || '',
    json: JSON.stringify(request),
  };
  return args.map((arg) => applyAgentTemplate(arg, values));
}

function runAgentCommand(
  agent: AgentOptions,
  request: AgentRequest,
  record?: RecordInfo
): Promise<AgentResponse> {
  return new Promise((resolve, reject) => {
    if (!agent.command) {
      reject(Object.assign(new Error('agent command is not configured'), {
        statusCode: 501,
      }));
      return;
    }

    const cwd = agent.cwd || getProjectBase(record);
    const child = spawn(agent.command, renderAgentArgs(agent.args, request), {
      cwd,
      env: {
        ...process.env,
        LOVINSP_AGENT_PROMPT: request.prompt,
        LOVINSP_AGENT_FILE: request.source.file,
        LOVINSP_AGENT_LINE: String(request.source.line),
        LOVINSP_AGENT_COLUMN: String(request.source.column),
        LOVINSP_AGENT_ELEMENT: request.source.name,
        ...agent.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(Object.assign(new Error('agent command timed out'), {
        statusCode: 504,
      }));
    }, agent.timeout ?? 120000);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({
          message: stdout.trim() || 'Change request completed.',
        });
      } else {
        reject(
          Object.assign(
            new Error(
              stderr.trim().slice(0, 2000) ||
                `agent command exited with code ${code}`
            ),
            {
              statusCode: 500,
            }
          )
        );
      }
    });

    const input = agent.input === 'json'
      ? JSON.stringify(request, null, 2)
      : renderAgentPrompt(request, agent.promptTemplate);
    child.stdin.end(input);
  });
}

function getAgentToken(record?: RecordInfo) {
  if (!record) {
    return '';
  }
  try {
    return getProjectRecord(record)?.agentToken || record.agentToken || '';
  } catch {
    return record.agentToken || '';
  }
}

async function handleAgentRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  corsHeaders: Record<string, string>,
  options?: CodeOptions,
  record?: RecordInfo
) {
  const agent = options?.agent;
  const writeJson = (statusCode: number, payload: Record<string, unknown>) => {
    res.writeHead(statusCode, {
      ...corsHeaders,
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(payload));
  };

  try {
    if (!isAgentEnabled(agent)) {
      writeJson(404, { ok: false, error: 'agent is not enabled' });
      return;
    }
    const agentOptions = agent as AgentOptions;

    const token = getAgentToken(record);
    if (token && req.headers['x-lovinsp-agent-token'] !== token) {
      writeJson(403, { ok: false, error: 'invalid agent token' });
      return;
    }

    const payload = await readJsonBody<AgentRequest>(req);
    if (!payload.prompt?.trim()) {
      writeJson(400, { ok: false, error: 'prompt is required' });
      return;
    }
    if (!payload.source?.file) {
      writeJson(400, { ok: false, error: 'source.file is required' });
      return;
    }

    const file = resolveProjectFile(payload.source.file, record);
    const line = Number(payload.source.line || 1);
    const fallbackSourceContext = getSourceContext(file, line);
    const request: AgentRequest = {
      prompt: payload.prompt.trim(),
      source: {
        ...payload.source,
        file,
        sourceContext:
          payload.source.sourceContext ||
          (fallbackSourceContext
            ? { ...fallbackSourceContext, targetLine: line }
            : null),
      },
    };

    const result = agentOptions.onRequest
      ? await agentOptions.onRequest(request)
      : await runAgentCommand(agentOptions, request, record);

    writeJson(200, {
      ok: true,
      ...toAgentResponse(result),
    });
  } catch (error: any) {
    writeJson(error?.statusCode || 500, {
      ok: false,
      error: error?.message || 'agent request failed',
    });
  }
}

function createAgentToken(options?: CodeOptions) {
  return isAgentEnabled(options?.agent) ? randomBytes(16).toString('hex') : '';
}

export function createServer(
  callback: (port: number) => any,
  options?: CodeOptions,
  record?: RecordInfo
) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Private-Network': 'true',
  };

  const server = http.createServer((req: any, res: any) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (url.pathname === '/agent') {
      if (req.method !== 'POST') {
        res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'method not allowed' }));
        return;
      }
      handleAgentRequest(req, res, corsHeaders, options, record);
      return;
    }

    // 处理 /source 请求 - 获取源代码片段
    if (url.pathname === '/source') {
      let file = decodeURIComponent(params.get('file') || '');
      if (ProjectRootPath && !path.isAbsolute(file)) {
        file = `${ProjectRootPath}/${file}`;
      }
      const line = Number(params.get('line') || 1);
      const context = getSourceContext(file, line);

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(context));
      return;
    }

    // 原有逻辑：打开 IDE
    let file = decodeURIComponent(params.get('file') as string);
    if (ProjectRootPath && !path.isAbsolute(file)) {
      file = `${ProjectRootPath}/${file}`;
    }
    if (
      options?.pathType === 'relative' &&
      ProjectRootPath &&
      !file.startsWith(ProjectRootPath)
    ) {
      res.writeHead(403, corsHeaders);
      res.end('not allowed to open this file');
      return;
    }
    const line = Number(params.get('line'));
    const column = Number(params.get('column'));
    res.writeHead(200, corsHeaders);
    res.end('ok');
    // 调用 hooks
    options?.hooks?.afterInspectRequest?.(options, { file, line, column });
    // 打开 IDE
    launchIDE({
      file,
      line,
      column,
      editor: options?.editor,
      method: options?.openIn,
      format: options?.pathFormat,
      rootDir: record?.envDir,
    });
  });

  // 寻找可用接口
  portFinder.getPort(
    { port: options?.port ?? DefaultPort },
    (err: Error, port: number) => {
      if (err) {
        throw err;
      }
      server.listen(port, () => {
        callback(port);
      });
    }
  );
  return server;
}

export async function startServer(options: CodeOptions, record: RecordInfo) {
  if (getProjectRecord(record)?.port) {
    return;
  }
  let restartServer = !getProjectRecord(record)?.findPort;

  if (restartServer) {
    const findPort = new Promise<number>((resolve) => {
      const agentToken = createAgentToken(options);
      record.agentToken = agentToken;
      setProjectRecord(record, 'agentToken', agentToken);
      // create server
      createServer(
        (port: number) => {
          resolve(port);
          if (options.printServer) {
            const info = [
              chalk.blue('[lovinsp]'),
              'Server is running on:',
              chalk.green(`http://${getIP(options.ip || 'localhost')}:${port}`),
            ];
            console.log(info.join(' '));
          }
        },
        options,
        record
      );
    });
    // record the server of current project
    setProjectRecord(record, 'findPort', 1);
    const port = await findPort;
    setProjectRecord(record, 'port', port);
  }

  if (!getProjectRecord(record)?.port) {
    const port = await findPort(record);
    setProjectRecord(record, 'port', port);
  }
}
