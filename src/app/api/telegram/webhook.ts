import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7221839328:AAHOBs3EpNakH39TaTxHhfugXx6vLZuVBIc';
const WEBAPP_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://your-app.vercel.app';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Обработка команды /start
        if (body.message?.text === '/start') {
            const chatId = body.message.chat.id;

            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: '🎉 Добро пожаловать в демо контекстного меню!\n\nНажмите кнопку ниже, чтобы открыть WebApp:',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '🚀 Открыть WebApp',
                                    web_app: {
                                        url: `${WEBAPP_URL}`
                                    }
                                }
                            ]
                        ]
                    }
                }),
            });

            if (response.ok) {
                return NextResponse.json({ success: true });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
