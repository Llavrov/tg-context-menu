import { ReactNode } from 'react';

export type ContextMenuAction = {
    id: string;
    label: string;
    icon?: ReactNode;
    destructive?: boolean;
    shortcut?: string;
    onSelect: () => void | Promise<void>;
};

export type OpenContextMenuConfig = {
    title?: string;               // заголовок для emoji-bar
    emojis?: string[];            // эмодзи в верхнем баре
    actions: ContextMenuAction[]; // пункты меню
    longPressMs?: number;         // default 450
    edgeMargin?: number;          // отступ между элементом и меню, default 12
    maxMenuHeightVH?: number;     // например 60 (vh)
    scrollContainer?: HTMLElement | 'window'; // где скроллить, default 'window'
};

export type OverlayState = {
    isOpen: boolean;
    originalElement: HTMLElement | null;
    placeholderElement: HTMLElement | null;
    originalPosition: DOMRect | null;
    menuPosition: MenuPosition | null;
    originalParent: HTMLElement | null;
    originalNextSibling: Node | null;
    originalStyles: {
        position: string;
        top: string;
        left: string;
        zIndex: string;
        transform: string;
    };
    animationPhase: 'initial' | 'positioning' | 'stable' | 'closing';
    config: OpenContextMenuConfig | null;
};

export type ContextMenuState = OverlayState;

export type ContextMenuContextType = {
    state: ContextMenuState;
    longPress: (config: OpenContextMenuConfig) => React.HTMLAttributes<HTMLElement>;
    open: (element: HTMLElement, config: OpenContextMenuConfig) => Promise<void>;
    close: (reason?: 'backdrop' | 'escape' | 'gesture' | 'action') => Promise<void>;
};

export type LongPressOpts = {
    delayMs?: number;
    moveTolerance?: number;
};

export type ViewportRect = {
    w: number;
    h: number;
};

export type SafeArea = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};


export type MenuPosition = {
    left: number | string;
    top?: number;
    bottom?: number;
    width: number;
};
