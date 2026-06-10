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
interface SourceContext {
    lines: string[];
    startLine: number;
    targetLine: number;
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
type AgentChatRole = 'context' | 'user' | 'assistant';
type AgentChatStatus = 'idle' | 'submitting' | 'success' | 'error';
interface AgentChatMessage {
    id: string;
    role: AgentChatRole;
    content: string;
    status?: AgentChatStatus;
    createdAt: number;
    contextKey?: string;
    source?: ElementInfo;
    sourceContext?: SourceContext | null;
}
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
    sourcePriority: string;
    agent: boolean;
    agentToken: string;
    agentPlaceholder: string;
    agentSubmitLabel: string;
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
    sourceContext: SourceContext | null;
    locked: boolean;
    ancestorChain: string[];
    agentPrompt: string;
    agentStatus: 'idle' | 'submitting' | 'success' | 'error';
    agentMessage: string;
    agentPanelPinned: boolean;
    agentSidebarOpen: boolean;
    agentSelectedElement: ElementInfo | null;
    agentSelectedSourceContext: SourceContext | null;
    agentContextKey: string;
    agentMessages: AgentChatMessage[];
    private sourceContextAbortController;
    private sourcePriorityCacheKey;
    private sourcePriorityRuleCache;
    private pendingClickAction;
    codeInspectorContainerRef: HTMLDivElement;
    elementInfoRef: HTMLDivElement;
    nodeTreeRef: HTMLDivElement;
    agentSidebarRef: HTMLElement;
    nodeTreeTitleRef: HTMLDivElement;
    nodeTreeTooltipRef: HTMLDivElement;
    agentInputRef?: HTMLTextAreaElement;
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
    getAncestorChain: (target: HTMLElement) => string[];
    removeCover: (force?: boolean | MouseEvent) => void;
    isInspectorPanelEvent: (e: Event) => boolean;
    renderLayerPanel: (nodeTree: TreeNode, { x, y }: {
        x: number;
        y: number;
    }) => void;
    removeLayerPanel: () => void;
    getElementKey: (element: Pick<ElementInfo, 'path' | 'line' | 'column'>) => string;
    shouldPinAgentPanel: () => boolean;
    shouldKeepAgentPanelVisible: () => boolean;
    getAgentSourceElement: () => ElementInfo;
    getAgentSourceContext: () => SourceContext | null;
    appendOrUpdateAgentContextMessage: () => void;
    updateSelectedAgentSourceContext: () => void;
    restorePageInteraction: () => void;
    pinAgentPanel: (focusInput?: boolean) => Promise<void>;
    closeAgentPanel: (e?: Event) => void;
    handleGlobalKeyChange: (e: KeyboardEvent) => void;
    addGlobalCursorStyle: () => void;
    removeGlobalCursorStyle: () => void;
    fetchSourceContext: () => Promise<void>;
    handleAgentPromptInput: (e: Event) => void;
    handleAgentKeyDown: (e: KeyboardEvent) => void;
    submitAgentRequest: () => Promise<void>;
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
    private getSourcePriorityRules;
    private getSourcePriorityScore;
    private collectSourceCandidates;
    private getDefaultSourceCandidate;
    private getTargetSourceCandidate;
    handleMouseMove: (e: MouseEvent | TouchEvent) => Promise<void>;
    handleMouseDown: (e: MouseEvent | TouchEvent) => void;
    handleMouseClick: (e: MouseEvent | TouchEvent) => void;
    handleContextMenu: (e: MouseEvent) => void;
    generateNodeTree: (nodePath: HTMLElement[]) => TreeNode;
    handlePointerDown: (e: PointerEvent) => void;
    handleKeyUp: (e: KeyboardEvent) => void;
    handleLockToggle: (e: KeyboardEvent) => void;
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
    renderAgentSource: (source?: ElementInfo, sourceContext?: SourceContext | null) => "" | TemplateResult<1>;
    renderAgentMessage: (message: AgentChatMessage) => TemplateResult<1>;
    renderAgentSidebar: () => "" | TemplateResult<1>;
    render(): TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
