'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';
import { ContextMenuAction } from '../types';
import { trapFocus } from '../utils';
import styles from './styles.module.scss';

interface ContextMenuPanelProps {
    actions: ContextMenuAction[];
    position: { left: number; bottom: number; width: number };
    maxHeightVH: number;
    onActionSelect: (action: ContextMenuAction) => void;
    onClose: () => void;
}

export function ContextMenuPanel({
    actions,
    position,
    maxHeightVH,
    onActionSelect,
    onClose
}: ContextMenuPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Фокус-тrap для доступности
    useEffect(() => {
        if (panelRef.current) {
            const cleanup = trapFocus(panelRef.current);
            return cleanup;
        }
    }, []);

    // Обработка свайпа вниз для закрытия
    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY;
            currentY = startY;
            isDragging = true;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
        };

        const handleTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;

            const deltaY = currentY - startY;
            // Если свайп вниз больше 50px, закрываем меню
            if (deltaY > 50) {
                onClose();
            }
        };

        panel.addEventListener('touchstart', handleTouchStart, { passive: true });
        panel.addEventListener('touchmove', handleTouchMove, { passive: true });
        panel.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            panel.removeEventListener('touchstart', handleTouchStart);
            panel.removeEventListener('touchmove', handleTouchMove);
            panel.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onClose]);

    return (
        <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.1, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.1, y: -20 }}
            transition={{
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1], // easeOutBack для эффектного появления
                scale: { duration: 0.5 }, // Медленнее scale
                opacity: { duration: 0.25 }
            }}
            className={styles.panel}
            style={{
                left: position.left,
                bottom: position.bottom,
                width: position.width,
                maxHeight: `${maxHeightVH}vh`,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >

            {/* Список действий с внутренним скроллом */}
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

            {/* Отступ снизу */}
            <div className={styles.bottomSpacing} />
        </motion.div>
    );
}
