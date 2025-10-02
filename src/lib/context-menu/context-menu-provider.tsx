'use client';

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    ContextMenuContextType,
    ContextMenuState,
    OpenContextMenuConfig,
    ContextMenuAction,
} from './types';
import { ContextMenuContext } from './context';
import {
    createLongPressController,
    createGlobalKeyHandler,
    moveElementToOverlay,
    restoreElementToOriginalPosition,
    lockScroll,
    calculateMenuDimensions,
    calculateMenuPosition,
    shouldMoveElement,
    getViewportRect,
    getSafeArea,
    CONTEXT_MENU_CONSTANTS
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

    useEffect(() => {
        if (state.isOpen && state.originalElement && overlayRef.current && state.config && !placeholderRef.current) {
            const element = state.originalElement;
            const rect = state.originalPosition!;

            const menuDimensions = calculateMenuDimensions(
                state.config.actions.length,
                state.config.maxMenuHeightVH || CONTEXT_MENU_CONSTANTS.MENU_MAX_HEIGHT_VH
            );

            const moveCheck = shouldMoveElement(
                rect,
                menuDimensions.height,
                state.config.edgeMargin || CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN
            );


            let result;
            if (moveCheck) {
                // Когда нужно перемещать элемент, вычисляем финальную позицию
                const viewport = getViewportRect();
                const safeArea = getSafeArea();
                const menuHeight = menuDimensions.height;
                const menuWidth = CONTEXT_MENU_CONSTANTS.MENU_WIDTH;

                // Позиционируем элемент так, чтобы меню поместилось снизу экрана
                // Меню будет на bottom: 16, значит его top = viewport.h - 16 - menuHeight
                const menuTop = viewport.h - safeArea.bottom - CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN - menuHeight;
                const finalPosition = {
                    top: menuTop - CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN - rect.height,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                };

                console.log('Position calculations:', {
                    viewportHeight: viewport.h,
                    safeAreaBottom: safeArea.bottom,
                    screenMargin: CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN,
                    menuHeight,
                    menuTop,
                    elementMargin: CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN,
                    elementHeight: rect.height,
                    finalTop: finalPosition.top
                });
                console.log('Moving element to final position:', finalPosition);

                result = moveElementToOverlay(
                    element,
                    overlayRef.current,
                    rect,
                    finalPosition
                );
            } else {
                result = moveElementToOverlay(
                    element,
                    overlayRef.current,
                    rect
                );
            }
            placeholderRef.current = result.placeholder;

            setState(prev => ({
                ...prev,
                placeholderElement: result.placeholder,
                originalParent: result.originalParent,
                originalNextSibling: result.originalNextSibling,
                originalStyles: result.originalStyles
            }));
        }
    }, [state.isOpen, state.originalElement, state.originalPosition, state.config]);

    useEffect(() => {
        if (state.isOpen) {
            const cleanup = createGlobalKeyHandler(() => close('escape'));
            return cleanup;
        }
    }, [state.isOpen]);

    useEffect(() => {
        if (!state.isOpen || !state.originalElement) return;

        const updatePosition = () => {
            if (state.originalElement) {
                const rect = state.originalElement.getBoundingClientRect();
                setState(prev => ({ ...prev, originalPosition: rect }));
            }
        };

        window.addEventListener('scroll', updatePosition, { passive: true });
        window.addEventListener('resize', updatePosition, { passive: true });

        return () => {
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [state.isOpen, state.originalElement]);

    const open = useCallback(async (element: HTMLElement, config: OpenContextMenuConfig, originalRect?: DOMRect) => {
        const rect = originalRect || element.getBoundingClientRect();
        const unlockScroll = lockScroll();
        unlockScrollRef.current = unlockScroll;

        const menuDimensions = calculateMenuDimensions(
            config.actions.length,
            config.maxMenuHeightVH || CONTEXT_MENU_CONSTANTS.MENU_MAX_HEIGHT_VH
        );

        const shouldMove = shouldMoveElement(
            rect,
            menuDimensions.height,
            config.edgeMargin || CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN
        );

        const originalParent = element.parentElement!;
        const originalNextSibling = element.nextSibling;
        const originalStyles = {
            position: element.style.position || 'static',
            top: element.style.top || 'auto',
            left: element.style.left || 'auto',
            zIndex: element.style.zIndex || 'auto',
            transform: element.style.transform || 'none',
        };

        // Вычисляем позицию меню
        console.log('Menu positioning debug:', {
            shouldMove,
            rect: { bottom: rect.bottom, height: rect.height },
            menuHeight: menuDimensions.height,
            viewport: { h: window.innerHeight },
            safeArea: { bottom: 0 } // Упрощенно для отладки
        });

        const menuPos = {
            ...calculateMenuPosition(
                rect,
                CONTEXT_MENU_CONSTANTS.MENU_WIDTH,
                config.menuAlignment || 'right',
                shouldMove ? 'bottom' : 'under',
                config.edgeMargin || CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN,
                menuDimensions.height
            ),
            width: CONTEXT_MENU_CONSTANTS.MENU_WIDTH
        };

        console.log('Final menu position:', menuPos);

        setState({
            isOpen: true,
            originalElement: element,
            originalPosition: rect,
            menuPosition: menuPos,
            originalParent,
            originalNextSibling,
            originalStyles,
            placeholderElement: null,
            config,
        });
    }, []);

    const close = useCallback(async (reason: 'backdrop' | 'escape' | 'gesture' | 'action' = 'backdrop') => {
        const placeholder = placeholderRef.current || state.placeholderElement;

        if (state.originalElement && state.originalParent && state.originalStyles && placeholder && state.originalPosition) {
            restoreElementToOriginalPosition(
                state.originalElement,
                state.originalParent,
                state.originalNextSibling,
                state.originalStyles,
                placeholder,
                state.originalPosition
            );
        }

        if (unlockScrollRef.current) {
            unlockScrollRef.current();
            unlockScrollRef.current = null;
        }

        setState(prev => ({
            ...prev,
            animationPhase: 'closing'
        }));

        setTimeout(() => {
            placeholderRef.current = null;
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
                config: null,
            });
        }, CONTEXT_MENU_CONSTANTS.CLOSE_STATE_CLEAR_TIMEOUT);
    }, [state.originalElement, state.originalParent, state.originalNextSibling, state.originalStyles, state.placeholderElement, state.originalPosition]);

    const longPress = useCallback((config: OpenContextMenuConfig) => {
        return {
            onPointerDown: (e: React.PointerEvent) => {
                if (state.isOpen) {
                    return;
                }
                const element = e.currentTarget as HTMLElement;
                const controller = createLongPressController((originalRect) => {
                    open(element, config, originalRect);
                }, { delayMs: config.longPressMs || CONTEXT_MENU_CONSTANTS.LONG_PRESS_DELAY });

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
            onClick: (e: React.MouseEvent) => {
                if (state.isOpen) {
                    return;
                }
                if (longPressControllerRef.current) {
                    longPressControllerRef.current.onClick(e);
                }
            },
            onContextMenu: (e: React.MouseEvent) => {
                e.preventDefault();
                const element = e.currentTarget as HTMLElement;
                open(element, config);
            },
        };
    }, [open, state.isOpen]);

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

