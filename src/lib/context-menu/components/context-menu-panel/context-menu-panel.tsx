'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';
import { ContextMenuAction } from '../../types';
import { trapFocus } from '../../utils';
import styles from './styles.module.scss';

interface ContextMenuPanelProps {
    actions: ContextMenuAction[];
    maxHeightVH: number;
    onActionSelect: (action: ContextMenuAction) => void;
}

export function ContextMenuPanel({
    actions,
    maxHeightVH,
    onActionSelect,
}: ContextMenuPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (panelRef.current) {
            const cleanup = trapFocus(panelRef.current);
            return cleanup;
        }
    }, []);

    return (
        <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.1, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.1, y: -20 }}
            transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
                scale: {
                    duration: 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94]
                },
                opacity: {
                    duration: 0.3,
                    ease: [0.25, 0.46, 0.45, 0.94]
                }
            }}
            className={styles.panel}
            style={{
                maxHeight: `${maxHeightVH}vh`,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div
                ref={scrollRef}
                className={styles.actionsList}
            >
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => onActionSelect(action)}
                        className={classNames(styles.actionButton, {
                            [styles.destructive]: action.destructive
                        })}
                        role="menuitem"
                        tabIndex={0}
                    >
                        <span className={styles.actionLabel}>{action.label}</span>
                        {action.icon && (
                            <span className={styles.actionIcon}>{action.icon}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className={styles.bottomSpacing} />
        </motion.div>
    );
}
