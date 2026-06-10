import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LovinspComponent } from '@/core/src/client';

describe('submitAgentRequest', () => {
  let component: LovinspComponent;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    component = new LovinspComponent();
    component.agent = true;
    component.agentToken = 'token-1';
    component.ip = 'localhost';
    component.port = 5678;
    component.agentPrompt = 'Make the button primary';
    component.element = {
      path: 'src/App.tsx',
      line: 12,
      column: 7,
      name: 'button',
      width: 80,
      height: 32,
      textContent: 'Save',
    };
    component.ancestorChain = ['App', 'Toolbar', 'button'];
    component.sourceContext = {
      lines: ['<button>Save</button>'],
      startLine: 12,
      targetLine: 12,
    };
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, message: 'done' }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the selected source context to the local agent endpoint', async () => {
    await component.submitAgentRequest();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5678/agent',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lovinsp-Agent-Token': 'token-1',
        },
      })
    );

    const request = fetchMock.mock.calls[0][1];
    const body = JSON.parse(request.body);
    expect(body).toMatchObject({
      prompt: 'Make the button primary',
      source: {
        file: 'src/App.tsx',
        line: 12,
        column: 7,
        name: 'button',
        textContent: 'Save',
        ancestorChain: ['App', 'Toolbar', 'button'],
        sourceContext: {
          lines: ['<button>Save</button>'],
          startLine: 12,
          targetLine: 12,
        },
      },
    });
    expect(component.agentStatus).toBe('success');
    expect(component.agentMessage).toBe('done');
    expect(component.agentPrompt).toBe('');
    expect(component.agentSidebarOpen).toBe(true);
    expect(component.agentMessages).toMatchObject([
      {
        role: 'user',
        content: 'Make the button primary',
        source: {
          path: 'src/App.tsx',
          line: 12,
          column: 7,
          name: 'button',
        },
      },
      {
        role: 'assistant',
        content: 'done',
        status: 'success',
      },
    ]);
  });

  it('does not post when agent is disabled', async () => {
    component.agent = false;

    await component.submitAgentRequest();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
