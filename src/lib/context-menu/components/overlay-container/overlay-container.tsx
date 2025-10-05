'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OverlayState, ContextMenuAction, MenuPosition } from '../../types';
import { ContextMenuPanel } from '../context-menu-panel';
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
                        <motion.div
                            initial={{
                                opacity: 0,
                                backdropFilter: 'blur(0px) saturate(100%)'
                            }}
                            animate={{
                                opacity: state.animationPhase === 'closing' ? 0 : 1,
                                backdropFilter: state.animationPhase === 'closing'
                                    ? 'blur(0px) saturate(100%)'
                                    : 'blur(60px) saturate(180%)'
                            }}
                            exit={{
                                opacity: 0,
                                backdropFilter: 'blur(0px) saturate(100%)'
                            }}
                            transition={{
                                duration: 0.3,
                                delay: 0,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            className={styles.backdrop}
                            onClick={onClose}
                        />
                        {state.menuPosition && (
                            <motion.div
                                initial={{
                                    left: `${state.menuPosition.left}px`,
                                    top: `${(state.menuPosition as MenuPosition).top}px`,
                                    opacity: 1,
                                    scale: 1
                                }}
                                animate={state.finalMenuPosition && state.animationPhase !== 'closing' ? {
                                    left: `${state.finalMenuPosition.left}px`,
                                    top: `${state.finalMenuPosition.top}px`,
                                    opacity: 1,
                                    scale: 1,
                                    x: 0
                                } : {
                                    left: `${state.menuPosition.left}px`,
                                    top: `${(state.menuPosition as MenuPosition).top}px`,
                                    opacity: state.animationPhase === 'closing' ? 0 : 1,
                                    scale: state.animationPhase === 'closing' ? 0.1 : 1,
                                    x: state.animationPhase === 'closing' ? 112.5 : 0
                                }}
                                transition={{
                                    duration: 0.4,
                                    ease: [0.4, 0, 0.2, 1]
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
                                />
                            </motion.div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        );
    });

OverlayContainer.displayName = 'OverlayContainer';
