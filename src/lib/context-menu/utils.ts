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
    onClick: (e: React.MouseEvent) => void;
    dispose: () => void;
} {
    const { delayMs = 350, moveTolerance = 10 } = opts; // 600ms - время до начала анимации scale

    let timeoutId: NodeJS.Timeout | null = null;
    let startPos: { x: number; y: number } | null = null;
    let isActive = false;
    let currentElement: HTMLElement | null = null;
    let wasLongPress = false; // Флаг для отслеживания долгого нажатия

    const clearTimeoutId = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    const reset = (skipScaleReset = false) => {
        clearTimeoutId();
        startPos = null;
        isActive = false;
        wasLongPress = false; // Сбрасываем флаг долгого нажатия

        // Возвращаем scale обратно только если не пропускаем
        if (currentElement && !skipScaleReset) {
            removeScaleAnimation(currentElement);
            // Очищаем стили после анимации
            setTimeout(() => {
                if (currentElement) {
                    currentElement.style.transform = '';
                    currentElement.style.transition = '';
                    currentElement.style.transformOrigin = ''; // Очищаем transform-origin
                }
            }, 350); // Ждем завершения анимации (0.35s)
        }
        currentElement = null;
    };

    const applyScaleAnimation = (element: HTMLElement) => {
        console.log('applyScaleAnimation: Starting scale animation on element:', element);

        // Сохраняем текущие transition стили
        const currentTransition = element.style.transition;
        console.log('applyScaleAnimation: Current transition before:', currentTransition);

        // Устанавливаем центр анимации в центр элемента
        element.style.transformOrigin = 'center';

        // Принудительно устанавливаем transition через setProperty для лучшей совместимости
        element.style.setProperty('transition', 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)', 'important');
        element.style.transform = 'scale(0.95)';

        console.log('applyScaleAnimation: Applied styles:', {
            transformOrigin: element.style.transformOrigin,
            transition: element.style.transition,
            transform: element.style.transform
        });
    };

    const removeScaleAnimation = (element: HTMLElement) => {
        console.log('removeScaleAnimation: Starting scale removal on element:', element);

        // Устанавливаем центр анимации в центр элемента
        element.style.transformOrigin = 'center';

        // Принудительно устанавливаем transition через setProperty для лучшей совместимости
        element.style.setProperty('transition', 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)', 'important');
        element.style.transform = 'scale(1)';

        console.log('removeScaleAnimation: Applied styles:', {
            transformOrigin: element.style.transformOrigin,
            transition: element.style.transition,
            transform: element.style.transform
        });
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
                wasLongPress = true; // Устанавливаем флаг долгого нажатия
                applyScaleAnimation(target);
                triggerHaptic(HapticType.MEDIUM);

                // Через 350ms (время анимации scale 0.9) возвращаем к scale 1 и ОДНОВРЕМЕННО открываем меню
                setTimeout(() => {
                    if (isActive && currentElement) {
                        removeScaleAnimation(currentElement);
                        // Открываем меню ОДНОВРЕМЕННО с анимацией scale 1
                        if (isActive) {
                            fire();
                        }
                    }
                }, 350);
            }
        }, delayMs);
    };

    const onPointerUp = () => {
        // Если это было долгое нажатие, просто сбрасываем состояние без анимаций
        if (wasLongPress) {
            reset(true); // Пропускаем сброс scale анимации
        } else {
            // Убираем анимацию перед сбросом только для обычных нажатий
            if (currentElement) {
                removeScaleAnimation(currentElement);
            }
            reset();
        }
    };

    const onPointerCancel = () => {
        // Если это было долгое нажатие, просто сбрасываем состояние без анимаций
        if (wasLongPress) {
            reset(true); // Пропускаем сброс scale анимации
        } else {
            // Убираем анимацию перед сбросом только для обычных нажатий
            if (currentElement) {
                removeScaleAnimation(currentElement);
            }
            reset();
        }
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

    const onClick = (e: React.MouseEvent) => {
        console.log('createLongPressController: onClick triggered', e.currentTarget, 'wasLongPress:', wasLongPress);
        // При обычном клике не должно быть хаптика, только при долгом нажатии
        // Хаптик убран из обычного тапа
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
export function createPlaceholder(element: HTMLElement): HTMLElement {
    const placeholder = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const computedStyle = getComputedStyle(element);

    // Используем точные размеры из getBoundingClientRect
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;

    // Копируем все margin для сохранения правильного позиционирования
    placeholder.style.marginTop = computedStyle.marginTop;
    placeholder.style.marginBottom = computedStyle.marginBottom;
    placeholder.style.marginLeft = computedStyle.marginLeft;
    placeholder.style.marginRight = computedStyle.marginRight;

    // Копируем padding для сохранения внутренних отступов
    placeholder.style.paddingTop = computedStyle.paddingTop;
    placeholder.style.paddingBottom = computedStyle.paddingBottom;
    placeholder.style.paddingLeft = computedStyle.paddingLeft;
    placeholder.style.paddingRight = computedStyle.paddingRight;

    // Копируем border для сохранения границ
    placeholder.style.borderTop = computedStyle.borderTop;
    placeholder.style.borderBottom = computedStyle.borderBottom;
    placeholder.style.borderLeft = computedStyle.borderLeft;
    placeholder.style.borderRight = computedStyle.borderRight;
    placeholder.style.borderRadius = computedStyle.borderRadius;
    placeholder.style.visibility = 'hidden'; // Делаем невидимым, но сохраняем место

    console.log('createPlaceholder:', {
        originalRect: { width: rect.width, height: rect.height },
        originalMarginBottom: computedStyle.marginBottom,
        placeholder: { width: placeholder.style.width, height: placeholder.style.height }
    });

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

    // Устанавливаем начальные стили с сохранением ширины И transform
    element.style.position = 'absolute';
    element.style.top = `${rect.top}px`;
    element.style.left = `${rect.left}px`;
    element.style.width = `${rect.width}px`; // Возвращаем фиксированную ширину
    element.style.zIndex = '1000';
    element.style.padding = '0'; // Убираем все padding у обертки
    // НЕ трогаем transform - он может содержать scale анимацию

    // Проверяем, есть ли уже transition для transform (от scale анимации)
    const currentTransition = element.style.transition;
    if (currentTransition && currentTransition.includes('transform')) {
        // Если есть transition для transform, добавляем к нему top и left через setProperty
        element.style.setProperty('transition', `${currentTransition}, top 0.4s cubic-bezier(0.4, 0, 0.2, 1), left 0.4s cubic-bezier(0.4, 0, 0.2, 1)`, 'important');
    } else {
        // Иначе устанавливаем только для top и left
        element.style.setProperty('transition', 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1), left 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
    }

    // Если есть финальная позиция, анимируем к ней
    if (finalPosition) {
        // Небольшая задержка для плавности
        requestAnimationFrame(() => {
            element.style.top = `${finalPosition.top}px`;
            element.style.left = `${finalPosition.left}px`;
            // Убираем translateY - элемент должен оставаться в своем размере
        });
    } else {
        // Элемент остается на месте без дополнительных трансформаций
        // Убираем translateY - элемент должен оставаться в своем размере
    }

    console.log('moveElementToOverlay:', {
        rect: { top: rect.top, left: rect.left, width: rect.width },
        finalPosition,
        placeholder,
        element,
        currentTransform: element.style.transform,
        currentTransition: element.style.transition
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
    element.style.transition = 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'; // Убираем transform из transition!
    element.style.top = `${originalRect.top}px`;
    element.style.left = `${originalRect.left}px`;
    element.style.width = `${originalRect.width}px`;
    // Убираем transform - он не нужен при возврате

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

        // Возвращаем оригинальные стили БЕЗ transition, чтобы элемент не исчезал
        element.style.position = originalStyles.position;
        element.style.top = originalStyles.top;
        element.style.left = originalStyles.left;
        element.style.zIndex = originalStyles.zIndex;
        element.style.transform = originalStyles.transform;
        element.style.transition = ''; // Убираем transition чтобы не было анимации
        element.style.width = ''; // Убираем фиксированную ширину
        element.style.padding = ''; // Убираем padding: 0
        element.style.opacity = ''; // Убираем opacity если был установлен

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
 * Расчет позиции меню относительно элемента с учетом выравнивания
 */
export function calculateMenuPositionRelativeToElement(
    elementRect: DOMRect,
    menuWidth: number = 250,
    alignment: 'left' | 'right' | 'center' = 'right'
): {
    left: number;
    bottom: number;
} {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    let menuLeft: number;

    // Вычисляем позицию в зависимости от выравнивания
    switch (alignment) {
        case 'left':
            // Выравниваем меню по левому краю элемента
            menuLeft = elementRect.left;
            break;
        case 'center':
            // Центрируем меню относительно элемента
            menuLeft = elementRect.left + (elementRect.width - menuWidth) / 2;
            break;
        case 'right':
        default:
            // Выравниваем меню по правому краю элемента (по умолчанию)
            menuLeft = elementRect.right - menuWidth;
            break;
    }

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

    console.log('calculateMenuPositionRelativeToElement:', {
        alignment,
        elementRect: { left: elementRect.left, right: elementRect.right, width: elementRect.width },
        menuWidth,
        menuLeft,
        menuBottom
    });

    return {
        left: menuLeft,
        bottom: menuBottom
    };
}

/**
 * Расчет позиции меню под элементом с учетом выравнивания
 */
export function calculateMenuPositionUnderElement(
    elementRect: DOMRect,
    menuWidth: number = 250,
    alignment: 'left' | 'right' | 'center' = 'right',
    edgeMargin: number = 12
): {
    left: number;
    top: number;
} {
    const viewport = getViewportRect();
    const safeArea = getSafeArea();

    let menuLeft: number;

    // Вычисляем позицию в зависимости от выравнивания
    switch (alignment) {
        case 'left':
            // Выравниваем меню по левому краю элемента
            menuLeft = elementRect.left;
            break;
        case 'center':
            // Центрируем меню относительно элемента
            menuLeft = elementRect.left + (elementRect.width - menuWidth) / 2;
            break;
        case 'right':
        default:
            // Выравниваем меню по правому краю элемента (по умолчанию)
            menuLeft = elementRect.right - menuWidth;
            break;
    }

    // Проверяем, чтобы меню не выходило за левый край экрана
    if (menuLeft < safeArea.left + 16) {
        menuLeft = safeArea.left + 16;
    }

    // Проверяем, чтобы меню не выходило за правый край экрана
    if (menuLeft + menuWidth > viewport.w - safeArea.right - 16) {
        menuLeft = viewport.w - safeArea.right - 16 - menuWidth;
    }

    // Позиционируем меню под элементом
    const menuTop = elementRect.bottom + edgeMargin;

    console.log('calculateMenuPositionUnderElement:', {
        alignment,
        elementRect: { left: elementRect.left, right: elementRect.right, width: elementRect.width },
        menuWidth,
        menuLeft,
        menuTop,
        edgeMargin
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
    reason: 'fits' | 'too_high' | 'too_large' | 'viewport_overflow' | 'upper_overflow';
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

    // Дополнительная проверка: если элемент в верхней части экрана и меню не помещается под ним
    const isInUpperHalf = elementTopAtCurrentPosition < viewport.h / 2;
    const menuWouldOverflow = elementBottomAtCurrentPosition + edgeMargin + menuHeight > viewport.h - safeArea.bottom - 16;

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
        viewportHeight,
        isInUpperHalf,
        menuWouldOverflow
    });

    // Если элемент слишком большой для экрана - перемещаем
    if (isTooLarge) {
        return { shouldMove: true, reason: 'too_large' };
    }

    // Если элемент не помещается в viewport (выходит за верх) - перемещаем
    if (!elementFitsInViewport) {
        return { shouldMove: true, reason: 'viewport_overflow' };
    }

    // Только если меню действительно не помещается под элементом - перемещаем
    // Добавляем буфер в 50px для более консервативного подхода
    if (elementBottomAtCurrentPosition + edgeMargin + menuHeight + 50 > viewport.h - safeArea.bottom - 16) {
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
