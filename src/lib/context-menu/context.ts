import { createContext } from 'react';
import { ContextMenuContextType } from './types';

export const ContextMenuContext = createContext<ContextMenuContextType | null>(null);
