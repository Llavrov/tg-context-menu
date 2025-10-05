import { ViewportRect, SafeArea, MenuPosition, LongPressOpts } from './types';

export const CONTEXT_MENU_CONSTANTS = {
    MENU_WIDTH: 250,
    MENU_ITEM_HEIGHT: 52,
    MENU_PADDING: 32,
    MENU_MAX_HEIGHT_VH: 60,
    SCREEN_MARGIN: 16,
    ELEMENT_MENU_MARGIN: 12,
    VIEWPORT_MARGIN: 32,
    LONG_PRESS_DELAY: 350,
    SCALE_ANIMATION_DURATION: 350,
    POSITION_ANIMATION_DURATION: 400,
    RESTORE_ANIMATION_DURATION: 400,
    SCROLL_ANIMATION_DELAY: 300,
    OVERLAY_Z_INDEX: 1000,
    MOVE_TOLERANCE: 10,
    SCALE_DOWN_VALUE: 0.95,
    SCALE_UP_VALUE: 1,
    DEFAULT_VIEWPORT_WIDTH: 375,
    DEFAULT_VIEWPORT_HEIGHT: 812,
    MIN_MENU_HEIGHT: 300,
    MENU_HEIGHT_BUFFER: 50,
    LONG_PRESS_TIMEOUT: 350,
    SCALE_ANIMATION_TIMEOUT: 350,
    STYLE_CLEAR_TIMEOUT: 350,
    RESTORE_ANIMATION_TIMEOUT: 300,
    CLOSE_STATE_CLEAR_TIMEOUT: 350
} as const;

export enum HapticType {
    LIGHT = 'light',
    MEDIUM = 'medium',
    HEAVY = 'heavy',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    SELECTION = 'selection'
}

const HAPTIC_PATTERNS = {
    [HapticType.LIGHT]: 10,
    [HapticType.MEDIUM]: 15,
    [HapticType.HEAVY]: 25,
    [HapticType.SUCCESS]: [15, 10, 15],
    [HapticType.WARNING]: [20, 10, 20],
    [HapticType.ERROR]: [30, 20, 30],
    [HapticType.SELECTION]: 5
};

export function triggerHaptic(type: HapticType | number | number[] = HapticType.MEDIUM): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (window as any).Telegram !== 'undefined' &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).Telegram.WebApp &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).Telegram.WebApp.HapticFeedback) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tg = (window as any).Telegram.WebApp;
            switch (type) {
                case HapticType.LIGHT:
                    tg.HapticFeedback.impactOccurred('light');
                    break;
                case HapticType.MEDIUM:
                    tg.HapticFeedback.impactOccurred('medium');
                    break;
                case HapticType.HEAVY:
                    tg.HapticFeedback.impactOccurred('heavy');
                    break;
                case HapticType.SUCCESS:
                    tg.HapticFeedback.notificationOccurred('success');
                    break;
                case HapticType.WARNING:
                    tg.HapticFeedback.notificationOccurred('warning');
                    break;
                case HapticType.ERROR:
                    tg.HapticFeedback.notificationOccurred('error');
                    break;
                case HapticType.SELECTION:
                    tg.HapticFeedback.selectionChanged();
                    break;
                default:
                    tg.HapticFeedback.impactOccurred('medium');
                    break;
            }
            return;
        }
    } catch (error) {
    }

    if (!navigator.vibrate) {
        return;
    }

    let pattern: number | number[];

    if (typeof type === 'number' || Array.isArray(type)) {
        pattern = type;
    } else {
        pattern = HAPTIC_PATTERNS[type] || HAPTIC_PATTERNS[HapticType.MEDIUM];
    }

    try {
        navigator.vibrate(pattern);
    } catch (error) {
    }
}

export function isHapticSupported(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (window as any).Telegram !== 'undefined' &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).Telegram.WebApp &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).Telegram.WebApp.HapticFeedback) {
            return true;
        }
    } catch {
        // Игнорируем ошибки
    }
    return 'vibrate' in navigator;
}

export function getViewportRect(): ViewportRect {
    if (typeof window === 'undefined') {
        return {
            w: CONTEXT_MENU_CONSTANTS.DEFAULT_VIEWPORT_WIDTH,
            h: CONTEXT_MENU_CONSTANTS.DEFAULT_VIEWPORT_HEIGHT
        };
    }

    return {
        w: window.innerWidth,
        h: window.innerHeight,
    };
}

export function getSafeArea(): SafeArea {
    if (typeof document === 'undefined') {
        return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const computedStyle = getComputedStyle(document.documentElement);

    return {
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
    };
}


export function positionMenu(viewportW: number, safeBottom: number = 0): MenuPosition {
    const menuWidth = Math.min(viewportW - CONTEXT_MENU_CONSTANTS.VIEWPORT_MARGIN, 320);
    const left = (viewportW - menuWidth) / 2;

    return {
        left: left,
        bottom: safeBottom + CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN,
        width: menuWidth,
    };
}

export async function ensureVisibleWithMenu(
    targetRect: DOMRect,
    menuHeight: number,
    opts: {
        edgeMargin: number;
        scrollContainer: HTMLElement | 'window';
    }
): Promise<void> {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    const menuTop = viewport.h - menuHeight - safeArea.bottom;
    const elementBottom = targetRect.bottom;
    const requiredSpace = elementBottom - menuTop + opts.edgeMargin;

    if (requiredSpace > 0) {
        const scrollAmount = requiredSpace;

        if (opts.scrollContainer === 'window') {
            window.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
            });
        } else {
            opts.scrollContainer.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
            });
        }

        await new Promise(resolve => setTimeout(resolve, CONTEXT_MENU_CONSTANTS.SCROLL_ANIMATION_DELAY));
    }
}

export function createLongPressController(
    fire: (originalRect?: DOMRect) => void,
    opts: LongPressOpts = {}
): {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onClick: (e: React.MouseEvent) => void;
    dispose: () => void;
} {
    const {
        delayMs = CONTEXT_MENU_CONSTANTS.LONG_PRESS_DELAY,
        moveTolerance = CONTEXT_MENU_CONSTANTS.MOVE_TOLERANCE
    } = opts;

    let timeoutId: NodeJS.Timeout | null = null;
    let startPos: { x: number; y: number } | null = null;
    let isActive = false;
    let currentElement: HTMLElement | null = null;
    let wasLongPress = false;
    let originalRect: DOMRect | null = null;

    const reset = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        startPos = null;
        isActive = false;
        wasLongPress = false;
        currentElement = null;
        originalRect = null;
    };

    const applyScaleAnimation = (element: HTMLElement) => {
        element.style.transformOrigin = 'center';
        element.style.setProperty(
            'transition',
            `transform ${CONTEXT_MENU_CONSTANTS.SCALE_ANIMATION_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            'important'
        );
        element.style.transform = `scale(${CONTEXT_MENU_CONSTANTS.SCALE_DOWN_VALUE})`;
    };

    const removeScaleAnimation = (element: HTMLElement) => {
        element.style.transformOrigin = 'center';
        element.style.setProperty(
            'transition',
            `transform ${CONTEXT_MENU_CONSTANTS.SCALE_ANIMATION_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            'important'
        );
        element.style.transform = `scale(${CONTEXT_MENU_CONSTANTS.SCALE_UP_VALUE})`;
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button === 2) return;

        const target = e.currentTarget as HTMLElement;
        startPos = { x: e.clientX, y: e.clientY };
        isActive = true;
        currentElement = target;
        originalRect = target.getBoundingClientRect();

        target.style.userSelect = 'none';
        target.style.webkitUserSelect = 'none';

        timeoutId = setTimeout(() => {
            if (isActive && startPos) {
                wasLongPress = true;
                applyScaleAnimation(target);
                triggerHaptic(HapticType.MEDIUM);

                setTimeout(() => {
                    if (isActive && currentElement) {
                        removeScaleAnimation(currentElement);
                        fire(originalRect || undefined);

                        setTimeout(() => {
                            if (currentElement) {
                                currentElement.style.transform = '';
                                currentElement.style.transition = '';
                                currentElement.style.transformOrigin = '';
                            }
                            reset();
                        }, CONTEXT_MENU_CONSTANTS.STYLE_CLEAR_TIMEOUT);
                    }
                }, CONTEXT_MENU_CONSTANTS.SCALE_ANIMATION_TIMEOUT);
            }
        }, delayMs);
    };

    const onPointerUp = () => {
        if (!wasLongPress && currentElement) {
            removeScaleAnimation(currentElement);
        }
        if (!wasLongPress) {
            reset();
        }
    };

    const onPointerCancel = () => {
        if (!wasLongPress && currentElement) {
            removeScaleAnimation(currentElement);
        }
        if (!wasLongPress) {
            reset();
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isActive || !startPos) return;

        const deltaX = Math.abs(e.clientX - startPos.x);
        const deltaY = Math.abs(e.clientY - startPos.y);

        if (deltaX > moveTolerance || deltaY > moveTolerance) {
            if (currentElement) {
                removeScaleAnimation(currentElement);
            }
            reset();
        }
    };

    const onClick = () => {
    };

    const dispose = () => {
        reset();
    };

    return {
        onPointerDown,
        onPointerUp,
        onPointerCancel,
        onPointerMove,
        onClick,
        dispose,
    };
}

export function trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement?.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement?.focus();
                e.preventDefault();
            }
        }
    };

    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
        document.removeEventListener('keydown', handleTabKey);
    };
}

export function createGlobalKeyHandler(onEscape: () => void): () => void {
    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onEscape();
        }
    };

    document.addEventListener('keydown', handleKeydown);

    return () => {
        document.removeEventListener('keydown', handleKeydown);
    };
}

export function saveElementStyles(element: HTMLElement) {
    return {
        position: element.style.position || 'static',
        top: element.style.top || 'auto',
        left: element.style.left || 'auto',
        zIndex: element.style.zIndex || 'auto',
        transform: element.style.transform || 'none',
    };
}

export function createPlaceholder(element: HTMLElement, originalRect: DOMRect): HTMLElement {
    const placeholder = document.createElement('div');
    const computedStyle = getComputedStyle(element);

    placeholder.style.width = `${originalRect.width}px`;
    placeholder.style.height = `${originalRect.height}px`;
    placeholder.style.marginTop = computedStyle.marginTop;
    placeholder.style.marginBottom = computedStyle.marginBottom;
    placeholder.style.marginLeft = computedStyle.marginLeft;
    placeholder.style.marginRight = computedStyle.marginRight;
    placeholder.style.borderTop = computedStyle.borderTop;
    placeholder.style.borderBottom = computedStyle.borderBottom;
    placeholder.style.borderLeft = computedStyle.borderLeft;
    placeholder.style.borderRight = computedStyle.borderRight;
    placeholder.style.borderRadius = computedStyle.borderRadius;

    placeholder.style.visibility = 'hidden';

    return placeholder;
}

export function moveElementToOverlay(
    element: HTMLElement,
    overlayContainer: HTMLElement,
    rect: DOMRect,
    finalPosition?: { top: number; left: number }
) {
    const originalParent = element.parentElement;
    const originalNextSibling = element.nextSibling;
    const originalStyles = saveElementStyles(element);
    const placeholder = createPlaceholder(element, rect);
    if (originalNextSibling) {
        originalParent!.insertBefore(placeholder, originalNextSibling);
    } else {
        originalParent!.appendChild(placeholder);
    }

    overlayContainer.appendChild(element);
    element.style.position = 'absolute';
    element.style.top = `${rect.top}px`;
    element.style.left = `${rect.left}px`;
    element.style.width = `${rect.width}px`;
    element.style.zIndex = CONTEXT_MENU_CONSTANTS.OVERLAY_Z_INDEX.toString();
    const currentTransition = element.style.transition;
    const positionTransition = `top ${CONTEXT_MENU_CONSTANTS.POSITION_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), left ${CONTEXT_MENU_CONSTANTS.POSITION_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    if (currentTransition && currentTransition.includes('transform')) {
        element.style.setProperty('transition', `${currentTransition}, ${positionTransition}`, 'important');
    } else {
        element.style.setProperty('transition', positionTransition, 'important');
    }

    if (finalPosition) {
        requestAnimationFrame(() => {
            element.style.top = `${finalPosition.top}px`;
            element.style.left = `${finalPosition.left}px`;
        });
    }

    return {
        originalParent,
        originalNextSibling,
        originalStyles,
        placeholder
    };
}

export function restoreElementToOriginalPosition(
    element: HTMLElement,
    originalParent: HTMLElement,
    originalNextSibling: Node | null,
    originalStyles: ReturnType<typeof saveElementStyles>,
    placeholder: HTMLElement,
    originalRect: DOMRect
) {
    element.style.transition = `top ${CONTEXT_MENU_CONSTANTS.RESTORE_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), left ${CONTEXT_MENU_CONSTANTS.RESTORE_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.top = `${originalRect.top}px`;
    element.style.left = `${originalRect.left}px`;
    element.style.width = `${originalRect.width}px`;
    setTimeout(() => {
        element.style.position = originalStyles.position;
        element.style.top = originalStyles.top;
        element.style.left = originalStyles.left;
        element.style.zIndex = originalStyles.zIndex;
        element.style.transform = originalStyles.transform;
        element.style.transition = '';
        element.style.width = '';
        element.style.height = '';
        element.style.opacity = '';

        if (placeholder.parentElement) {
            placeholder.parentElement.replaceChild(element, placeholder);
        } else {
            if (originalNextSibling && originalNextSibling.parentElement) {
                originalParent.insertBefore(element, originalNextSibling);
            } else {
                originalParent.appendChild(element);
            }
        }
    }, CONTEXT_MENU_CONSTANTS.RESTORE_ANIMATION_TIMEOUT);
}

export function lockScroll(): () => void {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;

        window.scrollTo(0, scrollY);
    };
}

export function getScrollableContainers(element: HTMLElement): HTMLElement[] {
    const containers: HTMLElement[] = [];
    let current = element.parentElement;

    while (current && current !== document.body) {
        const style = getComputedStyle(current);
        const overflow = style.overflow + style.overflowY + style.overflowX;

        if (overflow.includes('scroll') || overflow.includes('auto')) {
            containers.push(current);
        }

        current = current.parentElement;
    }

    return containers;
}

export function calculateMenuDimensions(actionsCount: number, maxHeightVH: number = CONTEXT_MENU_CONSTANTS.MENU_MAX_HEIGHT_VH): {
    height: number;
    itemHeight: number;
    padding: number;
} {
    const maxHeight = (maxHeightVH * window.innerHeight) / 100;

    const totalHeight = Math.min(
        actionsCount * CONTEXT_MENU_CONSTANTS.MENU_ITEM_HEIGHT + CONTEXT_MENU_CONSTANTS.MENU_PADDING,
        maxHeight
    );

    return {
        height: totalHeight,
        itemHeight: CONTEXT_MENU_CONSTANTS.MENU_ITEM_HEIGHT,
        padding: CONTEXT_MENU_CONSTANTS.MENU_PADDING
    };
}

export function calculateMenuPosition(
    elementRect: DOMRect,
    menuWidth: number = CONTEXT_MENU_CONSTANTS.MENU_WIDTH,
    alignment: 'left' | 'right' | 'center' = 'right',
    position: 'under' | 'bottom' = 'under',
    edgeMargin: number = CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN,
    menuHeight?: number
): {
    left: number;
    top?: number;
    bottom?: number;
} {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    let menuLeft: number;
    switch (alignment) {
        case 'left':
            menuLeft = elementRect.left;
            break;
        case 'center':
            menuLeft = elementRect.left + (elementRect.width - menuWidth) / 2;
            break;
        case 'right':
        default:
            menuLeft = elementRect.right - menuWidth;
            break;
    }


    const minLeft = safeArea.left + CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN;
    const maxLeft = viewport.w - safeArea.right - CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN - menuWidth;
    const originalMenuLeft = menuLeft;
    menuLeft = Math.max(minLeft, Math.min(menuLeft, maxLeft));


    if (position === 'under') {
        const menuTop = elementRect.bottom + edgeMargin;
        const availableHeight = viewport.h - menuTop - safeArea.bottom;
        const requiredHeight = menuHeight || CONTEXT_MENU_CONSTANTS.MIN_MENU_HEIGHT;

        if (availableHeight < requiredHeight) {
            return {
                left: menuLeft,
                bottom: safeArea.bottom + CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN
            };
        }
        return {
            left: menuLeft,
            top: menuTop
        };
    } else {
        const bottomPosition = Math.max(
            safeArea.bottom + CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN,
            viewport.h - (menuHeight || CONTEXT_MENU_CONSTANTS.MIN_MENU_HEIGHT) - CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN
        );
        return {
            left: menuLeft,
            bottom: bottomPosition
        };
    }
}

export function shouldMoveElement(
    elementRect: DOMRect,
    menuHeight: number,
    edgeMargin: number = CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN
): boolean {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    const menuTop = elementRect.bottom + edgeMargin;
    const availableHeight = viewport.h - menuTop - safeArea.bottom;
    const menuFitsBelow = availableHeight >= menuHeight + CONTEXT_MENU_CONSTANTS.MENU_HEIGHT_BUFFER;

    const totalHeight = elementRect.height + menuHeight + edgeMargin;
    const viewportHeight = viewport.h - safeArea.top - safeArea.bottom - CONTEXT_MENU_CONSTANTS.VIEWPORT_MARGIN;
    const isTooLarge = totalHeight > viewportHeight;

    const elementFitsInViewport = elementRect.top >= safeArea.top;

    const result = isTooLarge || !elementFitsInViewport || !menuFitsBelow;


    return result;
}
