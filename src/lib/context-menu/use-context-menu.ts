'use client';

import { useContext, useCallback, useRef } from 'react';
import { ContextMenuContext } from './context';
import { OpenContextMenuConfig } from './types';

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
