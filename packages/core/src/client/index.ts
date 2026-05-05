import { LitElement, TemplateResult, css, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { PathName, DefaultPort } from '../shared';
import { formatOpenPath } from 'launch-ide';
import { DesignTokens } from '../shared/design-tokens';

const styleId = '__code-inspector-unique-id';
const AstroFile = 'data-astro-source-file';
const AstroLocation = 'data-astro-source-loc';

const MacHotKeyMap = {
  ctrlKey: '^control',
  altKey: '⌥option',
  metaKey: '⌘command',
  shiftKey: 'shift',
};

const WindowsHotKeyMap = {
  ctrlKey: 'Ctrl',
  altKey: 'Alt',
  metaKey: '⊞Windows',
  shiftKey: 'Shift',
};

interface CodeInspectorHtmlElement extends HTMLElement {
  'data-insp-path': string;
}

interface Position {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  transform?: string;
  maxHeight?: string;
}

interface SourceInfo {
  name: string; // tagName
  path: string;
  line: number;
  column: number;
}

interface ClientSourcePriorityRule {
  match: string;
  priority: number;
  regexp?: boolean;
  flags?: string;
}

interface SourceCandidate {
  element: HTMLElement;
  sourceInfo: SourceInfo;
}

interface ElementInfo extends SourceInfo {
  width: number;
  height: number;
  textContent?: string;
}

interface ElementTipStyle {
  vertical: string;
  horizon: string;
  visibility: string;
  additionStyle?: Record<string, string>;
}

interface TreeNode extends ElementInfo {
  children: TreeNode[];
  element: HTMLElement;
  depth: number;
}

interface ActiveNode {
  top?: string;
  bottom?: string;
  left?: string;
  width?: string;
  content?: string;
  visibility?: 'visible' | 'hidden';
  class?: 'tooltip-top' | 'tooltip-bottom';
}

type InspectorAction = 'copy' | 'locate' | 'target' | 'all';
type TrackAction = InspectorAction | 'default';
type ResolvedAction = InspectorAction | 'none';

const PopperWidth = 300;
const MouseOffset = 20; // 悬浮窗与鼠标的偏移距离

function nextTick() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

export class LovinspComponent extends LitElement {
  @property()
  hotKeys: string = 'shiftKey,altKey';
  @property({ attribute: 'copy-keys' })
  copyKeys: string = '';
  @property({ attribute: 'locate-keys' })
  locateKeys: string = '';
  @property({ attribute: 'target-keys' })
  targetKeys: string = '';
  @property()
  port: number = DefaultPort;
  @property()
  hideConsole: boolean = false;
  @property()
  locate: boolean = true;
  @property()
  copy: boolean | string = true;
  @property({ attribute: 'default-action' })
  defaultAction: InspectorAction = 'copy';
  @property()
  target: string = '';
  @property()
  ip: string = 'localhost';
  @property()
  version: string = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'dev';
  @property({ attribute: 'source-priority' })
  sourcePriority: string = '[]';

  @state()
  position = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    border: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  }; // 弹窗位置
  @state()
  element: ElementInfo = { name: '', line: 0, column: 0, path: '', width: 0, height: 0 }; // 选中节点信息
  @state()
  elementTipStyle: ElementTipStyle = {
    vertical: '',
    horizon: '',
    visibility: '',
  }; // 信息浮块位置类名
  @state()
  show = false; // 是否展示
  @state()
  showNodeTree = false; // 是否展示图层面板
  @state()
  nodeTreePosition: Position = {}; // 图层面板位置
  @state()
  nodeTree: TreeNode | null = null; // 节点树
  @state()
  dragging = false; // 是否正在拖拽中
  @state()
  mousePosition = { baseX: 0, baseY: 0, moveX: 0, moveY: 0 };
  @state()
  preUserSelect = '';
  @state()
  sendType: 'xhr' | 'img' = 'xhr';
  @state()
  activeNode: ActiveNode = {};
  @state()
  currentMode: InspectorAction | null = null; // 全局共享的当前操作模式（基于键盘状态）
  @state()
  mouseX = 0; // 当前鼠标 X 坐标
  @state()
  mouseY = 0; // 当前鼠标 Y 坐标
  @state()
  sourceContext: { lines: string[], startLine: number, targetLine: number } | null = null; // 源代码上下文
  @state()
  locked = false; // 锁定模式：悬浮窗始终显示，无需按住快捷键
  @state()
  ancestorChain: string[] = []; // 祖先组件名链（从根到当前）

  private sourceContextAbortController: AbortController | null = null;
  private sourcePriorityCacheKey = '';
  private sourcePriorityRuleCache: ClientSourcePriorityRule[] = [];

  // 用于防止双指触摸板右键误触发 click
  private pendingClickAction: (() => void) | null = null;

  @query('#code-inspector-container')
  codeInspectorContainerRef!: HTMLDivElement;
  @query('#element-info')
  elementInfoRef!: HTMLDivElement;
  @query('#inspector-node-tree')
  nodeTreeRef!: HTMLDivElement;

  @query('.inspector-layer-title')
  nodeTreeTitleRef!: HTMLDivElement;
  @query('#node-tree-tooltip')
  nodeTreeTooltipRef!: HTMLDivElement;

  // 新的多模式检测系统
  private hasModeSpecificKeys(): boolean {
    return !!(this.copyKeys || this.locateKeys || this.targetKeys);
  }

  // 检测是否匹配指定的快捷键组合
  private matchesKeys(e: any, keysString: string): boolean {
    if (!keysString) return false;
    const keys = keysString.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return false;

    // 必须所有指定的键都按下
    const allKeysPressed = keys.every((key) => e[key]);
    if (!allKeysPressed) return false;

    // 确保没有按下额外的修饰键
    const modifierKeys = ['ctrlKey', 'altKey', 'metaKey', 'shiftKey'];
    const pressedKeys = modifierKeys.filter(key => e[key]);
    return pressedKeys.length === keys.length;
  }

  // 获取当前触发的操作（按键数多的优先，避免快捷键冲突）
  private getTriggeredAction(e: any): InspectorAction | null {
    if (!this.hasModeSpecificKeys()) {
      // 向后兼容：使用旧的 hotKeys 系统
      return this.hotKeys && this.hotKeys.split(',').every((key) => e[key.trim()])
        ? this.defaultAction
        : null;
    }

    // 新系统：按键数从多到少检测，避免子集触发
    const actions: Array<{ action: InspectorAction; keys: string; enabled: boolean }> = [
      { action: 'locate', keys: this.locateKeys, enabled: !!this.locate },
      { action: 'target', keys: this.targetKeys, enabled: !!this.target },
      { action: 'copy', keys: this.copyKeys, enabled: !!this.copy },
    ];

    // 按键数降序排序
    const sortedActions = actions
      .filter(a => a.enabled && a.keys)
      .sort((a, b) => {
        const aLen = a.keys.split(',').length;
        const bLen = b.keys.split(',').length;
        return bLen - aLen;
      });

    for (const { action, keys } of sortedActions) {
      if (this.matchesKeys(e, keys)) {
        return action;
      }
    }

    return null;
  }

  // 兼容旧的 isTracking 方法
  isTracking = (e: any) => {
    // 锁定模式下始终返回 true
    if (this.locked) {
      return true;
    }
    if (this.hasModeSpecificKeys()) {
      return this.getTriggeredAction(e) !== null;
    }
    return (
      this.hotKeys && this.hotKeys.split(',').every((key) => e[key.trim()])
    );
  };

  // 20px -> 20
  getDomPropertyValue = (target: HTMLElement, property: string) => {
    const computedStyle = window.getComputedStyle(target);
    return Number(computedStyle.getPropertyValue(property).replace('px', ''));
  };

  getElementSize = (
    target: HTMLElement,
    rect: DOMRect | DOMRectReadOnly = target.getBoundingClientRect()
  ): Pick<ElementInfo, 'width' | 'height'> => {
    const width = Number.isFinite(rect.width)
      ? rect.width
      : rect.right - rect.left;
    const height = Number.isFinite(rect.height)
      ? rect.height
      : rect.bottom - rect.top;
    return {
      width: Math.max(0, Math.round(width || 0)),
      height: Math.max(0, Math.round(height || 0)),
    };
  };

  // 计算 element-info 的最佳位置（基于鼠标位置，像 tooltip 一样跟随鼠标）
  calculateElementInfoPosition = async (_target: HTMLElement) => {
    const browserHeight = document.documentElement.clientHeight;
    const browserWidth = document.documentElement.clientWidth;

    await nextTick();

    const { width, height } = this.elementInfoRef.getBoundingClientRect();

    const offset = MouseOffset;

    // 计算四个方向的可用空间
    const spaceRight = browserWidth - this.mouseX;
    const spaceBottom = browserHeight - this.mouseY;

    let left: number;
    let top: number;

    // 水平方向：优先右侧
    if (spaceRight >= width + offset) {
      left = this.mouseX + offset;
    } else {
      left = this.mouseX - width - offset;
    }

    // 垂直方向：优先下方
    if (spaceBottom >= height + offset) {
      top = this.mouseY + offset;
    } else {
      top = this.mouseY - height - offset;
    }

    // 边界检查，确保不超出屏幕
    left = Math.max(0, Math.min(left, browserWidth - width));
    top = Math.max(0, Math.min(top, browserHeight - height));

    return {
      vertical: '',
      horizon: '',
      additionStyle: {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        right: 'auto',
        bottom: 'auto',
        transform: 'none',
      },
    };
  };

  // 渲染遮罩层
  renderCover = async (target: HTMLElement) => {
    // 设置 target 的位置
    const rect = target.getBoundingClientRect();
    const { top, right, bottom, left } = rect;
    this.position = {
      top,
      right,
      bottom,
      left,
      border: {
        top: this.getDomPropertyValue(target, 'border-top-width'),
        right: this.getDomPropertyValue(target, 'border-right-width'),
        bottom: this.getDomPropertyValue(target, 'border-bottom-width'),
        left: this.getDomPropertyValue(target, 'border-left-width'),
      },
      padding: {
        top: this.getDomPropertyValue(target, 'padding-top'),
        right: this.getDomPropertyValue(target, 'padding-right'),
        bottom: this.getDomPropertyValue(target, 'padding-bottom'),
        left: this.getDomPropertyValue(target, 'padding-left'),
      },
      margin: {
        top: this.getDomPropertyValue(target, 'margin-top'),
        right: this.getDomPropertyValue(target, 'margin-right'),
        bottom: this.getDomPropertyValue(target, 'margin-bottom'),
        left: this.getDomPropertyValue(target, 'margin-left'),
      },
    };

    // 设置位置类名
    this.elementTipStyle = {
      vertical: '',
      horizon: '',
      visibility: 'hidden',
    };

    // 增加鼠标光标样式
    this.addGlobalCursorStyle();
    // 防止 select
    if (!this.preUserSelect) {
      this.preUserSelect = getComputedStyle(document.body).userSelect;
    }
    document.body.style.userSelect = 'none';
    const sourceInfo = this.getSourceInfo(target);
    const { width, height } = this.getElementSize(target, rect);
    const textContent = this.getElementTextContent(target);
    this.element = {
      name: sourceInfo?.name || target.tagName.toLowerCase(),
      path: sourceInfo?.path || '',
      line: sourceInfo?.line ?? NaN,
      column: sourceInfo?.column ?? NaN,
      width,
      height,
      textContent,
    };
    // 计算祖先组件链（从根到当前）
    this.ancestorChain = this.getAncestorChain(target);
    this.show = true;
    if (!this.showNodeTree) {
      const { vertical, horizon, additionStyle } =
        await this.calculateElementInfoPosition(target);
      this.elementTipStyle = {
        vertical,
        horizon,
        visibility: 'visible',
        additionStyle,
      };
    }
    // 获取源代码上下文
    this.fetchSourceContext();
  };

  getAstroFilePath = (target: HTMLElement): string => {
    if (target.getAttribute?.(AstroFile)) {
      return `${target.getAttribute(AstroFile)}:${target.getAttribute(
        AstroLocation
      )}:${target.tagName.toLowerCase()}`;
    }
    return '';
  };

  // 获取元素的文本内容（包括所有子元素）
  getElementTextContent = (target: HTMLElement): string | undefined => {
    const text = target.textContent?.trim();
    if (!text) return undefined;
    return text.length > 100 ? text.slice(0, 100) : text;
  };

  getSourceInfo = (target: HTMLElement): SourceInfo | null => {
    let paths =
      target.getAttribute?.(PathName) ||
      (target as CodeInspectorHtmlElement)[PathName] ||
      this.getAstroFilePath(target); // Todo: transform astro inside

    if (!paths) {
      return null;
    }

    const segments = paths.split(':');
    const name = segments[segments.length - 1];
    const column = Number(segments[segments.length - 2]);
    const line = Number(segments[segments.length - 3]);
    const path = segments.slice(0, segments.length - 3).join(':');
    return { name, path, line, column };
  };

  // 获取祖先组件链（从根到当前）
  getAncestorChain = (target: HTMLElement): string[] => {
    const chain: string[] = [];
    let el: HTMLElement | null = target;
    while (el) {
      const info = this.getSourceInfo(el);
      if (info?.name) {
        chain.unshift(info.name);
      }
      el = el.parentElement;
    }
    return chain;
  };

  removeCover = (force?: boolean | MouseEvent) => {
    // 锁定模式下不移除遮罩层（除非强制）
    if (force !== true && (this.nodeTree || this.locked)) {
      return;
    }
    this.show = false;
    this.sourceContext = null;
    this.sourceContextAbortController?.abort();
    this.removeGlobalCursorStyle();
    document.body.style.userSelect = this.preUserSelect;
    this.preUserSelect = '';
  };

  renderLayerPanel = (
    nodeTree: TreeNode,
    { x, y }: { x: number; y: number }
  ) => {
    const browserWidth = document.documentElement.clientWidth;
    const browserHeight = document.documentElement.clientHeight;

    const rightToViewPort = browserWidth - x;
    const bottomToViewPort = browserHeight - y;
    let position: Position = {};

    if (rightToViewPort < x) {
      position['right'] = rightToViewPort + 'px';
      // 检测是否横向一定超出屏幕
      if (x < PopperWidth) {
        position['transform'] = `translateX(${PopperWidth - x}px)`;
      }
    } else {
      position['left'] = x + 'px';
      // 检测是否横向一定超出屏幕
      if (rightToViewPort < PopperWidth) {
        position['transform'] = `translateX(-${
          PopperWidth - rightToViewPort
        }px)`;
      }
    }

    if (bottomToViewPort < y) {
      position['bottom'] = bottomToViewPort + 'px';
      position['maxHeight'] = `${y - 10}px`;
    } else {
      position['top'] = y + 'px';
      position['maxHeight'] = `${browserHeight - y - 10}px`;
    }
    this.nodeTreePosition = position;
    this.nodeTree = nodeTree;
    this.showNodeTree = true;
  };

  removeLayerPanel = () => {
    this.showNodeTree = false;
    this.nodeTree = null;
    this.activeNode = {};
  };

  // 全局键盘监听器：统一更新当前模式状态
  handleGlobalKeyChange = (e: KeyboardEvent) => {
    if (this.hasModeSpecificKeys()) {
      // 新系统：使用完整的模式检测逻辑
      const triggeredMode = this.getTriggeredAction(e);

      if (triggeredMode) {
        this.currentMode = triggeredMode;
      } else {
        // 如果没有快捷键匹配，回退到默认模式
        const defaultMode = this.getDefaultAction();
        this.currentMode = defaultMode === 'none' ? null : (defaultMode as InspectorAction);
      }
    } else {
      // 旧系统：使用默认模式
      const defaultMode = this.getDefaultAction();
      this.currentMode = defaultMode === 'none' ? null : (defaultMode as InspectorAction);
    }
  };

  addGlobalCursorStyle = () => {
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.setAttribute('id', styleId);
      style.innerText = `body * {
        cursor: pointer !important;
      }`;
      document.body.appendChild(style);
    }
  };

  removeGlobalCursorStyle = () => {
    const style = document.getElementById(styleId);
    if (style) {
      style.remove();
    }
  };

  // 获取源代码上下文
  fetchSourceContext = async () => {
    // 取消之前的请求
    this.sourceContextAbortController?.abort();
    this.sourceContextAbortController = new AbortController();

    const { path, line } = this.element;
    if (!path || !line) {
      this.sourceContext = null;
      return;
    }

    try {
      const file = encodeURIComponent(path);
      const url = `http://${this.ip}:${this.port}/source?file=${file}&line=${line}`;
      const response = await fetch(url, { signal: this.sourceContextAbortController.signal });
      const data = await response.json();
      if (data) {
        this.sourceContext = { ...data, targetLine: line };
      } else {
        this.sourceContext = null;
      }
    } catch {
      // 忽略 abort 错误
    }
  };

  sendXHR = () => {
    const file = encodeURIComponent(this.element.path);
    const url = `http://${this.ip}:${this.port}/?file=${file}&line=${this.element.line}&column=${this.element.column}`;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.send();
    xhr.addEventListener('error', () => {
      this.sendType = 'img';
      this.sendImg();
    });
  };

  // 通过img方式发送请求，防止类似企业微信侧边栏等内置浏览器拦截逻辑
  sendImg = () => {
    const file = encodeURIComponent(this.element.path);
    const url = `http://${this.ip}:${this.port}/?file=${file}&line=${this.element.line}&column=${this.element.column}`;
    const img = document.createElement('img');
    img.src = url;
  };

  buildTargetUrl = () => {
    let targetUrl = this.target;

    const { path, line, column } = this.element;
    const replacementMap: Record<string, string | number> = {
      '{file}': path,
      '{line}': line,
      '{column}': column,
    };
    for (let replacement in replacementMap) {
      targetUrl = targetUrl.replace(
        new RegExp(replacement, 'g'),
        String(replacementMap[replacement])
      );
    }

    return targetUrl;
  };

  // 触发功能的处理
  trackCode = (action: TrackAction = 'default') => {
    let resolvedAction: ResolvedAction;
    if (action === 'default') {
      resolvedAction = this.getDefaultAction();
    } else if (action === 'all') {
      resolvedAction = this.copy || this.locate || this.target ? 'all' : 'none';
    } else if (this.isActionEnabled(action)) {
      resolvedAction = action;
    } else {
      resolvedAction = 'none';
    }

    if (resolvedAction === 'none') {
      return;
    }

    const shouldLocate =
      (resolvedAction === 'locate' || resolvedAction === 'all') && this.locate;
    const shouldCopy =
      (resolvedAction === 'copy' || resolvedAction === 'all') && !!this.copy;
    const shouldTarget =
      (resolvedAction === 'target' || resolvedAction === 'all') && !!this.target;

    if (!shouldLocate && !shouldCopy && !shouldTarget) {
      return;
    }

    if (shouldLocate) {
      if (this.sendType === 'xhr') {
        this.sendXHR();
      } else {
        this.sendImg();
      }
    }
    if (shouldCopy) {
      const path = formatOpenPath(
        this.element.path,
        String(this.element.line),
        String(this.element.column),
        this.copy
      );
      // 格式：file:line:col(祖先1>祖先2>当前)
      const chainStr = this.ancestorChain.length > 0
        ? `(${this.ancestorChain.join('>')})`
        : '';
      this.copyToClipboard(`${path[0]}${chainStr}`);
    }
    if (shouldTarget) {
      window.open(this.buildTargetUrl(), '_blank');
    }
    window.dispatchEvent(
      new CustomEvent('lovinsp:trackCode', {
        detail: this.element,
      })
    );
  };

  private getDefaultAction(): ResolvedAction {
    const resolved = this.resolvePreferredAction(this.defaultAction);
    if (resolved !== 'none' && resolved !== this.defaultAction) {
      this.defaultAction = resolved;
    }
    return resolved;
  }

  private isActionEnabled(action: Exclude<InspectorAction, 'all'>): boolean {
    if (action === 'copy') {
      return !!this.copy;
    }
    if (action === 'locate') {
      return !!this.locate;
    }
    return !!this.target;
  }

  private resolvePreferredAction(
    preferred: InspectorAction
  ): ResolvedAction {
    if (preferred === 'all') {
      return this.copy || this.locate || this.target ? 'all' : 'none';
    }
    if (this.isActionEnabled(preferred)) {
      return preferred;
    }
    const fallbackOrder: Array<Exclude<InspectorAction, 'all'>> = [
      'copy',
      'locate',
      'target',
    ];
    for (const candidate of fallbackOrder) {
      if (candidate !== preferred && this.isActionEnabled(candidate)) {
        return candidate;
      }
    }
    return 'none';
  }

  // Legacy mode switching removed - now using behavior.keys configuration

  // Get mode-specific colors for visual differentiation
  private getModeColors(mode: InspectorAction | ResolvedAction | null): {
    overlay: string;
    accent: string;
    badge: string;
    badgeText: string;
  } {
    const { colors } = DesignTokens;

    switch (mode) {
      case 'copy':
        // Claude fig (purple) - warm, creative
        return {
          overlay: colors.mode.copy.light,
          accent: colors.mode.copy.accent,
          badge: colors.mode.copy.base,
          badgeText: colors.text.white
        };
      case 'locate':
        // Claude cactus (green) - stable, reliable
        return {
          overlay: colors.mode.locate.light,
          accent: colors.mode.locate.accent,
          badge: colors.mode.locate.base,
          badgeText: colors.text.white
        };
      case 'target':
        // Claude sky (blue) - open, clear
        return {
          overlay: colors.mode.target.light,
          accent: colors.mode.target.accent,
          badge: colors.mode.target.base,
          badgeText: colors.text.white
        };
      case 'all':
        // Primary brand color
        return {
          overlay: 'rgba(217, 119, 87, 0.15)',
          accent: '#C66E52',
          badge: colors.primary,
          badgeText: colors.text.white
        };
      default:
        // Neutral default using Claude's soft palette
        return {
          overlay: colors.background.overlay,
          accent: colors.text.faded,
          badge: colors.border.default,
          badgeText: colors.text.main
        };
    }
  }

  // Get mode icon for visual indication
  private getModeIcon(mode: InspectorAction | ResolvedAction | null): string {
    switch (mode) {
      case 'copy':
        return '📋';  // Clipboard
      case 'locate':
        return '🎯';  // Target/Locate
      case 'target':
        return '🔗';  // Link
      case 'all':
        return '⚡';  // All actions
      default:
        return '🔍';  // Default search
    }
  }

  private getActionLabel(action: ResolvedAction): string {
    switch (action) {
      case 'copy':
        return 'Copy Path';
      case 'locate':
        return 'Open in IDE';
      case 'target':
        return 'Open Target Link';
      case 'all':
        return 'Copy + Open';
      default:
        return 'Disabled';
    }
  }

  showNotification(message: string, type: 'success' | 'error' = 'success') {
    const notification = document.createElement('div');
    notification.className = `code-inspector-notification code-inspector-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('code-inspector-notification-show');
    });

    // Remove after 2 seconds
    setTimeout(() => {
      notification.classList.remove('code-inspector-notification-show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }

  copyToClipboard(text: string) {
    try {
      if (typeof navigator?.clipboard?.writeText === 'function') {
        navigator.clipboard.writeText(text).then(() => {
          this.showNotification('✓ Copied to clipboard');
        }).catch(() => {
          this.fallbackCopy(text);
        });
      } else {
        this.fallbackCopy(text);
      }
    } catch (error) {
      this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        this.showNotification('✓ Copied to clipboard');
      } else {
        this.showNotification('✗ Copy failed', 'error');
      }
    } catch (error) {
      this.showNotification('✗ Copy failed', 'error');
    }
  }

  // 拖拽节点树面板
  handleDrag = (e: MouseEvent | TouchEvent) => {
    if (this.dragging) {
      const ref = this.nodeTreeRef;
      ref.style.left =
        this.mousePosition.baseX +
        (this.getMousePosition(e).x - this.mousePosition.moveX) +
        'px';
      ref.style.top =
        this.mousePosition.baseY +
        (this.getMousePosition(e).y - this.mousePosition.moveY) +
        'px';
      this.nodeTreePosition.left = ref.style.left;
      this.nodeTreePosition.top = ref.style.top;
    }
  };

  isSamePositionNode = (node1: HTMLElement, node2: HTMLElement) => {
    const node1Rect = node1.getBoundingClientRect();
    const node2Rect = node2.getBoundingClientRect();
    return (
      node1Rect.top === node2Rect.top &&
      node1Rect.left === node2Rect.left &&
      node1Rect.right === node2Rect.right &&
      node1Rect.bottom === node2Rect.bottom
    );
  };

  private getSourcePriorityRules(): ClientSourcePriorityRule[] {
    if (this.sourcePriority === this.sourcePriorityCacheKey) {
      return this.sourcePriorityRuleCache;
    }

    this.sourcePriorityCacheKey = this.sourcePriority;
    try {
      const rules = JSON.parse(this.sourcePriority);
      this.sourcePriorityRuleCache = Array.isArray(rules)
        ? rules.filter(
            (rule): rule is ClientSourcePriorityRule =>
              typeof rule?.match === 'string' &&
              Number.isFinite(rule?.priority)
          )
        : [];
    } catch {
      this.sourcePriorityRuleCache = [];
    }

    return this.sourcePriorityRuleCache;
  }

  private getSourcePriorityScore(
    sourceInfo: SourceInfo,
    rules: ClientSourcePriorityRule[]
  ) {
    if (!rules.length) {
      return 0;
    }

    const sourceText = `${sourceInfo.path}:${sourceInfo.line}:${sourceInfo.column}:${sourceInfo.name}`;
    return rules.reduce((score, rule) => {
      if (rule.regexp) {
        try {
          return new RegExp(rule.match, rule.flags).test(sourceText)
            ? score + rule.priority
            : score;
        } catch {
          return score;
        }
      }

      return sourceText.includes(rule.match) ? score + rule.priority : score;
    }, 0);
  }

  private collectSourceCandidates(nodePath: HTMLElement[]): SourceCandidate[] {
    const candidates: SourceCandidate[] = [];

    for (const element of nodePath) {
      const sourceInfo = this.getSourceInfo(element);
      if (sourceInfo) {
        candidates.push({ element, sourceInfo });
      }
      // Todo: transform astro inside
      if (element.hasAttribute?.(AstroFile)) {
        break;
      }
    }

    return candidates;
  }

  private getDefaultSourceCandidate(
    candidates: SourceCandidate[]
  ): SourceCandidate | null {
    let targetCandidate = candidates[0];
    if (!targetCandidate) {
      return null;
    }

    for (let i = 1; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (this.isSamePositionNode(targetCandidate.element, candidate.element)) {
        // 优先寻找组件被调用处源码
        targetCandidate = candidate;
      }
    }

    return targetCandidate;
  }

  private getTargetSourceCandidate(
    nodePath: HTMLElement[]
  ): SourceCandidate | null {
    const candidates = this.collectSourceCandidates(nodePath);
    const defaultCandidate = this.getDefaultSourceCandidate(candidates);
    const rules = this.getSourcePriorityRules();

    if (!defaultCandidate || !rules.length) {
      return defaultCandidate;
    }

    let targetCandidate = defaultCandidate;
    let targetScore = this.getSourcePriorityScore(
      targetCandidate.sourceInfo,
      rules
    );

    for (const candidate of candidates) {
      const candidateScore = this.getSourcePriorityScore(
        candidate.sourceInfo,
        rules
      );
      if (candidateScore > targetScore) {
        targetCandidate = candidate;
        targetScore = candidateScore;
      }
    }

    return targetCandidate;
  }

  // 鼠标移动渲染遮罩层位置
  handleMouseMove = async (e: MouseEvent | TouchEvent) => {
    // 记录鼠标位置（使用视口坐标，与 fixed 定位的悬浮窗一致）
    if (e instanceof MouseEvent) {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    } else if (e.touches[0]) {
      this.mouseX = e.touches[0].clientX;
      this.mouseY = e.touches[0].clientY;
    }

    if (this.isTracking(e) && !this.dragging) {
      const nodePath = e.composedPath() as HTMLElement[];
      const targetCandidate = this.getTargetSourceCandidate(nodePath);
      if (targetCandidate) {
        this.renderCover(targetCandidate.element);
      } else {
        this.removeCover();
      }
    } else {
      this.removeCover();
    }
  };

  // 鼠标按下时阻止事件穿透到目标元素（如 select、checkbox 等）
  // 注意：只要按住快捷键就阻止，不管 overlay 是否显示
  // 因为 Portal 渲染的元素（如 Select 下拉选项）没有 data-insp-path，会导致 overlay 消失
  handleMouseDown = (e: MouseEvent | TouchEvent) => {
    if (this.isTracking(e)) {
      // 必须在 mousedown 阶段就阻止，否则原生控件（select/checkbox）会响应
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };

  // 鼠标点击执行 inspector 操作
  handleMouseClick = (e: MouseEvent | TouchEvent) => {
    if (this.isTracking(e)) {
      // 只要按住快捷键就阻止事件，防止穿透到 Portal 元素（如 Select 下拉选项）
      e.preventDefault();
      e.stopImmediatePropagation();

      // 如果导航窗已打开，点击导航窗外部只关闭导航窗，不执行 inspect 操作
      if (this.showNodeTree && !e.composedPath().includes(this.nodeTreeRef)) {
        this.removeLayerPanel();
        return;
      }

      if (this.show) {
        // 使用全局共享的当前模式
        const actionToExecute = this.currentMode || this.getDefaultAction();

        if (actionToExecute !== 'none') {
          // 延迟到下一帧执行，防止 Mac 触摸板双指右键被误识别为单击
          // 双指操作的 click 和 contextmenu 在同一事件循环中触发
          // 如果 contextmenu 触发，会清除 pendingClickAction
          this.pendingClickAction = () => {
            this.trackCode(actionToExecute as InspectorAction);
            // 锁定模式下不移除遮罩层，继续跟踪
            if (!this.locked) {
              this.removeCover();
            }
          };
          requestAnimationFrame(() => {
            if (this.pendingClickAction) {
              this.pendingClickAction();
              this.pendingClickAction = null;
            }
          });
          return;
        }
        // 清除遮罩层
        this.removeCover();
      }
    }
    if (!e.composedPath().includes(this.nodeTreeRef)) {
      this.removeLayerPanel();
    }
  };

  handleContextMenu = (e: MouseEvent) => {
    // 取消待执行的 click 操作，防止双指右键误触发
    this.pendingClickAction = null;

    if (this.isTracking(e) && !this.dragging) {
      // 必须同时阻止默认行为和事件传播，防止右键菜单和文本选择等行为透传
      e.preventDefault();
      e.stopImmediatePropagation();

      const nodePath = e.composedPath() as HTMLElement[];
      const nodeTree = this.generateNodeTree(nodePath);

      this.renderLayerPanel(nodeTree, { x: e.clientX, y: e.clientY });
    }
  };

  generateNodeTree = (nodePath: HTMLElement[]): TreeNode => {
    let root: TreeNode;

    let depth = 1;
    let preNode = null;

    for (const element of nodePath.reverse()) {
      const sourceInfo = this.getSourceInfo(element);
      if (!sourceInfo) continue;

      const { width, height } = this.getElementSize(element);
      const node: TreeNode = {
        ...sourceInfo,
        width,
        height,
        children: [],
        depth: depth++,
        element,
      };

      if (preNode) {
        preNode.children.push(node);
      } else {
        root = node;
      }
      preNode = node;
    }

    return root!;
  };

  // disabled 的元素及其子元素无法触发 click 事件，需要用 pointerdown 处理
  handlePointerDown = (e: PointerEvent) => {
    let disabled = false;
    let element = e.target as HTMLInputElement;
    while (element) {
      if (element.disabled) {
        disabled = true;
        break;
      }
      element = element.parentElement as HTMLInputElement;
    }
    if (!disabled) {
      return;
    }
    if (this.isTracking(e)) {
      if (this.show) {
        // 完全阻止事件传播和默认行为
        e.preventDefault();
        e.stopImmediatePropagation();
        // 唤醒 vscode
        this.trackCode();
        // 清除遮罩层
        this.removeCover();
      }
    }
  };

  // 监听键盘抬起，清除遮罩层
  handleKeyUp = (e: KeyboardEvent) => {
    if (!this.isTracking(e)) {
      this.removeCover();
    }
  };

  // 处理锁定模式切换 (Shift+Alt+T) 和 ESC 退出
  handleLockToggle = (e: KeyboardEvent) => {
    // ESC 退出锁定模式
    if (e.key === 'Escape' && this.locked) {
      this.locked = false;
      this.removeCover(true);
      this.removeLayerPanel();
      this.showNotification('Inspector unlocked');
      return;
    }

    // Shift+Alt+T 切换锁定模式
    // 使用 e.code 检测物理按键，因为 macOS 上 Option+Shift 会产生特殊字符
    if (e.code === 'KeyT' && e.shiftKey && e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.locked = !this.locked;
      if (this.locked) {
        this.showNotification('Inspector locked (ESC to exit)');
      } else {
        this.removeCover(true);
        this.removeLayerPanel();
        this.showNotification('Inspector unlocked');
      }
    }
  };

  // 阻止文本选择（Shift+点击会触发浏览器的扩展选择行为）
  handleSelectStart = (e: Event) => {
    // selectstart 事件没有修饰键信息，需要用全局状态判断
    if (this.show || this.showNodeTree) {
      e.preventDefault();
    }
  };

  // 打印功能提示信息
  printTip = () => {
    const agent = navigator.userAgent.toLowerCase();
    const isWindows = ['windows', 'win32', 'wow32', 'win64', 'wow64'].some(
      (item) => agent.toUpperCase().match(item.toUpperCase())
    );
    const hotKeyMap = isWindows ? WindowsHotKeyMap : MacHotKeyMap;

    if (this.hasModeSpecificKeys()) {
      // 新系统：显示每个操作的快捷键
      const hints: string[] = [];
      if (this.copyKeys && this.copy) {
        const keys = this.copyKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        hints.push(`${keys} to copy path`);
      }
      if (this.locateKeys && this.locate) {
        const keys = this.locateKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        hints.push(`${keys} to open in IDE`);
      }
      if (this.targetKeys && this.target) {
        const keys = this.targetKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        hints.push(`${keys} to open target`);
      }

      console.log(
        `%c[lovinsp v${this.version}]%c Press and hold: %c${hints.join('%c · %c')}`,
        'color: #006aff; font-weight: bolder; font-size: 12px;',
        'color: #006aff; font-size: 12px;',
        ...hints.flatMap(() => [
          'color: #00B42A; font-weight: bold; font-size: 12px;',
          'color: #006aff; font-size: 12px;'
        ])
      );
    } else {
      // 旧系统：向后兼容
      const keys = this.hotKeys
        .split(',')
        .map((item) => '%c' + hotKeyMap[item.trim() as keyof typeof hotKeyMap]);
      const colorCount = keys.length * 2 + 1;
      const colors = Array(colorCount)
        .fill('')
        .map((_, index) => {
          if (index % 2 === 0) {
            return 'color: #00B42A; font-family: PingFang SC; font-size: 12px;';
          } else {
            return 'color: #006aff; font-weight: bold; font-family: PingFang SC; font-size: 12px;';
          }
        });
      const replacement = '%c';
      const currentMode = this.getActionLabel(this.getDefaultAction());
      console.log(
        `${replacement}[lovinsp v${this.version}]${replacement} Press and hold ${keys.join(
          ` ${replacement}+ `
        )}${replacement} to enable the feature. (Current mode: ${currentMode})`,
        'color: #006aff; font-weight: bolder; font-size: 12px;',
        ...colors
      );
    }
    // 打印锁定模式提示
    console.log(
      '%c[lovinsp]%c Press %cShift+Alt+T%c to toggle lock mode (always show overlay), %cESC%c to exit.',
      'color: #006aff; font-weight: bolder; font-size: 12px;',
      'color: #006aff; font-size: 12px;',
      'color: #00B42A; font-weight: bold; font-size: 12px;',
      'color: #006aff; font-size: 12px;',
      'color: #00B42A; font-weight: bold; font-size: 12px;',
      'color: #006aff; font-size: 12px;'
    );
  };

  // 获取鼠标位置
  getMousePosition = (e: MouseEvent | TouchEvent) => {
    return {
      x: e instanceof MouseEvent ? e.pageX : e.touches[0]?.pageX,
      y: e instanceof MouseEvent ? e.pageY : e.touches[0]?.pageY,
    };
  };

  // 记录鼠标按下时初始位置（用于拖拽节点树面板）
  recordMousePosition = (e: MouseEvent | TouchEvent) => {
    const ref = this.nodeTreeRef;
    this.mousePosition = {
      baseX: ref.offsetLeft,
      baseY: ref.offsetTop,
      moveX: this.getMousePosition(e).x,
      moveY: this.getMousePosition(e).y,
    };
    this.dragging = true;
    e.preventDefault();
  };

  // 结束拖拽
  handleMouseUp = () => {
    if (this.dragging) {
      this.dragging = false;
    }
  };

  handleClickTreeNode = (node: TreeNode) => {
    this.element = node;

    // 使用全局共享的当前模式
    const actionToExecute = this.currentMode || this.getDefaultAction();

    if (actionToExecute !== 'none') {
      this.trackCode(actionToExecute as InspectorAction);
    }
    this.removeLayerPanel();
  };

  handleMouseEnterNode = async (e: MouseEvent, node: TreeNode) => {
    const { x, y, width, height } =
      (e.target as HTMLDivElement)!.getBoundingClientRect();
    this.activeNode = {
      width: width - 16 + 'px',
      left: x + 8 + 'px',
      visibility: 'hidden',
      top: `${y - 4}px`,
      bottom: '',
      content: `${node.path}:${node.line}:${node.column}`,
      class: 'tooltip-top',
    };

    this.renderCover(node.element);

    await nextTick();
    const { y: tooltipY } = this.nodeTreeTooltipRef!.getBoundingClientRect();
    if (tooltipY < 0) {
      this.activeNode = {
        ...this.activeNode,
        bottom: '',
        top: `${y + height + 4}px`,
        class: 'tooltip-bottom',
      };
    }
    this.activeNode = {
      ...this.activeNode,
      visibility: 'visible',
    };
  };

  handleMouseLeaveNode = () => {
    this.activeNode = {
      ...this.activeNode,
      visibility: 'hidden',
    };
    this.removeCover(true);
  };

  protected firstUpdated(): void {
    if (!this.hideConsole) {
      this.printTip();
    }
    window.addEventListener('mousemove', this.handleMouseMove, true);
    window.addEventListener('touchmove', this.handleMouseMove, true);
    window.addEventListener('mousemove', this.handleDrag, true);
    window.addEventListener('touchmove', this.handleDrag, true);
    // mousedown 必须在 click 之前阻止，防止事件穿透到原生控件
    window.addEventListener('mousedown', this.handleMouseDown, true);
    window.addEventListener('touchstart', this.handleMouseDown, true);
    window.addEventListener('click', this.handleMouseClick, true);
    window.addEventListener('pointerdown', this.handlePointerDown, true);
    window.addEventListener('keyup', this.handleKeyUp, true);
    // Global keyboard listeners for unified mode state management
    window.addEventListener('keydown', this.handleGlobalKeyChange, true);
    window.addEventListener('keyup', this.handleGlobalKeyChange, true);
    // Lock toggle listener (Shift+Alt+T and ESC)
    window.addEventListener('keydown', this.handleLockToggle, true);
    window.addEventListener('mouseleave', this.removeCover, true);
    window.addEventListener('mouseup', this.handleMouseUp, true);
    window.addEventListener('touchend', this.handleMouseUp, true);
    window.addEventListener('contextmenu', this.handleContextMenu, true);
    // 阻止 Shift+点击触发的文本选择
    window.addEventListener('selectstart', this.handleSelectStart, true);
  }

  disconnectedCallback(): void {
    window.removeEventListener('mousemove', this.handleMouseMove, true);
    window.removeEventListener('touchmove', this.handleMouseMove, true);
    window.removeEventListener('mousemove', this.handleDrag, true);
    window.removeEventListener('touchmove', this.handleDrag, true);
    window.removeEventListener('mousedown', this.handleMouseDown, true);
    window.removeEventListener('touchstart', this.handleMouseDown, true);
    window.removeEventListener('click', this.handleMouseClick, true);
    window.removeEventListener('pointerdown', this.handlePointerDown, true);
    window.removeEventListener('keyup', this.handleKeyUp, true);
    // Remove global keyboard listeners
    window.removeEventListener('keydown', this.handleGlobalKeyChange, true);
    window.removeEventListener('keyup', this.handleGlobalKeyChange, true);
    // Remove lock toggle listener
    window.removeEventListener('keydown', this.handleLockToggle, true);
    window.removeEventListener('mouseleave', this.removeCover, true);
    window.removeEventListener('mouseup', this.handleMouseUp, true);
    window.removeEventListener('touchend', this.handleMouseUp, true);
    window.removeEventListener('contextmenu', this.handleContextMenu, true);
    window.removeEventListener('selectstart', this.handleSelectStart, true);
  }

  renderNodeTree = (node: TreeNode): TemplateResult => html`
    <div
      class="inspector-layer"
      style="padding-left: ${node.depth * 8}px;"
      @mouseenter="${async (e: MouseEvent) =>
        await this.handleMouseEnterNode(e, node)}"
      @mouseleave="${this.handleMouseLeaveNode}"
      @click="${() => this.handleClickTreeNode(node)}"
    >
      &lt;${node.name}&gt;
    </div>
    ${node.children.map((child) => this.renderNodeTree(child))}
  `;

  render() {
    // Get mode-specific styling (unified global mode state)
    const currentMode = this.currentMode || this.getDefaultAction();
    const modeColors = this.getModeColors(currentMode);
    const modeIcon = this.getModeIcon(currentMode);

    const containerPosition = {
      display: this.show ? 'block' : 'none',
      top: `${this.position.top - this.position.margin.top}px`,
      left: `${this.position.left - this.position.margin.left}px`,
      height: `${
        this.position.bottom -
        this.position.top +
        this.position.margin.bottom +
        this.position.margin.top
      }px`,
      width: `${
        this.position.right -
        this.position.left +
        this.position.margin.right +
        this.position.margin.left
      }px`,
    };
    const marginPosition = {
      borderTopWidth: `${this.position.margin.top}px`,
      borderRightWidth: `${this.position.margin.right}px`,
      borderBottomWidth: `${this.position.margin.bottom}px`,
      borderLeftWidth: `${this.position.margin.left}px`,
    };
    const borderPosition = {
      borderTopWidth: `${this.position.border.top}px`,
      borderRightWidth: `${this.position.border.right}px`,
      borderBottomWidth: `${this.position.border.bottom}px`,
      borderLeftWidth: `${this.position.border.left}px`,
    };
    const paddingPosition = {
      borderTopWidth: `${this.position.padding.top}px`,
      borderRightWidth: `${this.position.padding.right}px`,
      borderBottomWidth: `${this.position.padding.bottom}px`,
      borderLeftWidth: `${this.position.padding.left}px`,
    };

    // Mode-aware content overlay
    const contentOverlayStyle = {
      background: modeColors.overlay,
      transition: 'background 0.2s ease-in-out',
    };

    // Define platform-specific hotkey map (needed by both overlays)
    const isMac =
      typeof navigator !== 'undefined' &&
      /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
    const hotKeyMap = isMac ? MacHotKeyMap : WindowsHotKeyMap;

    // Layer panel uses the same global mode state
    const layerPanelColors = this.getModeColors(currentMode);
    const layerPanelIcon = this.getModeIcon(currentMode);

    // Generate mode hints for layer panel (same as main overlay)
    const layerPanelModeHints: Array<{hotkey: string, action: string}> = [];
    if (this.hasModeSpecificKeys()) {
      if (this.copyKeys && this.copy) {
        const keys = this.copyKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        layerPanelModeHints.push({ hotkey: keys, action: 'Copy Path' });
      }
      if (this.locateKeys && this.locate) {
        const keys = this.locateKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        layerPanelModeHints.push({ hotkey: keys, action: 'Open in IDE' });
      }
      if (this.targetKeys && this.target) {
        const keys = this.targetKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        layerPanelModeHints.push({ hotkey: keys, action: 'Open Target' });
      }
    }

    const nodeTreeStyles = {
      display: this.showNodeTree ? 'flex' : 'none',
      borderLeft: `4px solid ${layerPanelColors.accent}`,
      ...this.nodeTreePosition,
    };

    const nodeTooltipStyles = {
      visibility: this.activeNode.visibility,
      maxWidth: this.activeNode.width,
      top: this.activeNode.top,
      left: this.activeNode.left,
      bottom: this.activeNode.bottom,
      display: this.showNodeTree ? '' : 'none',
    };

    // Generate structured mode hints for multi-line display
    const modeHints: Array<{hotkey: string, action: string}> = [];
    if (this.hasModeSpecificKeys()) {
      if (this.copyKeys && this.copy) {
        const keys = this.copyKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        modeHints.push({ hotkey: keys, action: 'Copy Path' });
      }
      if (this.locateKeys && this.locate) {
        const keys = this.locateKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        modeHints.push({ hotkey: keys, action: 'Open in IDE' });
      }
      if (this.targetKeys && this.target) {
        const keys = this.targetKeys.split(',').map(k => hotKeyMap[k.trim() as keyof typeof hotKeyMap]).join('+');
        modeHints.push({ hotkey: keys, action: 'Open Target' });
      }
    }
    const elementWidth = Number.isFinite(this.element.width)
      ? this.element.width
      : 0;
    const elementHeight = Number.isFinite(this.element.height)
      ? this.element.height
      : 0;

    return html`
      <div
        class="code-inspector-container"
        id="code-inspector-container"
        style=${styleMap(containerPosition)}
      >
        <div class="margin-overlay" style=${styleMap(marginPosition)}>
          <div class="border-overlay" style=${styleMap(borderPosition)}>
            <div class="padding-overlay" style=${styleMap(paddingPosition)}>
              <div class="content-overlay" style=${styleMap(contentOverlayStyle)}></div>
            </div>
          </div>
        </div>
        <div
          id="element-info"
          class="element-info ${this.elementTipStyle.vertical} ${this
            .elementTipStyle.horizon} ${this.elementTipStyle.visibility}"
          style=${styleMap({
            width: PopperWidth + 'px',
            maxWidth: '100vw',
            borderLeft: `3px solid ${modeColors.accent}`,
            ...this.elementTipStyle.additionStyle,
          })}
        >
          <div class="element-info-content">
            <div class="mode-badge" style=${styleMap({
              background: modeColors.badge,
              color: modeColors.badgeText,
            })}>
              <span class="mode-icon">${modeIcon}</span>
              <span class="mode-text">${this.getActionLabel(currentMode)}</span>
            </div>
            <div class="name-line">
              <div class="element-name">
                <span class="element-title" style="color: ${modeColors.accent}">&lt;${this.element.name}&gt;</span>
                ${this.element.textContent ? html`<span class="element-text">${this.element.textContent}</span>` : ''}
              </div>
            </div>
            <div class="size-line">
              <span class="size-chip">W ${elementWidth}px</span>
              <span class="size-chip">H ${elementHeight}px</span>
            </div>
            <div class="path-line">
              ${this.element.path}:${this.element.line}:${this.element.column}
            </div>
            ${this.sourceContext ? html`
              <div class="source-preview">
                <pre><code>${this.sourceContext.lines.map((line, idx) => {
                  const lineNum = this.sourceContext!.startLine + idx;
                  const isTarget = lineNum === this.sourceContext!.targetLine;
                  return html`<div class="source-line ${isTarget ? 'target' : ''}"><span class="line-num">${lineNum}</span><span class="line-code">${line || ' '}</span></div>`;
                })}</code></pre>
              </div>
            ` : ''}
            <div class="brand-footer">
              ${modeHints.length > 0 ? html`
                <div class="mode-hints" role="list" aria-label="Available keyboard shortcuts">
                  ${modeHints.map(hint => html`
                    <div class="mode-hint-item" role="listitem">
                      <span class="hotkey">${hint.hotkey}</span>
                      <span class="separator">=</span>
                      <span class="action">${hint.action}</span>
                    </div>
                  `)}
                </div>
              ` : ''}
              <small>Code Inspector <span class="version">v${this.version}</span></small>
            </div>
          </div>
        </div>
      </div>
      <div
        id="inspector-node-tree"
        class="element-info-content layer-panel-mode-${currentMode || 'default'}"
        style=${styleMap(nodeTreeStyles)}
      >
        <div
          class="inspector-layer-title"
          style=${styleMap({
            background: layerPanelColors.badge,
            color: layerPanelColors.badgeText,
          })}
          @mousedown="${(e: MouseEvent) => this.recordMousePosition(e)}"
          @touchstart="${(e: TouchEvent) => this.recordMousePosition(e)}"
        >
          <div class="layer-title-content">
            <span class="layer-mode-icon">${layerPanelIcon}</span>
            <span class="layer-mode-text">${this.getActionLabel(currentMode)}</span>
          </div>
          ${html`<svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="close-icon"
            @click="${this.removeLayerPanel}"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>`}
        </div>

        <div
          class="node-tree-list"
          style="${styleMap({ pointerEvents: this.dragging ? 'none' : '' })}"
        >
          ${this.nodeTree ? this.renderNodeTree(this.nodeTree) : ''}
        </div>

        <!-- Brand footer with mode hints -->
        <div class="brand-footer">
          ${layerPanelModeHints.length > 0 ? html`
            <div class="mode-hints" role="list" aria-label="Available keyboard shortcuts">
              ${layerPanelModeHints.map(hint => html`
                <div class="mode-hint-item" role="listitem">
                  <span class="hotkey">${hint.hotkey}</span>
                  <span class="separator">=</span>
                  <span class="action">${hint.action}</span>
                </div>
              `)}
            </div>
          ` : ''}
          <small>Code Inspector <span class="version">v${this.version}</span></small>
        </div>
      </div>
      <div
        id="node-tree-tooltip"
        class="${this.activeNode.class}"
        style=${styleMap(nodeTooltipStyles)}
      >
        ${this.activeNode.content}
      </div>
    `;
  }

  static styles = css`
    .code-inspector-container {
      position: fixed;
      pointer-events: none;
      z-index: 9999999999999;
      font-family: 'PingFang SC';
      .margin-overlay {
        position: absolute;
        inset: 0;
        border-style: solid;
        border-color: rgba(255, 155, 0, 0.3);
        .border-overlay {
          position: absolute;
          inset: 0;
          border-style: solid;
          border-color: rgba(255, 200, 50, 0.3);
          .padding-overlay {
            position: absolute;
            inset: 0;
            border-style: solid;
            border-color: rgba(77, 200, 0, 0.3);
            .content-overlay {
              position: absolute;
              inset: 0;
              background: rgba(120, 170, 210, 0.7);
              transition: background 0.2s ease-in-out;
              animation: pulse-glow 2s ease-in-out infinite;
            }
          }
        }
      }
    }
    .element-info {
      position: absolute;
      transition: border-color 0.2s ease-in-out;
    }
    .element-info.hidden {
      visibility: hidden;
    }
    .element-info-content {
      max-width: 100%;
      font-size: 12px;
      color: #181818;
      background-color: #F9F9F7;
      word-break: break-all;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
      box-sizing: border-box;
      padding: 0;
      border-radius: 0.75rem;
      border: 1px solid rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .mode-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      transition: background 0.2s ease-in-out, border-color 0.2s ease-in-out;
    }
    .mode-icon {
      font-size: 14px;
      line-height: 1;
    }
    .mode-text {
      flex: 1;
    }
    .name-line {
      padding: 6px 10px 4px;
    }
    .path-line {
      padding: 0 10px 6px;
    }
    .source-preview {
      padding: 0 10px 8px;
      max-height: 200px;
      overflow: auto;
      pre {
        margin: 0;
        padding: 8px;
        background: #1e1e1e;
        border-radius: 6px;
        font-size: 11px;
        line-height: 1.4;
        overflow-x: auto;
      }
      code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        color: #d4d4d4;
      }
      .source-line {
        display: flex;
        white-space: pre;
      }
      .source-line.target {
        background: rgba(255, 200, 50, 0.25);
        border-radius: 2px;
      }
      .line-num {
        color: #858585;
        min-width: 32px;
        padding-right: 12px;
        text-align: right;
        user-select: none;
      }
      .line-code {
        flex: 1;
      }
    }
    .brand-footer {
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      background: rgba(240, 238, 230, 0.6);

      small {
        display: block;
        padding: 4px 10px;
        font-size: 9px;
        color: #87867F;
        opacity: 0.8;
        text-align: center;
        font-weight: 500;
        letter-spacing: 0.5px;

        .version {
          opacity: 0.6;
          font-size: 8px;
          margin-left: 4px;
          font-weight: 400;
        }
      }

      .mode-hints {
        padding: 8px 10px 4px 10px;
        background: transparent;
      }

      .mode-hints + small {
        padding-top: 0;
      }

      .mode-hint-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
        line-height: 1.8;
        margin: 1px 0;

        .hotkey {
          color: #00B42A;
          font-weight: 600;
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Consolas', monospace;
          letter-spacing: 0.3px;
        }

        .separator {
          margin: 0 6px;
          color: #87867F;
          font-weight: 400;
        }

        .action {
          color: #181818;
          font-weight: 500;
          flex: 1;
          text-align: right;
          opacity: 0.8;
        }
      }
    }
    .element-info-top {
      top: -4px;
      transform: translateY(-100%);
    }
    .element-info-bottom {
      top: calc(100% + 4px);
    }
    .element-info-top-inner {
      top: 4px;
    }
    .element-info-bottom-inner {
      bottom: 4px;
    }
    .element-info-left {
      left: 0;
      display: flex;
      justify-content: flex-start;
    }
    .element-info-right {
      right: 0;
      display: flex;
      justify-content: flex-end;
    }
    .element-name {
      display: flex;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
    }
    .element-name .element-title {
      font-weight: bold;
      transition: color 0.2s ease-in-out;
      flex-shrink: 0;
    }
    .element-name .element-text {
      color: #87867F;
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    .element-name .element-tip {
      color: #006aff;
    }
    .size-line {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .size-chip {
      background: #f6f8fa;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      color: #444;
      padding: 2px 6px;
      line-height: 16px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }
    .path-line {
      color: #333;
      line-height: 12px;
      margin-top: 4px;
    }
    #inspector-node-tree {
      position: fixed;
      user-select: none;
      z-index: 9999999999999999;
      min-width: 300px;
      max-width: min(max(30vw, 300px), 400px);
      max-height: calc(100vh - 40px);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        'Liberation Mono', 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      padding: 0;
      transition: border-color 0.2s ease-in-out;

      .inspector-layer-title {
        padding: 10px 12px;
        margin-bottom: 0;
        flex-shrink: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
        font-weight: 600;
        font-size: 12px;
        transition: background 0.2s ease-in-out;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);

        .layer-title-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .layer-mode-icon {
          font-size: 16px;
          line-height: 1;
        }

        .layer-mode-text {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 11px;
        }

        .close-icon {
          opacity: 0.9;
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          &:hover {
            opacity: 1;
            transform: scale(1.1);
          }
          &:focus-visible {
            outline: 2px solid #D97757;
            outline-offset: 2px;
            border-radius: 4px;
          }
        }
      }


      .brand-footer {
        flex-shrink: 0;

        .mode-hints {
          padding: 8px 12px;
          background: rgba(240, 238, 230, 0.6);
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        small {
          display: block;
          padding: 4px 10px;
          text-align: center;
          color: #87867F;
          opacity: 0.8;
        }
      }

      .node-tree-list {
        height: fit-content;
        overflow-y: auto;
        padding: 12px;
        min-height: 100px;
        max-height: 400px;
        background: #F9F9F7;
      }

      .inspector-layer {
        cursor: pointer;
        position: relative;
        padding: 4px 8px;
        margin-bottom: 1px;
        border-radius: 0.375rem;
        font-size: 12px;
        line-height: 1.4;
        transition: all 0.2s ease-in-out;

        &:hover {
          background: rgba(0, 0, 0, 0.03);
          transform: translateX(2px);
        }

        &:focus-visible {
          outline: 2px solid #D97757;
          outline-offset: 2px;
          border-radius: 0.375rem;
        }

        &:active {
          background: rgba(0, 0, 0, 0.05);
        }
      }

      .element-tip {
        font-size: 10px;
        opacity: 0.7;
        color: #87867F;
        margin-left: 8px;
        font-weight: 400;
        line-height: 1.5;
      }

      .path-line {
        font-size: 10px;
        color: #87867F;
        margin-top: 4px;
        line-height: 1.5;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        opacity: 0.8;
      }
    }

    #node-tree-tooltip {
      position: fixed;
      box-sizing: border-box;
      z-index: 999999999999999999;
      background: rgba(24, 24, 24, 0.9);
      color: white;
      padding: 6px 10px;
      border-radius: 0.375rem;
      font-size: 11px;
      line-height: 1.5;
      white-space: wrap;
      pointer-events: none;
      word-break: break-all;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    }
    .tooltip-top {
      transform: translateY(-100%);
    }
    .close-icon {
      cursor: pointer;
    }

    @keyframes pulse-glow {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.85;
      }
    }
  `;
}

// Global notification styles
if (!document.getElementById('code-inspector-notification-styles')) {
  const notificationStyles = document.createElement('style');
  notificationStyles.id = 'code-inspector-notification-styles';
  notificationStyles.textContent = `
    .code-inspector-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999999999999999;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    .code-inspector-notification-success {
      background: hsl(143, 85%, 96%);
      color: hsl(140, 100%, 27%);
      border: 1px solid hsl(145, 92%, 91%);
    }
    .code-inspector-notification-error {
      background: hsl(0, 93%, 94%);
      color: hsl(0, 84%, 40%);
      border: 1px solid hsl(0, 93%, 94%);
    }
    .code-inspector-notification-show {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(notificationStyles);
}

if (!customElements.get('lovinsp-component')) {
  customElements.define('lovinsp-component', LovinspComponent);
}
