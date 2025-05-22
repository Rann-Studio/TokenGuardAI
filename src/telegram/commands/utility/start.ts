import { TCommand } from "../../types/command";

const command: TCommand = {
    name: "start",
    description: "Start the bot and get a welcome message.",
    alias: ["start"],
    execute: async (ctx, args) => {
        const welcomeMessage = [
            "👋 Hi, welcome to the Crypto Token Assistant bot!",
            "I'm here to help you analyze and understand any crypto token's safety and market status.",
            "To get started, type /help to see the available commands",
        ].join("\n\n");

        await ctx.reply(welcomeMessage, {
            message_thread_id: ctx.message?.message_thread_id,
        });
    }
}

export default command;