// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LovinspComponent } from '@/core/src/client';

describe('agent panel interaction', () => {
  let component: LovinspComponent;

  beforeEach(() => {
    component = new LovinspComponent();
    component.agent = true;
    component.show = true;
    component.element = {
      name: 'Button',
      path: 'src/Button.tsx',
      line: 10,
      column: 5,
      width: 120,
      height: 32,
    };
    document.body.appendChild(component);
  });

  afterEach(() => {
    document.body.removeChild(component);
    vi.clearAllMocks();
  });

  it('pins the agent panel when the tracking keys are released', () => {
    component.isTracking = vi.fn().mockReturnValue(false);
    component.removeCover = vi.fn();

    component.handleKeyUp(new KeyboardEvent('keyup', { key: 'Alt' }));

    expect(component.agentPanelPinned).toBe(true);
    expect(component.agentSidebarOpen).toBe(true);
    expect(component.agentMessages).toMatchObject([
      {
        role: 'context',
        content: 'Selected <Button>',
        contextKey: 'src/Button.tsx:10:5',
      },
    ]);
    expect(component.removeCover).not.toHaveBeenCalled();
  });

  it('pins the agent panel instead of executing the default inspector action', () => {
    component.isTracking = vi.fn().mockReturnValue(true);
    component.trackCode = vi.fn();
    component.removeCover = vi.fn();
    const event = new MouseEvent('click', { cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation');

    component.handleMouseClick(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopImmediatePropagation).toHaveBeenCalled();
    expect(component.agentPanelPinned).toBe(true);
    expect(component.agentSidebarOpen).toBe(true);
    expect(component.trackCode).not.toHaveBeenCalled();
    expect(component.removeCover).not.toHaveBeenCalled();
  });

  it('keeps the pinned panel visible until force closed', () => {
    component.agentPanelPinned = true;
    component.removeCover();

    expect(component.show).toBe(true);

    component.removeCover(true);

    expect(component.show).toBe(false);
    expect(component.agentPanelPinned).toBe(false);
  });

  it('does not retarget the overlay while the sidebar is pinned and tracking is inactive', () => {
    component.agentPanelPinned = true;
    component.isTracking = vi.fn().mockReturnValue(false);
    component.renderCover = vi.fn();
    component.removeCover = vi.fn();

    component.handleMouseMove(new MouseEvent('mousemove'));

    expect(component.renderCover).not.toHaveBeenCalled();
    expect(component.removeCover).not.toHaveBeenCalled();
  });

  it('can retarget another component while the sidebar stays open', () => {
    const targetNode = document.createElement('div');
    targetNode.setAttribute('data-insp-path', 'src/Other.tsx:4:2:div');
    const event = new MouseEvent('mousemove');
    event.composedPath = vi.fn().mockReturnValue([targetNode, document.body]);
    component.agentPanelPinned = true;
    component.isTracking = vi.fn().mockReturnValue(true);
    component.renderCover = vi.fn();

    component.handleMouseMove(event);

    expect(component.renderCover).toHaveBeenCalledWith(targetNode);
  });
});
