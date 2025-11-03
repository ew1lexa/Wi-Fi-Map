import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = "8321290589:AAHoDzr7AnGDeixzhjnQK_lmqar7WmUlgu4"  # Токен
MINI_APP_URL = "https://rococo-queijadas-04e1fa.netlify.app" # URL Mini App

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Команда /start - показывает кнопку с Mini App"""

    # Создаем кнопку с Mini App
    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [
                types.InlineKeyboardButton(
                    text="🎮 Открыть Mini App",
                    web_app=types.WebAppInfo(url=MINI_APP_URL)
                )
            ]
        ]
    )

    await message.answer(
        "👋 Добро пожаловать!\n\n"
        "Нажмите кнопку ниже, чтобы открыть мини-приложение:",
        reply_markup=keyboard
    )


@dp.message(Command("menu"))
async def cmd_menu(message: types.Message):
    """Альтернативная команда для показа кнопки"""
    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [
                types.InlineKeyboardButton(
                    text="📱 Запустить Mini App",
                    web_app=types.WebAppInfo(url=MINI_APP_URL)
                )
            ]
        ]
    )

    await message.answer(
        "🚀 Запустите мини-приложение:",
        reply_markup=keyboard
    )


@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    """Справка по боту"""
    help_text = (
        "🤖 <b>Бот с Mini App</b>\n\n"
        "Доступные команды:\n"
        "/start - начать работу с ботом\n"
        "/menu - показать кнопку Mini App\n"
        "/help - эта справка\n\n"
        "Просто нажмите на кнопку, чтобы открыть мини-приложение!"
    )
    await message.answer(help_text, parse_mode="HTML")


@dp.message()
async def handle_other_messages(message: types.Message):
    """Обработка всех остальных сообщений"""
    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [
                types.InlineKeyboardButton(
                    text="🎯 Открыть Mini App",
                    web_app=types.WebAppInfo(url=MINI_APP_URL)
                )
            ]
        ]
    )

    await message.answer(
        "Используйте кнопку ниже для открытия мини-приложения:",
        reply_markup=keyboard
    )


async def main():
    """Запуск бота"""
    logger.info("Бот с Mini App запускается...")

    # Запускаем поллинг
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())