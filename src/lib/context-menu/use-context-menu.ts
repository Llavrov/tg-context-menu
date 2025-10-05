'use client';

import { useContext } from 'react';
import { ContextMenuContext } from './context';

export function useContextMenu() {
    const context = useContext(ContextMenuContext);

    if (!context) {
        throw new Error('useContextMenu must be used within a ContextMenuProvider');
    }

    const { state, longPress, open, close } = context;

    return {
        state,
        longPress,
        open,
        close,
    };
}
