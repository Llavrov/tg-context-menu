import { ViewportRect, SafeArea, MenuPosition, LongPressOpts } from './types';

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
    if (typeof window === 'undefined' || !navigator.vibrate) {
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
    } catch (error) {
        console.warn('Haptic feedback failed:', error);
    }
}

/**
 * Проверка поддержки хаптика
 */
export function isHapticSupported(): boolean {
    return typeof window !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Получение размеров viewport
 */
export function getViewportRect(): ViewportRect {
    if (typeof window === 'undefined') {
        return { w: 375, h: 812 }; // iPhone X размеры по умолчанию
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
    const menuWidth = Math.min(viewportW - 32, 320); // Максимальная ширина 320px, отступы по 16px с каждой стороны
    const left = (viewportW - menuWidth) / 2; // Центрируем меню

    return {
        left: left,
        bottom: safeBottom + 16, // Отступ от нижней части экрана
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
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

/**
 * Создание контроллера долгого нажатия
 */
export function createLongPressController(
    fire: () => void,
    opts: LongPressOpts = {}
): {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerMove: (e: React.PointerEvent) => void;
    dispose: () => void;
} {
    const { delayMs = 450, moveTolerance = 10 } = opts;

    let timeoutId: NodeJS.Timeout | null = null;
    let startPos: { x: number; y: number } | null = null;
    let isActive = false;
    let currentElement: HTMLElement | null = null;

    const clearTimeoutId = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    const reset = () => {
        clearTimeoutId();
        startPos = null;
        isActive = false;
        // Возвращаем scale обратно
        if (currentElement) {
            removeScaleAnimation(currentElement);
            // Очищаем стили после анимации
            setTimeout(() => {
                if (currentElement) {
                    currentElement.style.transform = '';
                    currentElement.style.transition = '';
                }
            }, 250); // Ждем завершения анимации
            currentElement = null;
        }
    };

    const applyScaleAnimation = (element: HTMLElement) => {
        element.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        element.style.transform = 'scale(0.95)';
    };

    const removeScaleAnimation = (element: HTMLElement) => {
        element.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        element.style.transform = 'scale(1)';
    };

    const onPointerDown = (e: React.PointerEvent) => {
        // Игнорируем правую кнопку мыши
        if (e.button === 2) return;

        const target = e.currentTarget as HTMLElement;
        startPos = { x: e.clientX, y: e.clientY };
        isActive = true;
        currentElement = target;

        // Предотвращаем выделение текста
        target.style.userSelect = 'none';
        target.style.webkitUserSelect = 'none';
        if ('webkitTouchCallout' in target.style) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (target.style as any).webkitTouchCallout = 'none';
        }

        timeoutId = setTimeout(() => {
            if (isActive && startPos) {
                // Применяем анимацию scale только при долгом нажатии
                applyScaleAnimation(target);
                triggerHaptic(HapticType.MEDIUM);
                fire();
            }
        }, delayMs);
    };

    const onPointerUp = () => {
        // Убираем анимацию перед сбросом
        if (currentElement) {
            removeScaleAnimation(currentElement);
        }
        reset();
    };

    const onPointerCancel = () => {
        // Убираем анимацию перед сбросом
        if (currentElement) {
            removeScaleAnimation(currentElement);
        }
        reset();
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isActive || !startPos) return;

        const deltaX = Math.abs(e.clientX - startPos.x);
        const deltaY = Math.abs(e.clientY - startPos.y);

        if (deltaX > moveTolerance || deltaY > moveTolerance) {
            // Убираем анимацию при движении
            if (currentElement) {
                removeScaleAnimation(currentElement);
            }
            reset();
        }
    };

    const dispose = () => {
        reset();
    };

    return {
        onPointerDown,
        onPointerUp,
        onPointerCancel,
        onPointerMove,
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
export function createPlaceholder(element: HTMLElement): HTMLElement {
    const placeholder = document.createElement('div');
    const computedStyle = getComputedStyle(element);

    // Копируем размеры и отступы
    placeholder.style.width = computedStyle.width;
    placeholder.style.height = computedStyle.height;
    placeholder.style.margin = computedStyle.margin;
    placeholder.style.padding = computedStyle.padding;
    placeholder.style.border = computedStyle.border;
    placeholder.style.borderRadius = computedStyle.borderRadius;
    placeholder.style.visibility = 'hidden'; // Делаем невидимым, но сохраняем место

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

    // Создаем placeholder для сохранения места
    const placeholder = createPlaceholder(element);

    // Заменяем элемент на placeholder
    if (originalNextSibling) {
        originalParent!.insertBefore(placeholder, originalNextSibling);
    } else {
        originalParent!.appendChild(placeholder);
    }

    // Перемещаем элемент в overlay
    overlayContainer.appendChild(element);

    // Устанавливаем начальные стили с сохранением ширины
    element.style.position = 'absolute';
    element.style.top = `${rect.top}px`;
    element.style.left = `${rect.left}px`;
    element.style.width = `${rect.width}px`; // Сохраняем ширину
    element.style.zIndex = '1000';
    element.style.transition = 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1), left 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'; // БЕЗ opacity!

    // Если есть финальная позиция, анимируем к ней
    if (finalPosition) {
        // Небольшая задержка для плавности
        requestAnimationFrame(() => {
            element.style.top = `${finalPosition.top}px`;
            element.style.left = `${finalPosition.left}px`;
            element.style.transform = 'translateY(-5px)';
        });
    } else {
        // Просто поднимаем элемент
        element.style.transform = 'translateY(-5px)';
    }

    console.log('moveElementToOverlay:', {
        rect: { top: rect.top, left: rect.left, width: rect.width },
        finalPosition,
        placeholder,
        element
    });

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
    console.log('restoreElementToOriginalPosition START:', {
        element,
        originalRect: { top: originalRect.top, left: originalRect.left, width: originalRect.width },
        placeholder,
        placeholderParent: placeholder.parentElement,
        originalParent,
        originalNextSibling
    });

    // Анимируем возврат к оригинальной позиции
    element.style.transition = 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'; // БЕЗ opacity!
    element.style.top = `${originalRect.top}px`;
    element.style.left = `${originalRect.left}px`;
    element.style.width = `${originalRect.width}px`;
    element.style.transform = 'translateY(0)';

    console.log('restoreElementToOriginalPosition ANIMATING:', {
        elementStyles: {
            top: element.style.top,
            left: element.style.left,
            width: element.style.width
        }
    });

    // Ждем завершения анимации, затем возвращаем элемент
    setTimeout(() => {
        console.log('restoreElementToOriginalPosition TIMEOUT START:', {
            placeholderStillInDOM: placeholder.parentElement !== null,
            placeholderParent: placeholder.parentElement
        });

        // Возвращаем оригинальные стили
        element.style.position = originalStyles.position;
        element.style.top = originalStyles.top;
        element.style.left = originalStyles.left;
        element.style.zIndex = originalStyles.zIndex;
        element.style.transform = originalStyles.transform;
        element.style.transition = '';
        element.style.width = ''; // Убираем фиксированную ширину

        // Возвращаем элемент на место placeholder
        if (placeholder.parentElement) {
            console.log('restoreElementToOriginalPosition: Replacing placeholder with element');
            placeholder.parentElement.replaceChild(element, placeholder);
            console.log('restoreElementToOriginalPosition: Element restored, parent:', element.parentElement);
        } else {
            console.log('restoreElementToOriginalPosition: Placeholder already removed, using fallback');
            // Если placeholder уже удален, используем originalNextSibling
            if (originalNextSibling && originalNextSibling.parentElement) {
                console.log('restoreElementToOriginalPosition: Inserting before originalNextSibling');
                originalParent.insertBefore(element, originalNextSibling);
            } else {
                console.log('restoreElementToOriginalPosition: Appending to originalParent');
                originalParent.appendChild(element);
            }
            console.log('restoreElementToOriginalPosition: Element restored (fallback), parent:', element.parentElement);
        }

        console.log('restoreElementToOriginalPosition COMPLETE');
    }, 300); // Ждем завершения анимации
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
export function calculateMenuDimensions(actionsCount: number, maxHeightVH: number = 60): {
    height: number;
    itemHeight: number;
    padding: number;
} {
    const itemHeight = 52; // высота одного пункта меню
    const padding = 32; // отступы сверху и снизу
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
 * Расчет позиции меню относительно элемента (как в Telegram)
 */
export function calculateMenuPositionRelativeToElement(
    elementRect: DOMRect,
    menuWidth: number = 250
): {
    left: number;
    top: number;
} {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    // Выравниваем меню по правому краю элемента
    const elementRight = elementRect.right;
    let menuLeft = elementRight - menuWidth;

    // Проверяем, чтобы меню не выходило за левый край экрана
    if (menuLeft < safeArea.left + 16) {
        menuLeft = safeArea.left + 16;
    }

    // Проверяем, чтобы меню не выходило за правый край экрана
    if (menuLeft + menuWidth > viewport.w - safeArea.right - 16) {
        menuLeft = viewport.w - safeArea.right - 16 - menuWidth;
    }

    // Вычисляем позицию меню снизу экрана (для случая когда нужно перемещать элемент)
    const menuBottom = safeArea.bottom + 16;
    const menuTop = viewport.h - menuBottom;

    console.log('calculateMenuPositionRelativeToElement:', {
        elementRight,
        menuWidth,
        menuLeft,
        elementRect: { left: elementRect.left, right: elementRect.right, width: elementRect.width }
    });

    return {
        left: menuLeft,
        top: menuTop
    };
}

/**
 * Расчет финальной позиции элемента (как в Telegram)
 */
export function calculateElementFinalPosition(
    elementRect: DOMRect,
    menuHeight: number,
    menuLeft: number,
    edgeMargin: number = 12
): {
    finalTop: number;
    finalLeft: number;
    needsScroll: boolean;
    scrollOffset: number;
} {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    // Вычисляем позицию меню (снизу экрана)
    const menuTop = viewport.h - menuHeight - safeArea.bottom - 16; // 16px отступ от низа

    // Вычисляем финальную позицию элемента (над меню с отступом)
    const elementHeight = elementRect.height;
    const finalTop = menuTop - elementHeight - edgeMargin;
    const finalLeft = elementRect.left;

    // Проверяем, помещается ли элемент в видимую область
    const elementTop = finalTop;

    // Если элемент выходит за верх экрана, нужно скроллить
    const needsScroll = elementTop < safeArea.top;
    const scrollOffset = needsScroll ? safeArea.top - elementTop : 0;

    return {
        finalTop: finalTop + scrollOffset,
        finalLeft,
        needsScroll,
        scrollOffset
    };
}

/**
 * Проверка, помещается ли элемент и меню в видимую область
 */
/**
 * Проверяет, нужно ли перемещать элемент или можно оставить на месте
 */
export function shouldMoveElement(
    elementRect: DOMRect,
    menuHeight: number,
    edgeMargin: number = 12
): {
    shouldMove: boolean;
    reason: 'fits' | 'too_high' | 'too_large' | 'viewport_overflow';
} {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    // Вычисляем позицию меню снизу экрана
    const menuTop = viewport.h - menuHeight - safeArea.bottom - 16;

    // Вычисляем, где будет нижняя граница элемента, если оставить его на месте
    const elementBottomAtCurrentPosition = elementRect.bottom;

    // Вычисляем, где будет верхняя граница элемента, если оставить его на месте
    const elementTopAtCurrentPosition = elementRect.top;

    // Проверяем, помещается ли меню под элементом
    const menuFitsBelow = elementBottomAtCurrentPosition + edgeMargin + menuHeight <= viewport.h - safeArea.bottom - 16;

    // Проверяем, не выходит ли элемент за верх экрана
    const elementFitsInViewport = elementTopAtCurrentPosition >= safeArea.top;

    // Проверяем, не слишком ли большой элемент (высота элемента + меню > высота экрана)
    const totalHeight = elementRect.height + menuHeight + edgeMargin;
    const viewportHeight = viewport.h - safeArea.top - safeArea.bottom - 32; // 32px отступы
    const isTooLarge = totalHeight > viewportHeight;

    console.log('SHOULD_MOVE_ELEMENT:', {
        elementRect: {
            top: elementRect.top,
            bottom: elementRect.bottom,
            height: elementRect.height
        },
        menuHeight,
        viewport: { h: viewport.h },
        safeArea,
        menuTop,
        menuFitsBelow,
        elementFitsInViewport,
        isTooLarge,
        totalHeight,
        viewportHeight
    });

    // Если элемент слишком большой для экрана - перемещаем
    if (isTooLarge) {
        return { shouldMove: true, reason: 'too_large' };
    }

    // Если элемент не помещается в viewport (выходит за верх) - перемещаем
    if (!elementFitsInViewport) {
        return { shouldMove: true, reason: 'viewport_overflow' };
    }

    // Если меню не помещается под элементом - перемещаем
    if (!menuFitsBelow) {
        return { shouldMove: true, reason: 'too_high' };
    }

    // Иначе - оставляем на месте
    return { shouldMove: false, reason: 'fits' };
}

export function checkElementAndMenuFit(
    elementRect: DOMRect,
    menuHeight: number,
    edgeMargin: number = 12
): {
    fits: boolean;
    needsScroll: boolean;
    scrollOffset: number;
} {
    const position = calculateElementFinalPosition(elementRect, menuHeight, edgeMargin);

    return {
        fits: !position.needsScroll,
        needsScroll: position.needsScroll,
        scrollOffset: position.scrollOffset
    };
}
