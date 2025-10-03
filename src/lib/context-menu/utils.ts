import { ViewportRect, SafeArea, MenuPosition, LongPressOpts } from './types';

/**
 * Константы для контекстного меню
 */
export const CONTEXT_MENU_CONSTANTS = {
    // Размеры меню
    MENU_WIDTH: 250,
    MENU_ITEM_HEIGHT: 52,
    MENU_PADDING: 32,
    MENU_MAX_HEIGHT_VH: 60,

    // Отступы и границы
    SCREEN_MARGIN: 16,
    ELEMENT_MENU_MARGIN: 12,
    VIEWPORT_MARGIN: 32,

    // Анимации
    LONG_PRESS_DELAY: 350,
    SCALE_ANIMATION_DURATION: 350,
    POSITION_ANIMATION_DURATION: 400,
    RESTORE_ANIMATION_DURATION: 300,
    SCROLL_ANIMATION_DELAY: 300,

    // Z-index
    OVERLAY_Z_INDEX: 1000,

    // Движение
    MOVE_TOLERANCE: 10,

    // Масштабирование
    SCALE_DOWN_VALUE: 0.95,
    SCALE_UP_VALUE: 1,

    // Fallback размеры (iPhone X)
    DEFAULT_VIEWPORT_WIDTH: 375,
    DEFAULT_VIEWPORT_HEIGHT: 812,

    // Минимальная высота для меню
    MIN_MENU_HEIGHT: 300,
    MENU_HEIGHT_BUFFER: 50,

    // Таймеры для анимаций
    LONG_PRESS_TIMEOUT: 350, // Время до начала анимации scale
    SCALE_ANIMATION_TIMEOUT: 350, // Время между scale 0.95 и scale 1
    STYLE_CLEAR_TIMEOUT: 350, // Время до очистки стилей после анимации
    RESTORE_ANIMATION_TIMEOUT: 300, // Время анимации возврата элемента
    CLOSE_STATE_CLEAR_TIMEOUT: 350, // Время до очистки состояния при закрытии
} as const;

/**
 * Типы хаптической обратной связи
 */
export enum HapticType {
    LIGHT = 'light',
    MEDIUM = 'medium',
    HEAVY = 'heavy',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    SELECTION = 'selection'
}

/**
 * Паттерны вибрации для разных типов хаптика
 */
const HAPTIC_PATTERNS = {
    [HapticType.LIGHT]: 10,
    [HapticType.MEDIUM]: 15,
    [HapticType.HEAVY]: 25,
    [HapticType.SUCCESS]: [15, 10, 15],
    [HapticType.WARNING]: [20, 10, 20],
    [HapticType.ERROR]: [30, 20, 30],
    [HapticType.SELECTION]: 5
};

/**
 * Хаптическая обратная связь
 */
export function triggerHaptic(type: HapticType | number | number[] = HapticType.MEDIUM): void {
    if (typeof window === 'undefined') {
        return;
    }

    // Сначала пробуем Telegram WebApp API
    try {
        // Используем глобальный объект Telegram.WebApp
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (window as any).Telegram !== 'undefined' &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).Telegram.WebApp &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).Telegram.WebApp.HapticFeedback) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tg = (window as any).Telegram.WebApp;

            // Используем Telegram WebApp хаптик
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
            console.log('Telegram WebApp haptic triggered:', type);
            return;
        }
    } catch (error) {
        console.warn('Telegram WebApp haptic failed:', error);
    }

    // Fallback на стандартный navigator.vibrate
    if (!navigator.vibrate) {
        return;
    }

    let pattern: number | number[];

    if (typeof type === 'number' || Array.isArray(type)) {
        // Прямая передача паттерна
        pattern = type;
    } else {
        // Использование предустановленного типа
        pattern = HAPTIC_PATTERNS[type] || HAPTIC_PATTERNS[HapticType.MEDIUM];
    }

    try {
        navigator.vibrate(pattern);
        console.log('Standard haptic triggered:', type);
    } catch (error) {
        console.warn('Standard haptic feedback failed:', error);
    }
}

/**
 * Проверка поддержки хаптика
 */
export function isHapticSupported(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    // Проверяем Telegram WebApp API
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

    // Fallback на стандартный API
    return 'vibrate' in navigator;
}

/**
 * Получение размеров viewport
 */
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

/**
 * Получение safe area insets
 */
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


/**
 * Позиционирование меню снизу экрана
 */
export function positionMenu(viewportW: number, safeBottom: number = 0): MenuPosition {
    const menuWidth = Math.min(viewportW - CONTEXT_MENU_CONSTANTS.VIEWPORT_MARGIN, 320);
    const left = (viewportW - menuWidth) / 2;

    return {
        left: left,
        bottom: safeBottom + CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN,
        width: menuWidth,
    };
}

/**
 * Плавный скролл для обеспечения видимости элемента и меню
 */
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

    // Вычисляем, где должно быть меню
    const menuTop = viewport.h - menuHeight - safeArea.bottom;

    // Вычисляем, где должен быть элемент (с отступом)
    const elementBottom = targetRect.bottom;
    const requiredSpace = elementBottom - menuTop + opts.edgeMargin;

    if (requiredSpace > 0) {
        // Нужно прокрутить вниз
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

        // Ждем завершения анимации скролла
        await new Promise(resolve => setTimeout(resolve, CONTEXT_MENU_CONSTANTS.SCROLL_ANIMATION_DELAY));
    }
}

/**
 * Создание контроллера долгого нажатия
 */
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

        // Предотвращаем выделение текста
        target.style.userSelect = 'none';
        target.style.webkitUserSelect = 'none';

        timeoutId = setTimeout(() => {
            if (isActive && startPos) {
                wasLongPress = true;
                applyScaleAnimation(target);
                triggerHaptic(HapticType.MEDIUM);

                // Через время анимации возвращаем к scale 1 и открываем меню
                setTimeout(() => {
                    if (isActive && currentElement) {
                        removeScaleAnimation(currentElement);
                        fire(originalRect || undefined);

                        // Очищаем стили через время анимации
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
        // Обычный клик - ничего не делаем
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

/**
 * Фокус-тrap для доступности
 */
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

/**
 * Обработка глобальных клавиш
 */
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

/**
 * Сохранение оригинальных стилей элемента
 */
export function saveElementStyles(element: HTMLElement) {
    return {
        position: element.style.position || 'static',
        top: element.style.top || 'auto',
        left: element.style.left || 'auto',
        zIndex: element.style.zIndex || 'auto',
        transform: element.style.transform || 'none',
    };
}

/**
 * Создание placeholder элемента
 */
export function createPlaceholder(element: HTMLElement, originalRect: DOMRect): HTMLElement {
    const placeholder = document.createElement('div');
    const computedStyle = getComputedStyle(element);

    // Используем originalRect для размеров (ДО масштабирования)
    placeholder.style.width = `${originalRect.width}px`;
    placeholder.style.height = `${originalRect.height}px`;

    // Копируем margin для сохранения позиционирования
    placeholder.style.marginTop = computedStyle.marginTop;
    placeholder.style.marginBottom = computedStyle.marginBottom;
    placeholder.style.marginLeft = computedStyle.marginLeft;
    placeholder.style.marginRight = computedStyle.marginRight;

    // Копируем border
    placeholder.style.borderTop = computedStyle.borderTop;
    placeholder.style.borderBottom = computedStyle.borderBottom;
    placeholder.style.borderLeft = computedStyle.borderLeft;
    placeholder.style.borderRight = computedStyle.borderRight;
    placeholder.style.borderRadius = computedStyle.borderRadius;

    placeholder.style.visibility = 'hidden';

    return placeholder;
}

/**
 * Перемещение элемента на overlay слой с placeholder
 */
export function moveElementToOverlay(
    element: HTMLElement,
    overlayContainer: HTMLElement,
    rect: DOMRect,
    finalPosition?: { top: number; left: number }
) {
    // Сохраняем оригинальные данные
    const originalParent = element.parentElement;
    const originalNextSibling = element.nextSibling;
    const originalStyles = saveElementStyles(element);

    // Создаем placeholder
    const placeholder = createPlaceholder(element, rect);

    // Заменяем элемент на placeholder
    if (originalNextSibling) {
        originalParent!.insertBefore(placeholder, originalNextSibling);
    } else {
        originalParent!.appendChild(placeholder);
    }

    // Перемещаем элемент в overlay
    overlayContainer.appendChild(element);

    // Устанавливаем стили для overlay
    element.style.position = 'absolute';
    element.style.top = `${rect.top}px`;
    element.style.left = `${rect.left}px`;
    element.style.width = `${rect.width}px`;
    element.style.zIndex = CONTEXT_MENU_CONSTANTS.OVERLAY_Z_INDEX.toString();

    // Добавляем transition для позиции
    const currentTransition = element.style.transition;
    const positionTransition = `top ${CONTEXT_MENU_CONSTANTS.POSITION_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), left ${CONTEXT_MENU_CONSTANTS.POSITION_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    if (currentTransition && currentTransition.includes('transform')) {
        element.style.setProperty('transition', `${currentTransition}, ${positionTransition}`, 'important');
    } else {
        element.style.setProperty('transition', positionTransition, 'important');
    }

    // Анимируем к финальной позиции если нужно
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

/**
 * Возвращение элемента на место с анимацией
 */
export function restoreElementToOriginalPosition(
    element: HTMLElement,
    originalParent: HTMLElement,
    originalNextSibling: Node | null,
    originalStyles: ReturnType<typeof saveElementStyles>,
    placeholder: HTMLElement,
    originalRect: DOMRect
) {
    // Анимируем возврат к оригинальной позиции
    element.style.transition = `top ${CONTEXT_MENU_CONSTANTS.RESTORE_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), left ${CONTEXT_MENU_CONSTANTS.RESTORE_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.top = `${originalRect.top}px`;
    element.style.left = `${originalRect.left}px`;
    element.style.width = `${originalRect.width}px`;

    // Ждем завершения анимации, затем возвращаем элемент
    setTimeout(() => {
        // Возвращаем оригинальные стили
        element.style.position = originalStyles.position;
        element.style.top = originalStyles.top;
        element.style.left = originalStyles.left;
        element.style.zIndex = originalStyles.zIndex;
        element.style.transform = originalStyles.transform;
        element.style.transition = '';
        element.style.width = '';
        element.style.height = '';
        element.style.opacity = '';

        // Возвращаем элемент на место placeholder
        if (placeholder.parentElement) {
            placeholder.parentElement.replaceChild(element, placeholder);
        } else {
            // Fallback если placeholder уже удален
            if (originalNextSibling && originalNextSibling.parentElement) {
                originalParent.insertBefore(element, originalNextSibling);
            } else {
                originalParent.appendChild(element);
            }
        }
    }, CONTEXT_MENU_CONSTANTS.RESTORE_ANIMATION_TIMEOUT);
}

/**
 * Блокировка скролла
 */
export function lockScroll(): () => void {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    // Получаем текущую позицию скролла
    const scrollY = window.scrollY;

    // Блокируем скролл
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Возвращаем функцию для разблокировки
    return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;

        // Восстанавливаем позицию скролла
        window.scrollTo(0, scrollY);
    };
}

/**
 * Получение всех скроллируемых контейнеров
 */
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

/**
 * Расчет размеров контекстного меню
 */
export function calculateMenuDimensions(actionsCount: number, maxHeightVH: number = CONTEXT_MENU_CONSTANTS.MENU_MAX_HEIGHT_VH): {
    height: number;
    itemHeight: number;
    padding: number;
} {
    const itemHeight = CONTEXT_MENU_CONSTANTS.MENU_ITEM_HEIGHT;
    const padding = CONTEXT_MENU_CONSTANTS.MENU_PADDING;
    const maxHeight = (maxHeightVH * window.innerHeight) / 100;

    const totalHeight = Math.min(
        actionsCount * itemHeight + padding,
        maxHeight
    );

    return {
        height: totalHeight,
        itemHeight,
        padding
    };
}

/**
 * Расчет позиции меню с учетом выравнивания
 */
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

    // Вычисляем позицию по X в зависимости от выравнивания
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
            // Для правого выравнивания: правый край меню = правый край элемента
            menuLeft = elementRect.right - menuWidth;
            break;
    }

    console.log('Alignment calculation:', {
        alignment,
        elementRect: { left: elementRect.left, right: elementRect.right, width: elementRect.width },
        menuWidth,
        calculatedLeft: menuLeft,
        expectedRight: elementRect.right,
        actualRight: menuLeft + menuWidth
    });

    // Проверяем границы экрана
    const minLeft = safeArea.left + CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN;
    const maxLeft = viewport.w - safeArea.right - CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN - menuWidth;
    const originalMenuLeft = menuLeft;
    menuLeft = Math.max(minLeft, Math.min(menuLeft, maxLeft));

    console.log('Menu alignment debug:', {
        alignment,
        elementRect: {
            left: elementRect.left,
            right: elementRect.right,
            width: elementRect.width,
            top: elementRect.top,
            bottom: elementRect.bottom,
            height: elementRect.height
        },
        menuWidth,
        originalMenuLeft,
        finalMenuLeft: menuLeft,
        adjusted: originalMenuLeft !== menuLeft,
        elementRight: elementRect.right,
        menuRight: menuLeft + menuWidth,
        alignmentCheck: {
            elementRight: elementRect.right,
            menuRight: menuLeft + menuWidth,
            isAligned: Math.abs(elementRect.right - (menuLeft + menuWidth)) < 1,
            difference: elementRect.right - (menuLeft + menuWidth)
        },
        calculation: {
            elementRight: elementRect.right,
            menuWidth: menuWidth,
            calculatedLeft: elementRect.right - menuWidth,
            finalLeft: menuLeft
        }
    });

    // Вычисляем позицию по Y
    if (position === 'under') {
        // Проверяем, помещается ли меню под элементом
        const menuTop = elementRect.bottom + edgeMargin;
        const availableHeight = viewport.h - menuTop - safeArea.bottom;
        const requiredHeight = menuHeight || CONTEXT_MENU_CONSTANTS.MIN_MENU_HEIGHT;

        console.log('calculateMenuPosition UNDER check:', {
            menuTop,
            availableHeight,
            requiredHeight,
            fits: availableHeight >= requiredHeight
        });

        // Если меню не помещается под элементом, позиционируем снизу экрана
        if (availableHeight < requiredHeight) {
            console.log('Menu does not fit under element, positioning at bottom');
            return {
                left: menuLeft,
                bottom: safeArea.bottom + CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN
            };
        }

        console.log('Menu fits under element, positioning under');
        return {
            left: menuLeft,
            top: menuTop
        };
    } else {
        // Для позиции 'bottom' также используем правильное позиционирование
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

/**
 * Проверяет, нужно ли перемещать элемент или можно оставить на месте
 */
export function shouldMoveElement(
    elementRect: DOMRect,
    menuHeight: number,
    edgeMargin: number = CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN
): boolean {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    // Проверяем, помещается ли меню под элементом с запасом
    const menuTop = elementRect.bottom + edgeMargin;
    const availableHeight = viewport.h - menuTop - safeArea.bottom;
    const menuFitsBelow = availableHeight >= menuHeight + CONTEXT_MENU_CONSTANTS.MENU_HEIGHT_BUFFER;

    // Проверяем, не слишком ли большой элемент
    const totalHeight = elementRect.height + menuHeight + edgeMargin;
    const viewportHeight = viewport.h - safeArea.top - safeArea.bottom - CONTEXT_MENU_CONSTANTS.VIEWPORT_MARGIN;
    const isTooLarge = totalHeight > viewportHeight;

    // Проверяем, не выходит ли элемент за верх экрана
    const elementFitsInViewport = elementRect.top >= safeArea.top;

    const result = isTooLarge || !elementFitsInViewport || !menuFitsBelow;

    console.log('shouldMoveElement debug:', {
        elementRect: { bottom: elementRect.bottom, height: elementRect.height, top: elementRect.top },
        menuHeight,
        edgeMargin,
        menuTop,
        availableHeight,
        menuFitsBelow,
        totalHeight,
        viewportHeight,
        isTooLarge,
        elementFitsInViewport,
        result
    });

    return result;
}
