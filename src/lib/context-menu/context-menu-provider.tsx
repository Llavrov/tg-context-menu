'use client';

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    ContextMenuContextType,
    ContextMenuState,
    OpenContextMenuConfig,
    ContextMenuAction,
    MenuPosition
} from './types';
import { ContextMenuContext } from './context';
import {
    createLongPressController,
    ensureVisibleWithMenu,
    createGlobalKeyHandler,
    moveElementToOverlay,
    restoreElementToOriginalPosition,
    lockScroll,
    calculateMenuDimensions,
    checkElementAndMenuFit,
    calculateElementFinalPosition,
    shouldMoveElement,
    getViewportRect,
    getSafeArea,
    triggerHaptic,
    HapticType
} from './utils';
import { OverlayContainer } from './components/overlay-container';


interface ContextMenuProviderProps {
    children: React.ReactNode;
}

export function ContextMenuProvider({ children }: ContextMenuProviderProps) {
    const [state, setState] = useState<ContextMenuState>({
        isOpen: false,
        originalElement: null,
        placeholderElement: null,
        originalPosition: null,
        menuPosition: null,
        originalParent: null,
        originalNextSibling: null,
        originalStyles: {
            position: 'static',
            top: 'auto',
            left: 'auto',
            zIndex: 'auto',
            transform: 'none',
        },
        animationPhase: 'initial',
        config: null,
    });


    const [mounted, setMounted] = useState(false);
    const portalRef = useRef<HTMLElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const longPressControllerRef = useRef<ReturnType<typeof createLongPressController> | null>(null);
    const unlockScrollRef = useRef<(() => void) | null>(null);
    const placeholderRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        setMounted(true);
        portalRef.current = document.getElementById('context-menu-portal') || document.body;
    }, []);

    // Перемещаем элемент в overlay после рендеринга
    useEffect(() => {
        if (state.isOpen && state.originalElement && overlayRef.current && state.animationPhase === 'initial' && state.config && !placeholderRef.current) {
            console.log('useEffect: Moving element to overlay');
            const element = state.originalElement;
            const rect = state.originalPosition!;

            // Вычисляем размеры меню
            const menuDimensions = calculateMenuDimensions(
                state.config.actions.length,
                state.config.maxMenuHeightVH || 60
            );

            // Проверяем, нужно ли перемещать элемент
            const moveCheck = shouldMoveElement(
                rect,
                menuDimensions.height,
                state.config.edgeMargin || 12
            );

            console.log('useEffect: Move check', moveCheck);

            let result;
            if (moveCheck.shouldMove) {
                // Если нужно перемещать - вычисляем финальную позицию
                const viewport = getViewportRect();
                const safeArea = getSafeArea();
                const menuWidth = 250;

                // Выравниваем меню по правому краю элемента
                const elementRight = rect.right;
                let menuLeft = elementRight - menuWidth;

                // Проверяем границы экрана
                if (menuLeft < safeArea.left + 16) {
                    menuLeft = safeArea.left + 16;
                }

                if (menuLeft + menuWidth > viewport.w - safeArea.right - 16) {
                    menuLeft = viewport.w - safeArea.right - 16 - menuWidth;
                }

                const finalPosition = calculateElementFinalPosition(
                    rect,
                    menuDimensions.height,
                    menuLeft,
                    state.config.edgeMargin || 12
                );

                result = moveElementToOverlay(
                    element,
                    overlayRef.current,
                    rect,
                    { top: finalPosition.finalTop, left: finalPosition.finalLeft }
                );
            } else {
                // Если не нужно перемещать - просто перемещаем в overlay без изменения позиции
                result = moveElementToOverlay(
                    element,
                    overlayRef.current,
                    rect
                    // Не передаем finalPosition - элемент остается на месте
                );
            }

            console.log('useEffect: Saving placeholder to ref', result.placeholder);

            // Сохраняем placeholder в ref (не теряется при ререндерах)
            placeholderRef.current = result.placeholder;

            // Также обновляем состояние
            setState(prev => ({
                ...prev,
                placeholderElement: result.placeholder,
                originalParent: result.originalParent,
                originalNextSibling: result.originalNextSibling,
                originalStyles: result.originalStyles
            }));
        }
    }, [state.isOpen, state.originalElement, state.animationPhase, state.originalPosition, state.config]);

    // Обработка глобальных клавиш
    useEffect(() => {
        if (state.isOpen) {
            const cleanup = createGlobalKeyHandler(() => close('escape'));
            return cleanup;
        }
    }, [state.isOpen]);

    // Обработка скролла и ресайза для обновления позиции
    useEffect(() => {
        if (!state.isOpen || !state.originalElement) return;

        const updatePosition = () => {
            if (state.originalElement) {
                const rect = state.originalElement.getBoundingClientRect();
                setState(prev => ({ ...prev, originalPosition: rect }));
            }
        };

        const scrollContainer = state.config?.scrollContainer === 'window' ? window : state.config?.scrollContainer;

        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', updatePosition, { passive: true });
            window.addEventListener('resize', updatePosition, { passive: true });

            return () => {
                scrollContainer.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [state.isOpen, state.originalElement, state.config?.scrollContainer]);

    const open = useCallback(async (element: HTMLElement, config: OpenContextMenuConfig) => {
        const rect = element.getBoundingClientRect();

        console.log('OPEN START:', { element, rect });

        // Хаптик при открытии меню
        triggerHaptic(HapticType.MEDIUM);

        // Блокируем скролл
        const unlockScroll = lockScroll();
        unlockScrollRef.current = unlockScroll;

        // Вычисляем размеры меню
        const menuDimensions = calculateMenuDimensions(
            config.actions.length,
            config.maxMenuHeightVH || 60
        );

        // Проверяем, нужно ли перемещать элемент
        const moveCheck = shouldMoveElement(
            rect,
            menuDimensions.height,
            config.edgeMargin || 12
        );

        console.log('MOVE_CHECK:', moveCheck);

        // Сохраняем оригинальные данные элемента
        const originalParent = element.parentElement!;
        const originalNextSibling = element.nextSibling;
        const originalStyles = {
            position: element.style.position || 'static',
            top: element.style.top || 'auto',
            left: element.style.left || 'auto',
            zIndex: element.style.zIndex || 'auto',
            transform: element.style.transform || 'none',
        };

        console.log('OPEN: Saving to state', {
            originalParent,
            originalNextSibling,
            originalStyles
        });

        // Вычисляем позицию меню
        console.log('OPEN: Computing menu position', {
            moveCheck,
            rect: {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
            },
            viewport: getViewportRect(),
            safeArea: getSafeArea(),
            menuDimensions
        });

        let menuPos;
        if (moveCheck.shouldMove) {
            // Если нужно перемещать - меню снизу экрана
            const viewport = getViewportRect();
            const safeArea = getSafeArea();
            const menuWidth = 250;

            // Выравниваем меню по правому краю элемента
            const elementRight = rect.right;
            let menuLeft = elementRight - menuWidth;

            // Проверяем, чтобы меню не выходило за левый край экрана
            if (menuLeft < safeArea.left + 16) {
                menuLeft = safeArea.left + 16;
            }

            // Проверяем, чтобы меню не выходило за правый край экрана
            if (menuLeft + menuWidth > viewport.w - safeArea.right - 16) {
                menuLeft = viewport.w - safeArea.right - 16 - menuWidth;
            }

            // Позиция меню снизу экрана
            const menuBottom = safeArea.bottom + 16;
            const menuTop = viewport.h - menuBottom;

            menuPos = {
                left: Number(menuLeft),
                bottom: menuBottom
            } as MenuPosition;

            console.log('OPEN: Menu position (should move)', {
                menuPos,
                elementRight,
                menuLeft,
                menuBottom,
                viewport: { w: viewport.w, h: viewport.h },
                safeArea
            });
        } else {
            // Если не нужно перемещать - меню под элементом
            const menuWidth = 250;
            const viewport = getViewportRect();
            const safeArea = getSafeArea();

            // Выравниваем меню по правому краю элемента (как в Telegram)
            const elementRight = rect.right;
            let menuLeft = elementRight - menuWidth;

            // Проверяем границы экрана
            if (menuLeft < safeArea.left + 16) {
                menuLeft = safeArea.left + 16;
            }

            if (menuLeft + menuWidth > viewport.w - safeArea.right - 16) {
                menuLeft = viewport.w - safeArea.right - 16 - menuWidth;
            }

            // ИСПРАВЛЕНО: Позиционируем меню ПОД элементом, а не снизу экрана
            // Используем top вместо bottom для позиционирования под элементом
            const menuTop = rect.bottom + 12; // 12px отступ от элемента
            
            menuPos = {
                left: Number(menuLeft),
                top: menuTop // Используем top для позиционирования под элементом
            } as MenuPosition;

            console.log('OPEN: Menu position (should NOT move)', {
                menuPos,
                elementRect: {
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                    bottom: rect.bottom,
                    width: rect.width
                },
                menuLeft,
                menuTop,
                viewport: { w: viewport.w, h: viewport.h },
                safeArea
            });
        }

        setState({
            isOpen: true,
            originalElement: element,
            originalPosition: rect,
            menuPosition: menuPos,
            originalParent,
            originalNextSibling,
            originalStyles,
            placeholderElement: null, // Будет установлен в useEffect
            animationPhase: 'initial',
            config,
        });

        // Если нужно перемещать и не помещается, скроллим контейнер
        if (moveCheck.shouldMove) {
            const fitCheck = checkElementAndMenuFit(rect, menuDimensions.height, config.edgeMargin || 12);
            if (fitCheck.needsScroll) {
                await ensureVisibleWithMenu(rect, menuDimensions.height, {
                    edgeMargin: config.edgeMargin || 12,
                    scrollContainer: config.scrollContainer || 'window',
                });
            }
        }

        // Переходим в стабильное состояние
        setTimeout(() => {
            setState(prev => ({
                ...prev,
                animationPhase: 'stable'
            }));
        }, 300);
    }, []);

    const close = useCallback(async (reason: 'backdrop' | 'escape' | 'gesture' | 'action' = 'backdrop') => {
        console.log('CLOSE START:', {
            reason,
            state: {
                originalElement: state.originalElement,
                originalParent: state.originalParent,
                originalStyles: state.originalStyles,
                placeholderElement: state.placeholderElement,
                originalPosition: state.originalPosition
            },
            placeholderRef: placeholderRef.current
        });

        // Хаптик при закрытии меню (разные типы для разных причин)
        if (reason === 'action') {
            triggerHaptic(HapticType.SUCCESS);
        } else if (reason === 'escape') {
            triggerHaptic(HapticType.LIGHT);
        } else {
            triggerHaptic(HapticType.SELECTION);
        }

        // Используем placeholder из ref (более надёжно)
        const placeholder = placeholderRef.current || state.placeholderElement;

        // Возвращаем элемент на место с анимацией
        if (state.originalElement && state.originalParent && state.originalStyles && placeholder && state.originalPosition) {
            console.log('CLOSE: Calling restoreElementToOriginalPosition with placeholder from ref');
            restoreElementToOriginalPosition(
                state.originalElement,
                state.originalParent,
                state.originalNextSibling,
                state.originalStyles,
                placeholder,
                state.originalPosition
            );
        } else {
            console.log('CLOSE: Skipping restore, missing data:', {
                hasElement: !!state.originalElement,
                hasParent: !!state.originalParent,
                hasStyles: !!state.originalStyles,
                hasPlaceholder: !!placeholder,
                hasPosition: !!state.originalPosition
            });
        }

        // Разблокируем скролл
        if (unlockScrollRef.current) {
            unlockScrollRef.current();
            unlockScrollRef.current = null;
        }

        setState(prev => ({
            ...prev,
            animationPhase: 'closing'
        }));

        // Ждем завершения анимации возврата элемента
        setTimeout(() => {
            console.log('CLOSE: Clearing state and ref');
            placeholderRef.current = null; // Очищаем ref
            setState({
                isOpen: false,
                originalElement: null,
                placeholderElement: null,
                originalPosition: null,
                menuPosition: null,
                originalParent: null,
                originalNextSibling: null,
                originalStyles: {
                    position: 'static',
                    top: 'auto',
                    left: 'auto',
                    zIndex: 'auto',
                    transform: 'none',
                },
                animationPhase: 'initial',
                config: null,
            });
        }, 350); // Увеличиваем время для завершения анимации возврата
    }, [state.originalElement, state.originalParent, state.originalNextSibling, state.originalStyles, state.placeholderElement, state.originalPosition]);

    const longPress = useCallback((config: OpenContextMenuConfig) => {
        return {
            onPointerDown: (e: React.PointerEvent) => {
                const element = e.currentTarget as HTMLElement;
                const controller = createLongPressController(() => {
                    open(element, config);
                }, { delayMs: config.longPressMs || 450 });

                longPressControllerRef.current = controller;
                controller.onPointerDown(e);
            },
            onPointerUp: () => {
                if (longPressControllerRef.current) {
                    longPressControllerRef.current.onPointerUp();
                }
            },
            onPointerLeave: () => {
                if (longPressControllerRef.current) {
                    longPressControllerRef.current.onPointerCancel();
                }
            },
            onPointerCancel: () => {
                if (longPressControllerRef.current) {
                    longPressControllerRef.current.onPointerCancel();
                }
            },
            onPointerMove: (e: React.PointerEvent) => {
                if (longPressControllerRef.current) {
                    longPressControllerRef.current.onPointerMove(e);
                }
            },
            onContextMenu: (e: React.MouseEvent) => {
                e.preventDefault();
                const element = e.currentTarget as HTMLElement;
                open(element, config);
            },
        };
    }, [open]);

    const handleActionSelect = useCallback((action: ContextMenuAction) => {
        action.onSelect();
        close('action');
    }, [close]);

    const contextValue: ContextMenuContextType = useMemo(() => ({
        state,
        longPress,
        open,
        close,
    }), [state, longPress, open, close]);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            if (longPressControllerRef.current) {
                longPressControllerRef.current.dispose();
            }
        };
    }, []);

    return (
        <ContextMenuContext.Provider value={contextValue}>
            {children}

            {/* Overlay Container */}
            {mounted && createPortal(
                <OverlayContainer
                    ref={overlayRef}
                    state={state}
                    onClose={() => close('backdrop')}
                    onActionSelect={handleActionSelect}
                />,
                portalRef.current || document.body
            )}
        </ContextMenuContext.Provider>
    );
}

