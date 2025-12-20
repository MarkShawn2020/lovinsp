// 启动本地接口，访问时唤起vscode
import http from 'http';
import fs from 'fs';
import portFinder from 'portfinder';
import { launchIDE } from 'launch-ide';
import { DefaultPort } from '../shared/constant';
import { getIP, getProjectRecord, setProjectRecord, findPort } from '../shared';
import type { PathType, CodeOptions, RecordInfo } from '../shared';
import { execSync } from 'child_process';
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
      // create server
      createServer(
        (port: number) => {
          resolve(port);
          if (options.printServer) {
            const info = [
              chalk.blue('[lovinsp]'),
              'Server is running on:',
              chalk.green(
                `http://${getIP(options.ip || 'localhost')}:${
                  options.port ?? DefaultPort
                }`
              ),
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
