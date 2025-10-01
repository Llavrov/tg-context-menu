// Инициализация Telegram WebApp
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const tg = typeof window !== 'undefined' ? require('@twa-dev/sdk').default : null;

// Настройка темы и параметров
export const initTelegram = () => {
    if (typeof window !== 'undefined' && tg && tg.initDataUnsafe) {
        // Включаем кнопку закрытия
        tg.enableClosingConfirmation();

        // Настраиваем тему
        tg.ready();

        // Расширяем на весь экран
        tg.expand();

        console.log('Telegram WebApp initialized:', {
            user: tg.initDataUnsafe.user,
            theme: tg.colorScheme,
            platform: tg.platform
        });
    }
};

// Получение данных пользователя
export const getTelegramUser = () => {
    if (typeof window !== 'undefined' && tg && tg.initDataUnsafe?.user) {
        return tg.initDataUnsafe.user;
    }
    return null;
};

// Получение темы
export const getTelegramTheme = () => {
    if (typeof window !== 'undefined' && tg) {
        return tg.colorScheme || 'light';
    }
    return 'light';
};

// Закрытие WebApp
export const closeTelegramApp = () => {
    if (typeof window !== 'undefined' && tg) {
        tg.close();
    }
};

// Отправка данных в Telegram
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendDataToTelegram = (data: any) => {
    if (typeof window !== 'undefined' && tg) {
        tg.sendData(JSON.stringify(data));
    }
};
