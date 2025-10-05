'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OverlayState, ContextMenuAction, MenuPosition } from '../types';
import { ContextMenuPanel } from './context-menu-panel';
import styles from './styles.module.scss';

interface OverlayContainerProps {
    state: OverlayState;
    onClose: () => void;
    onActionSelect: (action: ContextMenuAction) => void;
}

export const OverlayContainer = forwardRef<HTMLDivElement, OverlayContainerProps>(
    ({ state, onClose, onActionSelect }, ref) => {
        // Debug log для позиций меню
        if (state.isOpen && state.menuPosition) {
            console.log('OverlayContainer Menu Animation:', {
                initialPosition: state.menuPosition,
                finalPosition: state.finalMenuPosition,
                shouldAnimate: state.finalMenuPosition !== null,
                initialTop: (state.menuPosition as MenuPosition).top,
                initialBottom: (state.menuPosition as MenuPosition).bottom,
                finalTop: state.finalMenuPosition?.top,
                finalBottom: state.finalMenuPosition?.bottom,
            });
        }

        return (
            <AnimatePresence>
                {state.isOpen && state.config && (
                    <div
                        ref={ref}
                        className={styles.overlayContainer}
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: state.animationPhase === 'closing' ? 0 : 1
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: state.animationPhase === 'closing' ? 0.3 : 0.3,
                                delay: 0, // Убираем задержку для синхронизации
                                ease: [0.16, 1, 0.3, 1] // easeOutExpo
                            }}
                            className={styles.backdrop}
                            onClick={onClose}
                        />

                        {/* Оригинальный элемент уже перемещен в этот контейнер */}
                        {/* Он будет отрендерен как дочерний элемент overlayRef.current */}

                        {/* Контекстное меню с анимацией позиции */}
                        {state.menuPosition && (
                            <motion.div
                                initial={{
                                    left: `${state.menuPosition.left}px`,
                                    top: `${(state.menuPosition as MenuPosition).top}px`, // Всегда используем top
                                    opacity: 1,
                                    scale: 1
                                }}
                                animate={state.finalMenuPosition && state.animationPhase !== 'closing' ? {
                                    left: `${state.finalMenuPosition.left}px`,
                                    top: `${state.finalMenuPosition.top}px`, // Всегда используем top
                                    opacity: 1,
                                    scale: 1,
                                    x: 0
                                } : {
                                    left: `${state.menuPosition.left}px`,
                                    top: `${(state.menuPosition as MenuPosition).top}px`, // Всегда используем top
                                    opacity: state.animationPhase === 'closing' ? 0 : 1, // Исчезаем при закрытии
                                    scale: state.animationPhase === 'closing' ? 0.1 : 1, // Скейлим при закрытии
                                    x: state.animationPhase === 'closing' ? 112.5 : 0 // Компенсация смещения влево
                                }}
                                transition={{
                                    duration: 0.4, // Синхронизируем с POSITION_ANIMATION_DURATION (400ms)
                                    ease: [0.4, 0, 0.2, 1] // Синхронизируем с cubic-bezier элемента
                                }}
                                style={{
                                    position: 'absolute',
                                    zIndex: 1002
                                }}
                            >
                                <ContextMenuPanel
                                    actions={state.config.actions}
                                    maxHeightVH={state.config.maxMenuHeightVH || 60}
                                    onActionSelect={onActionSelect}
                                    onClose={onClose}
                                />
                            </motion.div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        );
    });

OverlayContainer.displayName = 'OverlayContainer';
