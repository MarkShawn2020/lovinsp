import { describe, expect, it, vi } from 'vitest';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const readFileSync = (file: Parameters<typeof actual.readFileSync>[0], ...args: any[]) => {
    if (String(file).endsWith('client.umd.js') || String(file).endsWith('client.iife.js')) {
      return '';
    }
    return (actual.readFileSync as any)(file, ...args);
  };

  return {
    ...actual,
    default: {
      ...actual,
      readFileSync,
    },
    readFileSync,
  };
});

const { getWebComponentCode } = await import('@/core/src/server/use-client');

describe('getWebComponentCode', () => {
  it('reuses and configures an existing inspector element', () => {
    const code = getWebComponentCode(
      {
        bundler: 'vite',
        agent: {
          command: 'codex',
          placeholder: 'Describe a change',
          submitLabel: 'Codex',
        },
      },
      5685,
      'token-123'
    );

    expect(code).toContain("var inspectorTagName = 'lovinsp-component-5685';");
    expect(code).toContain('customElements.define(inspectorTagName, class LovinspScopedComponent extends InspectorElement {})');
    expect(code).toContain('var inspector = document.documentElement.querySelector(inspectorTagName)');
    expect(code).toContain("if (!inspector) {");
    expect(code).toContain('inspector = document.createElement(inspectorTagName)');
    expect(code).toContain('inspector.agent = !!true;');
    expect(code).toContain('inspector.agentToken = "token-123";');
    expect(code).not.toContain("if (!document.documentElement.querySelector('lovinsp-component'))");
  });
});
