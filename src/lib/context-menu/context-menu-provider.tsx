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
        finalMenuPosition: null,
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
        animationPhase: undefined,
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

            let finalPosition = null;
            if (state.finalMenuPosition) {
                const menuDimensions = calculateMenuDimensions(
                    state.config.actions.length,
                    state.config.maxMenuHeightVH || CONTEXT_MENU_CONSTANTS.MENU_MAX_HEIGHT_VH
                );

                const viewport = getViewportRect();
                const safeArea = getSafeArea();
                const elementFinalTop = viewport.h - safeArea.bottom - CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN - menuDimensions.height - CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN - rect.height;

                finalPosition = {
                    left: rect.left,
                    top: elementFinalTop
                };
            }

            const result = moveElementToOverlay(
                element,
                overlayRef.current,
                rect,
                finalPosition || undefined
            );

            placeholderRef.current = result.placeholder;

            setState(prev => ({
                ...prev,
                placeholderElement: result.placeholder,
                originalParent: result.originalParent,
                originalNextSibling: result.originalNextSibling,
                originalStyles: result.originalStyles
            }));
        }
    }, [state.isOpen, state.originalElement, state.originalPosition, state.config, state.finalMenuPosition]);

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

        const initialMenuPos = {
            left: calculateMenuPosition(
                rect,
                CONTEXT_MENU_CONSTANTS.MENU_WIDTH,
                config.menuAlignment || 'right',
                'under',
                config.edgeMargin || CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN,
                0
            ).left,
            top: rect.bottom + (config.edgeMargin || CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN),
            width: CONTEXT_MENU_CONSTANTS.MENU_WIDTH
        };

        let finalMenuPos = null;
        if (shouldMove) {
            const viewport = getViewportRect();
            const safeArea = getSafeArea();
            const finalTop = viewport.h - safeArea.bottom - CONTEXT_MENU_CONSTANTS.SCREEN_MARGIN - menuDimensions.height;

            finalMenuPos = {
                left: calculateMenuPosition(
                    rect,
                    CONTEXT_MENU_CONSTANTS.MENU_WIDTH,
                    config.menuAlignment || 'right',
                    'bottom',
                    config.edgeMargin || CONTEXT_MENU_CONSTANTS.ELEMENT_MENU_MARGIN,
                    menuDimensions.height
                ).left,
                top: finalTop,
                width: CONTEXT_MENU_CONSTANTS.MENU_WIDTH
            };
        }


        setState({
            isOpen: true,
            originalElement: element,
            originalPosition: rect,
            menuPosition: initialMenuPos,
            originalParent,
            originalNextSibling,
            originalStyles,
            placeholderElement: null,
            config,
            finalMenuPosition: finalMenuPos,
        });
    }, []);

    const close = useCallback(async (_reason: 'backdrop' | 'escape' | 'gesture' | 'action' = 'backdrop') => {
        const placeholder = placeholderRef.current || state.placeholderElement;

        setState(prev => ({
            ...prev,
            animationPhase: 'closing',
        }));

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
        setTimeout(() => {
            placeholderRef.current = null;
            setState({
                isOpen: false,
                originalElement: null,
                placeholderElement: null,
                originalPosition: null,
                menuPosition: null,
                finalMenuPosition: null,
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
                animationPhase: undefined,
            });
        }, CONTEXT_MENU_CONSTANTS.RESTORE_ANIMATION_DURATION);
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

