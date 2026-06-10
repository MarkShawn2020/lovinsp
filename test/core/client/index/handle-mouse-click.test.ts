// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LovinspComponent } from '@/core/src/client';

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

function createMouseClick() {
  const event = new MouseEvent('click', { cancelable: true });
  const preventDefault = vi.spyOn(event, 'preventDefault');
  const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation');
  return { event, preventDefault, stopImmediatePropagation };
}

describe('handleMouseClick', () => {
  let component: LovinspComponent;

  beforeEach(() => {
    component = new LovinspComponent();
    document.body.appendChild(component);
    component.isTracking = vi.fn().mockReturnValue(true);
    component.trackCode = vi.fn();
    component.removeCover = vi.fn();
  });

  afterEach(() => {
    document.body.removeChild(component);
    vi.clearAllMocks();
  });

  describe('Preferred Action Logic', () => {
    it('falls back to locate when copy is disabled', async () => {
      component.show = true;
      component.copy = false;
      component.locate = true;
      component.defaultAction = 'copy';
      const { event } = createMouseClick();

      component.handleMouseClick(event);
      await nextFrame();

      expect(component.trackCode).toHaveBeenCalledWith('locate');
    });

    it('respects an explicit locate defaultAction', async () => {
      component.show = true;
      component.defaultAction = 'locate';
      const { event } = createMouseClick();

      component.handleMouseClick(event);
      await nextFrame();

      expect(component.trackCode).toHaveBeenCalledWith('locate');
    });

    it('falls back to target when locate is disabled', async () => {
      component.show = true;
      component.copy = false;
      component.locate = false;
      component.target = 'https://example.com/{file}';
      component.defaultAction = 'locate';
      const { event } = createMouseClick();

      component.handleMouseClick(event);
      await nextFrame();

      expect(component.trackCode).toHaveBeenCalledWith('target');
    });

    it('clears the overlay without tracking when no actions are enabled', () => {
      component.show = true;
      component.copy = false;
      component.locate = false;
      component.target = '';
      const { event } = createMouseClick();

      component.handleMouseClick(event);

      expect(component.trackCode).not.toHaveBeenCalled();
      expect(component.removeCover).toHaveBeenCalled();
    });
  });

  describe('Basic Functionality', () => {
    it('executes the default inspector action when tracking and visible', async () => {
      component.show = true;
      const { event, preventDefault, stopImmediatePropagation } =
        createMouseClick();

      component.handleMouseClick(event);
      await nextFrame();

      expect(preventDefault).toHaveBeenCalled();
      expect(stopImmediatePropagation).toHaveBeenCalled();
      expect(component.trackCode).toHaveBeenCalledWith('copy');
      expect(component.removeCover).toHaveBeenCalled();
    });

    it('does not clear the overlay after action execution in locked mode', async () => {
      component.show = true;
      component.locked = true;
      const { event } = createMouseClick();

      component.handleMouseClick(event);
      await nextFrame();

      expect(component.trackCode).toHaveBeenCalledWith('copy');
      expect(component.removeCover).not.toHaveBeenCalled();
    });
  });

  describe('No Action Conditions', () => {
    it('blocks page clicks while tracking even when the overlay is hidden', () => {
      component.show = false;
      const { event, preventDefault, stopImmediatePropagation } =
        createMouseClick();

      component.handleMouseClick(event);

      expect(preventDefault).toHaveBeenCalled();
      expect(stopImmediatePropagation).toHaveBeenCalled();
      expect(component.trackCode).not.toHaveBeenCalled();
      expect(component.removeCover).not.toHaveBeenCalled();
    });

    it('does not take action when not tracking', () => {
      component.show = true;
      vi.mocked(component.isTracking).mockReturnValue(false);
      const { event, preventDefault, stopImmediatePropagation } =
        createMouseClick();

      component.handleMouseClick(event);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(stopImmediatePropagation).not.toHaveBeenCalled();
      expect(component.trackCode).not.toHaveBeenCalled();
      expect(component.removeCover).not.toHaveBeenCalled();
    });
  });

  describe('Touch Events', () => {
    it('handles touch events with the same tracking flow', async () => {
      component.show = true;
      const event = new TouchEvent('touchstart', { cancelable: true });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const stopImmediatePropagation = vi.spyOn(
        event,
        'stopImmediatePropagation'
      );

      component.handleMouseClick(event);
      await nextFrame();

      expect(preventDefault).toHaveBeenCalled();
      expect(stopImmediatePropagation).toHaveBeenCalled();
      expect(component.trackCode).toHaveBeenCalledWith('copy');
      expect(component.removeCover).toHaveBeenCalled();
    });
  });

  describe('Method Call Order', () => {
    it('prevents the page click before running the inspector action', async () => {
      const calls: string[] = [];
      component.show = true;
      component.trackCode = vi.fn(() => calls.push('trackCode'));
      component.removeCover = vi.fn(() => calls.push('removeCover'));

      const event = new MouseEvent('click', { cancelable: true });
      event.preventDefault = vi.fn(() => calls.push('preventDefault'));
      event.stopImmediatePropagation = vi.fn(() =>
        calls.push('stopImmediatePropagation')
      );

      component.handleMouseClick(event);
      await nextFrame();

      expect(calls).toEqual([
        'preventDefault',
        'stopImmediatePropagation',
        'trackCode',
        'removeCover',
      ]);
    });
  });
});
