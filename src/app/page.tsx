'use client';

import { ContextMenuProvider } from '@/lib/context-menu';
import Demo from '@/components/Demo';

export default function Home() {
  return (
    <ContextMenuProvider>
      <Demo />
    </ContextMenuProvider>
  );
}
