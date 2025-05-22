import fs from 'fs';
import { Bot, Context } from 'grammy';
import path from 'path';
import { ECommandPriority } from './enum/command';
import { TCommand } from './types/command';
import * as Log from './utils/log';
import { request } from 'undici';
import { editMessageText, formatDate, formatValue } from './utils/misc';


class TelegramBot {
    private static instance: TelegramBot;

    private commands: Map<string, TCommand> = new Map();
    private readonly commandDir = path.join(__dirname, 'commands');
    private readonly client: Bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string);

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static getInstance(): TelegramBot {
        if (!TelegramBot.instance) {
            TelegramBot.instance = new TelegramBot();
        }
        return TelegramBot.instance;
    }

    private loadCommandFile(commandPath: string): TCommand | null {
        try {
            const module = require(commandPath);
            return module.default || module;
        } catch (error) {
            Log.error(`Failed to load command at "${commandPath}":`, error);
            return null;
        }
    }

    private loadCommands() {
        const categories = fs.readdirSync(this.commandDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory());

        for (const category of categories) {
            const categoryPath = path.join(this.commandDir, category.name);
            const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

            for (const file of commandFiles) {
                const commandPath = path.join(categoryPath, file);
                const command = this.loadCommandFile(commandPath);
                if (!command) continue;

                if (!command.name || !command.description || !command.execute) {
                    Log.warn(`Command "${file}" in "${category.name}" is missing required properties (name, description, execute). Skipping...`);
                    continue;
                }

                if (this.commands.has(command.name)) {
                    const existing = this.commands.get(command.name);
                    Log.warn(`Command "${command.name}" already exists in "${existing?.category}". Skipping...`);
                    continue;
                }

                command.filters = command.filters || ['all'];
                command.category = category.name;
                this.commands.set(command.name, command);
            }
        }
    }

    private injectCommands() {
        this.commands.forEach((command) => {
            this.client.command(command.name, (ctx) => this.executeCommand(ctx, command));
        });

        this.client.on('message', (ctx) => {
            const message = ctx.message?.text
            if (!message) return;

            const [caller, ...args] = typeof message === 'string' ? message.trim().split(/\s+/) : [];

            this.commands.forEach((command) => {
                if (!command.alias) return;

                const aliases = command.alias.map((alias) => `${process.env.TELEGRAM_BOT_PREFIX}${alias}`);
                if (aliases.includes(caller)) {
                    return this.executeCommand(ctx, command, caller);
                }
            });

            this.executeAIChat(ctx, message);
        })
    }


    private injectButtons() {
        this.client.on('callback_query', async (ctx) => {
            this.commands.forEach((command) => {
                if (command.executeButton) command.executeButton(ctx);
            });
        });
    }


    private injectInline() {
        this.client.on('inline_query', async (ctx) => {
            this.commands.forEach((command) => {
                if (command.executeInline) command.executeInline(ctx);
            });
        });
    }

    private async executeCommand(ctx: Context, command: TCommand, alias?: string) {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        try {
            const chatType = ctx.chat.type;

            if (command.filters && !command.filters.includes('all') && !command.filters.includes(chatType)) {
                const sortedFilter = command.filters.sort((a, b) => ECommandPriority[a as keyof typeof ECommandPriority] - ECommandPriority[b as keyof typeof ECommandPriority]);
                const allowedFilter = sortedFilter.join(', ').replace(/, ([^,]*)$/, ' or $1');
                await ctx.reply(`This command only works in ${allowedFilter} chat types.`);
                return;
            }

            const message = ctx.message?.text;
            const [caller, ...args] = typeof message === "string" ? message.trim().split(/\s+/) : [];

            command.execute(ctx, args);

        } catch (error) {
            Log.error(`Error executing command "${command.name}${alias ? ` (${alias})` : ''}":`, error);
            await ctx.reply('⚠️ An unexpected error occurred while executing the command.');
        }
    }

    private async executeAIChat(ctx: Context, message: string) {
        const waitMsg = await ctx.reply("Please wait...", {
            message_thread_id: ctx.message?.message_thread_id,
        });

        try {
            const response = await request(`http://localhost:3000/api/telegram/message`, {
                method: 'POST',
                body: JSON.stringify({ text: message }),
                headers: {
                    'content-type': 'application/json',
                    'x-secret-key': process.env.BACKEND_SECRET,
                },
            });

            const body = await response.body.json() as TResponse;

            if (body.statusCode !== 200) {
                await editMessageText(ctx, waitMsg, body?.message || "An error occurred while processing your request.");
                return;
            }

            if (body?.data?.code === "ANALYZE") {
                const { coin, market, risk, insight } = body?.data;
                if (!coin || !market || !risk || !insight) {
                    await editMessageText(ctx, waitMsg, "⚠️ An unexpected error occurred while processing your request.");
                    return;
                }

                const messageCaptionAnalyze = [
                    '📊 Token Analysis Results\n',

                    'ℹ️ Information',
                    `Symbol: ${formatValue(coin.symbol)}`,
                    `Name: ${formatValue(coin.name)}`,
                    `Platform: ${formatValue(coin.platform)}`,
                    `Address: ${formatValue(coin.address)}\n`,

                    '💰 Market',
                    `Current Price: $${formatValue(market.price.currentPrice)}`,
                    `High Price (24h): $${formatValue(market.price.highPrice24h)}`,
                    `Low Price (24h): $${formatValue(market.price.lowPrice24h)}`,
                    `Price Change (24h): $${formatValue(market.price.priceChange24h)}`,
                    `Price Change Percentage (24h): ${formatValue(market.price.priceChangePercentage24h, '', '%')}`,
                    `Market Cap: $${formatValue(market.marketCap.marketCap)}`,
                    `Market Cap Rank: ${formatValue(market.marketCap.marketCapRank)}`,
                    `Market Cap Change (24h): $${formatValue(market.marketCap.marketCapChange24h)}`,
                    `Market Cap Change Percentage (24h): ${formatValue(market.marketCap.marketCapChangePercentage24h, '', '%')}`,
                    `Circulating Supply: ${formatValue(market.supply.circulatingSupply)}`,
                    `Total Supply: ${formatValue(market.supply.totalSupply)}`,
                    `Max Supply: ${formatValue(market.supply.maxSupply)}`,
                    `All Time High: $${formatValue(market.allTimeHigh.ath)}`,
                    `All Time High Percentage: ${formatValue(market.allTimeHigh.athPercentage, '', '%')}`,
                    `All Time High Date: ${formatDate(market.allTimeHigh.athDate)}`,
                    `All Time Low: $${formatValue(market.allTimeLow.atl)}`,
                    `All Time Low Percentage: ${formatValue(market.allTimeLow.atlPercentage, '', '%')}`,
                    `All Time Low Date: ${formatDate(market.allTimeLow.atlDate)}`,
                    `Fully Diluted Valuation: $${formatValue(market.fdv)}\n`,

                    '🔒 Safety Score',
                    `Score: ${formatValue(risk.score, '', '%')}`,
                    `Explanation: ${formatValue(risk.explanation)}\n`,

                    '🧠 AI Insight',
                    ...(Array.isArray(insight) && insight.length > 0 ? insight.map((text: string) => `- ${text}`) : ['- No insights available']),

                    '\n⚠️ Please note that this analysis is generated using Artificial Intelligence. While it offers valuable insights, always verify the data and consult with experts before proceeding with any financial actions.',
                ].join('\n');
                await editMessageText(ctx, waitMsg, messageCaptionAnalyze);
                return;
            }
            
            if (body?.data?.code === "PRICE") {
                const { coin, currentPrice, highPrice24h, lowPrice24h, priceChange24h, priceChangePercentage24h } = body?.data;
                const messageCaptionPrice = [
                    'ℹ️ Information',
                    `Symbol: ${formatValue(coin.symbol)}`,
                    `Name: ${formatValue(coin.name)}\n`,

                    '💰 Price',
                    `Current Price: $${formatValue(currentPrice)}`,
                    `High Price (24h): $${formatValue(highPrice24h)}`,
                    `Low Price (24h): $${formatValue(lowPrice24h)}`,
                    `Price Change (24h): $${formatValue(priceChange24h)}`,
                    `Price Change Percentage (24h): ${formatValue(priceChangePercentage24h, '', '%')}\n`,
                ].join('\n');
                await editMessageText(ctx, waitMsg, messageCaptionPrice);
                return;
            }
            
            if (body?.data?.code === "MARKETCAP") {
                const { coin, marketCap, marketCapRank, marketCapChange24h, marketCapChangePercentage24h } = body?.data;
                const messageCaptionMarketcap = [
                    'ℹ️ Information',
                    `Symbol: ${formatValue(coin.symbol)}`,
                    `Name: ${formatValue(coin.name)}\n`,

                    '💰 Market Cap',
                    `Market Cap: $${formatValue(marketCap)}`,
                    `Market Cap Rank: ${formatValue(marketCapRank)}`,
                    `Market Cap Change (24h): $${formatValue(marketCapChange24h)}`,
                    `Market Cap Change Percentage (24h): ${formatValue(marketCapChangePercentage24h, '', '%')}\n`,
                ].join('\n');
                await editMessageText(ctx, waitMsg, messageCaptionMarketcap);
                return;
            }
            
            if (body?.data?.code === "ASK") {
                await editMessageText(ctx, waitMsg, body?.data?.text || "⚠️ An unexpected error occurred while processing your request.");
                return;
            }

            await editMessageText(ctx, waitMsg, "⚠️ An unexpected error occurred while processing your request.");

        } catch (error) {
            Log.error('Error executing AI chat:', error);
            await editMessageText(ctx, waitMsg, "⚠️ An unexpected error occurred while executing the command.");
        }
    }

    private async registerCommands() {
        if (process.env.NODE_ENV !== 'production') {
            Log.info('Skipping command registration (not in production).');
            return;
        }

        try {
            const commandList = Array.from(this.commands.values()).map((cmd) => ({
                command: cmd.name,
                description: cmd.description,
            }));

            await this.client.api.setMyCommands(commandList);
            Log.event('Bot commands registered successfully.');
        } catch (error) {
            Log.error('Failed to register bot commands:', error);
        }
    }

    public getCommands(): Map<string, TCommand> {
        return this.commands;
    }

    public getClient(): Bot {
        return this.client;
    }

    public async start() {
        this.loadCommands();
        this.injectCommands();
        this.injectButtons();
        this.injectInline();

        await this.registerCommands();

        this.client.start({
            drop_pending_updates: true,
            onStart: (info) => {
                Log.event(`Bot started! Logged in as @${info.username}`);
            },
        });

        this.client.catch((error) => {
            Log.error('Client error:', error);
        });
    }
}

export default TelegramBot;