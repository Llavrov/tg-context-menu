'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OverlayState } from '../types';
import { ContextMenuPanel } from './context-menu-panel';
import { calculateMenuDimensions } from '../utils';
import styles from './styles.module.scss';

interface OverlayContainerProps {
    state: OverlayState;
    onClose: () => void;
    onActionSelect: (action: any) => void;
}

export const OverlayContainer = forwardRef<HTMLDivElement, OverlayContainerProps>(
    ({ state, onClose, onActionSelect }, ref) => {

        if (!state.isOpen || !state.config) {
            return null;
        }

        return (
            <AnimatePresence>
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={styles.overlayContainer}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={styles.backdrop}
                        onClick={onClose}
                    />

                    {/* Оригинальный элемент уже перемещен в этот контейнер */}
                    {/* Он будет отрендерен как дочерний элемент overlayRef.current */}

                    {/* Контекстное меню */}
                    <ContextMenuPanel
                        actions={state.config.actions}
                        position={{
                            left: 0,
                            bottom: 16,
                            width: window.innerWidth
                        }}
                        maxHeightVH={state.config.maxMenuHeightVH || 60}
                        onActionSelect={onActionSelect}
                        onClose={onClose}
                    />
                </motion.div>
            </AnimatePresence>
        );
    });

OverlayContainer.displayName = 'OverlayContainer';
