
import { InlineKeyboard } from "grammy";
import TelegramBot from "../..";
import { ECommandPriority } from "../../enum/command";
import { TCommand } from "../../types/command";
import * as Log from "../../utils/log";
import { capitalize } from "../../utils/misc";


const commands = TelegramBot.getInstance().getCommands();

const buildCategoryKeyboard = () => {
    const categories = Array.from(
        new Set(Array.from(commands.values()).map(cmd => cmd.category || "Uncategorized"))
    );

    const keyboard = new InlineKeyboard();
    categories.forEach((category, index) => {
        if (index % 2 === 0) keyboard.row();
        keyboard.text(capitalize(category), `help_category_${category}`);
    });

    return keyboard;
};

const buildCommandKeyboard = (category: string) => {
    const categoryCommands = Array.from(commands.values()).filter(
        cmd => cmd.category === category
    );

    const keyboard = new InlineKeyboard();
    categoryCommands.forEach((cmd, index) => {
        if (index % 2 === 0) keyboard.row();
        keyboard.text(capitalize(cmd.name), `help_command_${cmd.name}`);
    });

    keyboard.row().text("Back", "help_back_category");
    return keyboard;
};

const buildCommandDetails = (cmdName: string) => {
    const cmd = commands.get(cmdName);
    if (!cmd) return null;

    const filters = cmd.filters?.sort(
        (a, b) => ECommandPriority[a as keyof typeof ECommandPriority] - ECommandPriority[b as keyof typeof ECommandPriority]
    );
    const filterText = filters?.join(", ").replace(/, ([^,]*)$/, " and $1");

    return [
        `Command: /${cmd.name}`,
        `Alias: ${cmd.alias?.map(a => `${process.env.TELEGRAM_BOT_PREFIX}${a}`).join(", ") || "No aliases available."}`,
        `Category: ${cmd.category ? capitalize(cmd.category) : "Uncategorized"}`,
        `Allowed in: ${filterText || "All"} chat types.`,
        `Description: ${cmd.description}`,
    ].join("\n");
};

const command: TCommand = {
    name: "help",
    description: "Get a list of available commands.",
    alias: ["help", "h", "cmd"],
    execute: async (ctx) => {
        const keyboard = buildCategoryKeyboard();
        await ctx.reply("Select a category to see the commands:", {
            message_thread_id: ctx.message?.message_thread_id,
            reply_markup: keyboard,
            parse_mode: "HTML",
        });
    },
    executeButton: async (ctx) => {
        await ctx.answerCallbackQuery();
        const buttonId = ctx.callbackQuery?.data;
        if (!buttonId) return;

        const match = buttonId.match(/^help_([^_]+)(?:_(.+))?$/);
        if (!match) return;

        const [, action, value] = match;

        switch (action) {
            case "category": {
                const keyboard = buildCommandKeyboard(value);
                await ctx.editMessageText("Select a command to see its details:", {
                    reply_markup: keyboard,
                    parse_mode: "HTML",
                });
                break;
            }

            case "command": {
                const details = buildCommandDetails(value);
                if (!details) {
                    await ctx.editMessageText("❌ Command not found.");
                    return;
                }

                const commandCategory = commands.get(value)?.category || "Uncategorized"
                const backKeyboard = new InlineKeyboard().text("Back", `help_category_${commandCategory}`);
                await ctx.editMessageText(details, {
                    reply_markup: backKeyboard,
                    parse_mode: "HTML",
                });
                break;
            }

            case "back": {
                const keyboard = buildCategoryKeyboard();
                await ctx.editMessageText("Select a category to see the commands:", {
                    reply_markup: keyboard,
                    parse_mode: "HTML",
                });
                break;
            }

            default: {
                Log.warn(`⚠️ Unknown button ID: "${buttonId}"`);
                await ctx.answerCallbackQuery({
                    text: "⚠️ This button is not available.",
                    show_alert: true,
                });
                break;
            }
        }
    },
    executeInline: async (ctx) => { }
};

export default command;
