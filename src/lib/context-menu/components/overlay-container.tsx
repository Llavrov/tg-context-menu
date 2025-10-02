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
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 0.35,
                                delay: 0.15, // Задержка - сначала перемещается элемент
                                ease: [0.64, 0, 0.78, 0] // easeInQuint
                            }}
                            className={styles.backdrop}
                            onClick={onClose}
                        />

                        {/* Оригинальный элемент уже перемещен в этот контейнер */}
                        {/* Он будет отрендерен как дочерний элемент overlayRef.current */}

                        {/* Контекстное меню */}
                        {state.menuPosition && (
                            <ContextMenuPanel
                                actions={state.config.actions}
                                position={{
                                    left: Number(state.menuPosition.left),
                                    top: (state.menuPosition as MenuPosition).top || undefined,
                                    bottom: (state.menuPosition as MenuPosition).bottom || undefined,
                                    width: 250
                                }}
                                maxHeightVH={state.config.maxMenuHeightVH || 60}
                                onActionSelect={onActionSelect}
                                onClose={onClose}
                            />
                        )}
                    </div>
                )}
            </AnimatePresence>
        );
    });

OverlayContainer.displayName = 'OverlayContainer';
