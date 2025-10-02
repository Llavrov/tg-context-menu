'use client';

import React from 'react';
import { useContextMenu } from '@/lib/context-menu';
import { isHapticSupported } from '@/lib/context-menu/utils';
import { Reply, Forward, Copy, Pin, Edit, Trash2 } from 'lucide-react';

const sampleMessages = [
    {
        id: 1,
        text: "Привет! Как дела? 😊",
        sender: "Анна",
        time: "14:30",
        isOwn: false,
    },
    {
        id: 2,
        text: "Все отлично, спасибо! А у тебя как?",
        sender: "Вы",
        time: "14:31",
        isOwn: true,
    },
    {
        id: 3,
        text: "Тоже хорошо! Посмотри на этот красивый закат 🌅",
        sender: "Анна",
        time: "14:32",
        isOwn: false,
    },
    {
        id: 4,
        text: "Вау, действительно потрясающе! Где это снято?",
        sender: "Вы",
        time: "14:33",
        isOwn: true,
    },
    {
        id: 5,
        text: "На берегу Чёрного моря в Сочи. Очень рекомендую побывать там! Море просто невероятное, а воздух такой свежий...",
        sender: "Анна",
        time: "14:34",
        isOwn: false,
    },
    {
        id: 6,
        text: "Обязательно поеду туда в следующем отпуске! 🏖️",
        sender: "Вы",
        time: "14:35",
        isOwn: true,
    },
    {
        id: 7,
        text: "Отлично! Могу посоветовать хорошие места для отдыха",
        sender: "Анна",
        time: "14:36",
        isOwn: false,
    },
    {
        id: 8,
        text: "Это было бы здорово! 🎉",
        sender: "Вы",
        time: "14:37",
        isOwn: true,
    },
    {
        id: 9,
        text: "Кстати, не забудь взять солнцезащитный крем - солнце там очень активное ☀️",
        sender: "Анна",
        time: "14:38",
        isOwn: false,
    },
    {
        id: 10,
        text: "Спасибо за совет! Буду помнить об этом",
        sender: "Вы",
        time: "14:39",
        isOwn: true,
    },
    {
        id: 11,
        text: "А еще рекомендую посетить местные рестораны с морепродуктами - просто невероятный вкус! 🦐🦀🐟",
        sender: "Анна",
        time: "14:40",
        isOwn: false,
    },
    {
        id: 12,
        text: "Обязательно попробую! Спасибо за все советы 😊",
        sender: "Вы",
        time: "14:41",
        isOwn: true,
    },
    {
        id: 13,
        text: "Пожалуйста! Если будут вопросы - обращайся. Удачи в планировании отпуска! ✈️",
        sender: "Анна",
        time: "14:42",
        isOwn: false,
    },
    {
        id: 14,
        text: "Спасибо большое! Обязательно расскажу, как прошла поездка 📸",
        sender: "Вы",
        time: "14:43",
        isOwn: true,
    },
    {
        id: 15,
        text: "Буду ждать! 😊",
        sender: "Анна",
        time: "14:44",
        isOwn: false,
    },
];

function ChatMessage({ message }: { message: typeof sampleMessages[0] }) {
    const { longPress } = useContextMenu();

    const actions = [
        {
            id: 'reply',
            label: 'Ответить',
            icon: <Reply size={20} />,
            onSelect: () => {
                console.log(`Ответить на сообщение: ${message.text}`);
                alert(`Ответить на: "${message.text}"`);
            }
        },
        {
            id: 'forward',
            label: 'Переслать',
            icon: <Forward size={20} />,
            onSelect: () => {
                console.log(`Переслать сообщение: ${message.text}`);
                alert(`Переслать: "${message.text}"`);
            }
        },
        {
            id: 'copy',
            label: 'Копировать',
            icon: <Copy size={20} />,
            shortcut: 'Cmd+C',
            onSelect: () => {
                navigator.clipboard.writeText(message.text);
                console.log(`Скопировано: ${message.text}`);
                alert('Текст скопирован в буфер обмена!');
            }
        },
        {
            id: 'pin',
            label: 'Закрепить',
            icon: <Pin size={20} />,
            onSelect: () => {
                console.log(`Закрепить сообщение: ${message.id}`);
                alert(`Сообщение закреплено!`);
            }
        },
        {
            id: 'edit',
            label: 'Редактировать',
            icon: <Edit size={20} />,
            onSelect: () => {
                console.log(`Редактировать сообщение: ${message.id}`);
                alert(`Редактировать сообщение #${message.id}`);
            }
        },
        {
            id: 'delete',
            label: 'Удалить',
            icon: <Trash2 size={20} />,
            destructive: true,
            onSelect: () => {
                console.log(`Удалить сообщение: ${message.id}`);
                if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
                    alert(`Сообщение #${message.id} удалено!`);
                }
            }
        },
    ];

    return (
        <div
            {...longPress({
                actions,
                edgeMargin: 12,
                maxMenuHeightVH: 60,
                menuAlignment: message.isOwn ? 'right' : 'left' // Собственные сообщения - справа, чужие - слева
            })}
            className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} mb-4 px-4`}
        >
            <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${message.isOwn
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'
                    }`}
            >
                <div className="text-sm leading-relaxed">
                    {message.text}
                </div>
                <div className={`text-xs mt-2 ${message.isOwn ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                    {message.time}
                </div>
            </div>
        </div>
    );
}

export default function Demo() {
    const hapticSupported = isHapticSupported();

    return (
        <div className="max-w-2xl mx-auto py-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Заголовок чата */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4">
                    <h2 className="text-lg font-semibold">Чат с Анной</h2>
                    <p className="text-blue-100 text-sm">
                        онлайн
                        {hapticSupported && (
                            <span className="ml-2 text-xs bg-green-500/20 px-2 py-1 rounded-full">
                                📳 Хаптик включен
                            </span>
                        )}
                    </p>
                </div>

                {/* Сообщения */}
                <div className="bg-gray-50 min-h-96 max-h-[600px] overflow-y-auto">
                    {sampleMessages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                    ))}
                </div>

                {/* Поле ввода */}
                <div className="bg-white border-t border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Введите сообщение..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors">
                            Отправить
                        </button>
                    </div>
                </div>
            </div>

            {/* Инструкции */}
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Как использовать:
                </h3>
                <div className="space-y-3 text-gray-600">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">📱</span>
                        <div>
                            <strong>На мобильном:</strong> Долгое нажатие на любое сообщение
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🖱️</span>
                        <div>
                            <strong>На десктопе:</strong> Правый клик на сообщение
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⌨️</span>
                        <div>
                            <strong>Клавиатура:</strong> Нажмите Escape для закрытия меню
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">✨</span>
                        <div>
                            <strong>Особенности:</strong> Вибрация, блюр фона, анимации, автоскролл, эмодзи-бар
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🎯</span>
                        <div>
                            <strong>Без клонирования:</strong> Оригинальный элемент поднимается и остается в потоке
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
