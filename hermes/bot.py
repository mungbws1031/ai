"""Hermes Telegram bot application.

Built on python-telegram-bot v20+ (async). Provides command handlers, an
LLM-backed conversation handler, an IVDR status command, and a scheduled
digest job posted to the configured group chat(s).
"""

import logging

from telegram import Update
from telegram.constants import ChatAction, ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from .config import HermesConfig, load_config
from .ivdr import IVDRError, build_status_summary
from .llm import LLMError, ask_llm

logger = logging.getLogger("hermes")

HELP_TEXT = (
    "*Hermes* — IVDR team assistant\n\n"
    "/start — greeting and quick start\n"
    "/help — this message\n"
    "/ping — health check\n"
    "/id — show this chat's ID (use it for HERMES_NOTIFY_CHAT_IDS)\n"
    "/status — current IVDR projects and workflow runs\n"
    "/ask <question> — ask the AI assistant\n\n"
    "In a group you can also just mention me or reply to my messages.\n"
    "Note: to read normal (non-command) group messages, group privacy "
    "must be disabled in @BotFather."
)


def _chat_allowed(config: HermesConfig, chat_id: int) -> bool:
    """Return True if this chat may use the bot."""
    if not config.allowed_chat_ids:
        return True
    return chat_id in config.allowed_chat_ids


def _config(context: ContextTypes.DEFAULT_TYPE) -> HermesConfig:
    return context.application.bot_data["config"]


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        "Hello, I'm Hermes. Type /help to see what I can do.",
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        HELP_TEXT, parse_mode=ParseMode.MARKDOWN
    )


async def cmd_ping(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text("pong")


async def cmd_id(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat = update.effective_chat
    await update.effective_message.reply_text(
        f"chat_id: `{chat.id}`\ntype: {chat.type}",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    config = _config(context)
    if not _chat_allowed(config, update.effective_chat.id):
        return
    await context.bot.send_chat_action(
        update.effective_chat.id, ChatAction.TYPING
    )
    try:
        summary = await build_status_summary(config)
    except IVDRError as exc:
        await update.effective_message.reply_text(f"Could not fetch status: {exc}")
        return
    await update.effective_message.reply_text(
        summary, parse_mode=ParseMode.MARKDOWN
    )


async def _answer(update: Update, context: ContextTypes.DEFAULT_TYPE, question: str) -> None:
    config = _config(context)
    if not _chat_allowed(config, update.effective_chat.id):
        return
    if not question.strip():
        await update.effective_message.reply_text(
            "Ask me something: /ask <your question>"
        )
        return
    await context.bot.send_chat_action(
        update.effective_chat.id, ChatAction.TYPING
    )
    try:
        answer = await ask_llm(config, question)
    except LLMError as exc:
        await update.effective_message.reply_text(f"AI unavailable: {exc}")
        return
    await update.effective_message.reply_text(answer)


async def cmd_ask(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    question = " ".join(context.args) if context.args else ""
    await _answer(update, context, question)


async def on_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle non-command text in groups: respond when mentioned or replied to.

    In private chats, every message is treated as a question.
    """
    message = update.effective_message
    if message is None or not message.text:
        return

    chat = update.effective_chat
    bot_username = context.bot.username or ""

    if chat.type == chat.PRIVATE:
        await _answer(update, context, message.text)
        return

    mentioned = bot_username and f"@{bot_username}" in message.text
    replied_to_bot = (
        message.reply_to_message is not None
        and message.reply_to_message.from_user is not None
        and message.reply_to_message.from_user.id == context.bot.id
    )
    if not (mentioned or replied_to_bot):
        return

    question = message.text.replace(f"@{bot_username}", "").strip()
    await _answer(update, context, question)


async def digest_job(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Scheduled job: post an IVDR status digest to configured chats."""
    config = context.application.bot_data["config"]
    if not config.notify_chat_ids:
        return
    try:
        summary = await build_status_summary(config)
    except IVDRError as exc:
        logger.warning("Digest skipped: %s", exc)
        return
    for chat_id in config.notify_chat_ids:
        try:
            await context.bot.send_message(
                chat_id, summary, parse_mode=ParseMode.MARKDOWN
            )
        except Exception as exc:  # noqa: BLE001 - keep the job loop alive.
            logger.warning("Digest send to %s failed: %s", chat_id, exc)


async def notify(application: Application, text: str) -> None:
    """Broadcast a workflow notification to all configured chats.

    Importable by the IVDR backend to push event notifications, e.g.
    "workflow run #12 awaiting human approval".
    """
    config = application.bot_data["config"]
    for chat_id in config.notify_chat_ids:
        try:
            await application.bot.send_message(
                chat_id, text, parse_mode=ParseMode.MARKDOWN
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("notify to %s failed: %s", chat_id, exc)


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error("Handler error", exc_info=context.error)


def build_application(config: HermesConfig | None = None) -> Application:
    """Construct and wire the Telegram Application."""
    config = config or load_config()

    application = Application.builder().token(config.bot_token).build()
    application.bot_data["config"] = config

    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(CommandHandler("ping", cmd_ping))
    application.add_handler(CommandHandler("id", cmd_id))
    application.add_handler(CommandHandler("status", cmd_status))
    application.add_handler(CommandHandler("ask", cmd_ask))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, on_message)
    )
    application.add_error_handler(on_error)

    if config.digest_interval_seconds > 0 and config.notify_chat_ids:
        if application.job_queue is None:
            logger.warning(
                "Digest requested but JobQueue is unavailable. Install "
                "python-telegram-bot[job-queue] to enable scheduling."
            )
        else:
            application.job_queue.run_repeating(
                digest_job,
                interval=config.digest_interval_seconds,
                first=config.digest_interval_seconds,
                name="ivdr_digest",
            )
            logger.info(
                "Scheduled IVDR digest every %ss",
                config.digest_interval_seconds,
            )

    return application


def run() -> None:
    """Entry point: start long-polling."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    config = load_config()
    application = build_application(config)
    logger.info(
        "Hermes starting (llm=%s, ivdr=%s, notify_chats=%s)",
        config.llm_enabled,
        config.ivdr_enabled,
        config.notify_chat_ids or "none",
    )
    application.run_polling(allowed_updates=Update.ALL_TYPES)
