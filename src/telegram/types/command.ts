import { Context } from "grammy";

export type TCommandFilter = "all" | "private" | "channel" | "group" | "supergroup"

export type TCommand = {
    name: string;
    description: string;
    alias?: string[];
    filters?: TCommandFilter[];
    category?: string;
    execute: (ctx: Context, args: string[]) => Promise<void>;
    executeButton?: (ctx: Context) => Promise<void>;
    executeInline?: (ctx: Context) => Promise<void>;
}