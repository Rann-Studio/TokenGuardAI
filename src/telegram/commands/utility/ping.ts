import { TCommand } from "../../types/command";

const command: TCommand = {
    name: "ping",
    description: "Ping the server to check if it's alive.",
    alias: ["ping"],
    execute: async (ctx, args) => {
        await ctx.reply("🏓 Pong! The server is alive.", {
            message_thread_id: ctx.message?.message_thread_id,
        });
    }
}

export default command;