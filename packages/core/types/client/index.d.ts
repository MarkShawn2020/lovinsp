import { LitElement, TemplateResult } from 'lit';
interface Position {
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
    transform?: string;
    maxHeight?: string;
}
interface SourceInfo {
    name: string;
    path: string;
    line: number;
    column: number;
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
export declare class LovinspComponent extends LitElement {
    hotKeys: string;
    copyKeys: string;
    locateKeys: string;
    targetKeys: string;
    port: number;
    hideConsole: boolean;
    locate: boolean;
    copy: boolean | string;
    defaultAction: InspectorAction;
    target: string;
    ip: string;
    version: string;
    position: {
        top: number;
        right: number;
        bottom: number;
        left: number;
        padding: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
        border: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
        margin: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
    };
    element: ElementInfo;
    elementTipStyle: ElementTipStyle;
    show: boolean;
    showNodeTree: boolean;
    nodeTreePosition: Position;
    nodeTree: TreeNode | null;
    dragging: boolean;
    mousePosition: {
        baseX: number;
        baseY: number;
        moveX: number;
        moveY: number;
    };
    preUserSelect: string;
    sendType: 'xhr' | 'img';
    activeNode: ActiveNode;
    currentMode: InspectorAction | null;
    mouseX: number;
    mouseY: number;
    sourceContext: {
        lines: string[];
        startLine: number;
        targetLine: number;
    } | null;
    private sourceContextAbortController;
    private pendingClickAction;
    codeInspectorContainerRef: HTMLDivElement;
    elementInfoRef: HTMLDivElement;
    nodeTreeRef: HTMLDivElement;
    nodeTreeTitleRef: HTMLDivElement;
    nodeTreeTooltipRef: HTMLDivElement;
    private hasModeSpecificKeys;
    private matchesKeys;
    private getTriggeredAction;
    isTracking: (e: any) => boolean | "";
    getDomPropertyValue: (target: HTMLElement, property: string) => number;
    getElementSize: (target: HTMLElement, rect?: DOMRect | DOMRectReadOnly) => Pick<ElementInfo, 'width' | 'height'>;
    calculateElementInfoPosition: (_target: HTMLElement) => Promise<{
        vertical: string;
        horizon: string;
        additionStyle: {
            position: string;
            top: string;
            left: string;
            right: string;
            bottom: string;
            transform: string;
        };
    }>;
    renderCover: (target: HTMLElement) => Promise<void>;
    getAstroFilePath: (target: HTMLElement) => string;
    getElementTextContent: (target: HTMLElement) => string | undefined;
    getSourceInfo: (target: HTMLElement) => SourceInfo | null;
    removeCover: (force?: boolean | MouseEvent) => void;
    renderLayerPanel: (nodeTree: TreeNode, { x, y }: {
        x: number;
        y: number;
    }) => void;
    removeLayerPanel: () => void;
    handleGlobalKeyChange: (e: KeyboardEvent) => void;
    addGlobalCursorStyle: () => void;
    removeGlobalCursorStyle: () => void;
    fetchSourceContext: () => Promise<void>;
    sendXHR: () => void;
    sendImg: () => void;
    buildTargetUrl: () => string;
    trackCode: (action?: TrackAction) => void;
    private getDefaultAction;
    private isActionEnabled;
    private resolvePreferredAction;
    private getModeColors;
    private getModeIcon;
    private getActionLabel;
    showNotification(message: string, type?: 'success' | 'error'): void;
    copyToClipboard(text: string): void;
    private fallbackCopy;
    handleDrag: (e: MouseEvent | TouchEvent) => void;
    isSamePositionNode: (node1: HTMLElement, node2: HTMLElement) => boolean;
    handleMouseMove: (e: MouseEvent | TouchEvent) => Promise<void>;
    handleMouseDown: (e: MouseEvent | TouchEvent) => void;
    handleMouseClick: (e: MouseEvent | TouchEvent) => void;
    handleContextMenu: (e: MouseEvent) => void;
    generateNodeTree: (nodePath: HTMLElement[]) => TreeNode;
    handlePointerDown: (e: PointerEvent) => void;
    handleKeyUp: (e: KeyboardEvent) => void;
    handleSelectStart: (e: Event) => void;
    printTip: () => void;
    getMousePosition: (e: MouseEvent | TouchEvent) => {
        x: number;
        y: number;
    };
    recordMousePosition: (e: MouseEvent | TouchEvent) => void;
    handleMouseUp: () => void;
    handleClickTreeNode: (node: TreeNode) => void;
    handleMouseEnterNode: (e: MouseEvent, node: TreeNode) => Promise<void>;
    handleMouseLeaveNode: () => void;
    protected firstUpdated(): void;
    disconnectedCallback(): void;
    renderNodeTree: (node: TreeNode) => TemplateResult;
    render(): TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
