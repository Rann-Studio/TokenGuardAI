import { Context } from "grammy";
import { InputMedia, Message } from "grammy/types";

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatValue = (value: any, prefix: string = '', suffix: string = '') => value !== undefined && value !== null ? `${prefix}${value}${suffix}` : 'N/A';

export const formatDate = (date: any) => date ? new Date(date).toUTCString() : 'N/A';

export const editMessageText = async (ctx: Context, message: Message.TextMessage, text: string) => {
    try {
        await ctx.api.editMessageText(message.chat.id, message.message_id, text);
    } catch (err) {
        console.error("Failed to edit message text:", err);
        await ctx.reply(text, { message_thread_id: ctx.message?.message_thread_id });
    }
};

export const editMessageMedia = async (ctx: Context, message: Message.TextMessage, media: InputMedia) => {
    try {
        await ctx.api.editMessageMedia(message.chat.id, message.message_id, media);
    } catch (err) {
        console.error("Failed to edit message media:", err);
        if (media.type === "photo") {
            await ctx.replyWithPhoto(media.media, { message_thread_id: ctx.message?.message_thread_id });
        } else if (media.type === "video") {
            await ctx.replyWithVideo(media.media, { message_thread_id: ctx.message?.message_thread_id });
        } else {
            await ctx.reply("Failed to send media (unsupported type)", { message_thread_id: ctx.message?.message_thread_id });
        }
    }
}
