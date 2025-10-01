'use client';

import { useEffect } from 'react';
import { initTelegram, getTelegramTheme } from '@/lib/telegram';

interface TelegramProviderProps {
    children: React.ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
    useEffect(() => {
        // Инициализируем Telegram WebApp
        initTelegram();

        // Применяем тему Telegram
        const theme = getTelegramTheme();
        document.documentElement.setAttribute('data-theme', theme);

        // Слушаем изменения темы
        const handleThemeChange = () => {
            const newTheme = getTelegramTheme();
            document.documentElement.setAttribute('data-theme', newTheme);
        };

        // Подписываемся на изменения темы (если доступно)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).Telegram.WebApp.onEvent('themeChanged', handleThemeChange);
        }

        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).Telegram.WebApp.offEvent('themeChanged', handleThemeChange);
            }
        };
    }, []);

    return <>{children}</>;
}
