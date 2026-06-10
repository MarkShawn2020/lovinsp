// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LovinspComponent } from '@/core/src/client';

describe('handleKeyUp', () => {
  let component: LovinspComponent;

  beforeEach(() => {
    component = new LovinspComponent();
    document.body.appendChild(component);
    component.isTracking = vi.fn().mockReturnValue(false);
    component.removeCover = vi.fn();
  });

  afterEach(() => {
    document.body.removeChild(component);
    vi.clearAllMocks();
  });

  it('removes the overlay when the keyup event is no longer tracking', () => {
    const event = new KeyboardEvent('keyup', { key: 'Alt' });

    component.handleKeyUp(event);

    expect(component.removeCover).toHaveBeenCalled();
  });

  it('keeps the overlay while the keyup event is still tracking', () => {
    vi.mocked(component.isTracking).mockReturnValue(true);
    const event = new KeyboardEvent('keyup', { key: 'Alt' });

    component.handleKeyUp(event);

    expect(component.removeCover).not.toHaveBeenCalled();
  });

  it('uses the same tracking rule for different released keys', () => {
    const keys = ['Alt', 'Control', 'Shift', 'A', 'Enter', 'Escape'];

    keys.forEach((key) => {
      vi.mocked(component.removeCover).mockClear();
      component.handleKeyUp(new KeyboardEvent('keyup', { key }));
      expect(component.removeCover).toHaveBeenCalled();
    });
  });

  it('uses isTracking even when modifier flags are present', () => {
    const event = new KeyboardEvent('keyup', {
      key: 'A',
      altKey: true,
      ctrlKey: true,
      shiftKey: true,
    });

    component.handleKeyUp(event);

    expect(component.isTracking).toHaveBeenCalledWith(event);
    expect(component.removeCover).toHaveBeenCalled();
  });
});
