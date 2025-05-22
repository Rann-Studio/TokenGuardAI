import crypto from "crypto";
import database from "../utils/database";
import * as Log from "../utils/log";
import { getSearchMethod, isCacheValid } from "../utils/misc";
import { fetchCoinList, fetchCoinMarketInfo } from "./coingecko";
import { getAnalysis, getChatAnswer, getChatIntent } from "./langchain";

const upsertMessageResponse = async (hash: string, coinId: string, risk?: TRiskResponse, insight?: TInsightResponse) => {
    await database.mesageResponse.upsert({
        where: { hash },
        update: {
            marketId: coinId,
            risk: risk,
            insight: insight,
        },
        create: {
            hash,
            marketId: coinId,
            risk: risk,
            insight: insight,
        },
    });
};

const upsertMarketInfo = async (coinMarketInfo: TMarketInfo, coinId: string) => {
    return await database.coinMarketInfo.upsert({
        where: { coinId },
        update: { ...coinMarketInfo, fdv: coinMarketInfo.fdv ?? 0 },
        create: { ...coinMarketInfo, fdv: coinMarketInfo.fdv ?? 0, coinId },
    });
};

const getCoinList = async (searchMethod: "symbol" | "name", keyword: string) => {
    const coinList = await database.coinList.findFirst({
        where: { [searchMethod]: keyword },
        include: { coinPlatform: true },
    });
    if (!coinList) return null;
    return coinList;
};

const getCointPlatform = async (searchMethod: "address" | "coinId", keyword: string) => {
    const platform = await database.coinPlatform.findFirst({
        where: { [searchMethod]: keyword },
        include: { coinList: true },
    });
    if (!platform) return null;
    return platform;
}

export const updateCoinList = async (): Promise<void> => {
    const coinList = await fetchCoinList();
    if (!coinList) {
        Log.warn("No coin list fetched");
        return;
    }

    const BATCH_SIZE = 1000;
    const totalBatches = Math.ceil(coinList.length / BATCH_SIZE);

    Log.info(`Starting coin list update. Total coins: ${coinList.length}, Batch size: ${BATCH_SIZE}, Total batches: ${totalBatches}`);

    for (let i = 0; i < coinList.length; i += BATCH_SIZE) {
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        const batch = coinList.slice(i, i + BATCH_SIZE);

        try {
            Log.info(`Updating database coin list [${batchIndex}/${totalBatches}]`);
            await database.$transaction([
                ...batch.map((coin) =>
                    database.coinList.upsert({
                        where: { id: coin.id },
                        update: { name: coin.name, symbol: coin.symbol },
                        create: { id: coin.id, name: coin.name, symbol: coin.symbol },
                    })
                ),
                ...batch.flatMap((coin) =>
                    coin.platform.map((platform) =>
                        database.coinPlatform.upsert({
                            where: { coinId_name_address: { coinId: coin.id, name: platform.name, address: platform.address } },
                            update: { name: platform.name, address: platform.address },
                            create: { name: platform.name, address: platform.address, coinId: coin.id },
                        })
                    )
                )
            ]);

        } catch (error) {
            Log.error(`Error updating database coin list [${batchIndex}/${totalBatches}]:`, error);
        }
    }

    Log.info("Database coin list update completed");
};

export const getCachedChatIntent = async (query: string): Promise<TIntentResponse & { hash: string } | null> => {
    const hash = crypto.createHash("sha256").update(query).digest("hex");

    const cachedResult = await database.chatIntent.findUnique({
        where: { hash },
    });

    if (cachedResult) {
        const response = cachedResult.response as TIntentResponse;
        return { ...response, hash };
    }

    const response = await getChatIntent(query);
    if (!response) return null;

    await database.chatIntent.upsert({
        where: { hash },
        update: { response: response },
        create: { hash, response: response },
    });

    return { ...response, hash };
}

export const getCachedAnalysis = async (intent: TIntentResponse & { hash: string }): Promise<TResponse> => {
    if (!intent.address) {
        return {
            statusCode: 400,
            error: "Bad Request",
            message: "Sorry, I can't analyze this token. Please provide a valid address.",
        };
    }

    intent.address = intent.address.toLowerCase();

    const cached = await database.mesageResponse.findUnique({
        where: { hash: intent.hash },
        include: { market: { omit: { coinId: true } } },
    });

    if (cached && isCacheValid(cached.updatedAt)) {
        const platform = await getCointPlatform("address", intent.address);
        if (!platform) {
            return {
                statusCode: 404,
                error: "Not Found",
                message: "Sorry, I can't analyze this token. The address you provided is not available in our database.",
            };
        }

        return {
            statusCode: 200,
            message: "Analysis completed",
            data: {
                code: "ANALYZE",
                coin: {
                    name: platform.coinList.name,
                    symbol: platform.coinList.symbol,
                    platform: platform.name,
                    address: platform.address,
                },
                market: {
                    ...cached.market,
                    fdv: Number(cached.market.fdv) ?? 0,
                },
                risk: cached.risk,
                insight: cached.insight,
            },
        };
    }

    const platform = await getCointPlatform("address", intent.address);
    if (!platform) {
        return {
            statusCode: 404,
            error: "Not Found",
            message: "Sorry, I can't analyze this token. The address you provided is not available in our database.",
        };
    }

    let cachedMarketInfo = await database.coinMarketInfo.findFirst({
        where: { coinId: platform.coinId },
        omit: { coinId: true },
    });

    let promtInput: TAnalyzePromptInput;

    if (cachedMarketInfo && isCacheValid(cachedMarketInfo.updatedAt)) {
        promtInput = {
            name: platform.coinList.name,
            symbol: platform.coinList.symbol,
            chain: platform.name,
            fdv: cachedMarketInfo.fdv,
            price: cachedMarketInfo.price as TPrice,
            marketCap: cachedMarketInfo.marketCap as TMarketCap,
            supply: cachedMarketInfo.supply as TSupply,
            allTimeHigh: cachedMarketInfo.allTimeHigh as TAllTimeHigh,
            allTimeLow: cachedMarketInfo.allTimeLow as TAllTimeLow,
        }
    } else {
        const coinMarketInfo = await fetchCoinMarketInfo(platform.coinId);
        if (!coinMarketInfo) {
            return {
                statusCode: 404,
                error: "Not Found",
                message: "Sorry, I can't analyze this token. The address you provided is not available in our database.",
            };
        }

        promtInput = {
            name: platform.coinList.name,
            symbol: platform.coinList.symbol,
            chain: platform.name,
            fdv: coinMarketInfo.fdv,
            price: coinMarketInfo.price as TPrice ?? {},
            marketCap: coinMarketInfo.marketCap as TMarketCap ?? {},
            supply: coinMarketInfo.supply as TSupply ?? {},
            allTimeHigh: coinMarketInfo.allTimeHigh as TAllTimeHigh ?? {},
            allTimeLow: coinMarketInfo.allTimeLow as TAllTimeLow ?? {},
        }

        cachedMarketInfo = await upsertMarketInfo(coinMarketInfo, platform.coinId);
    }

    const analysis = await getAnalysis(promtInput);
    if (!analysis) {
        return {
            statusCode: 500,
            error: "Internal Server Error",
            message: "Analysis failed. Please try again later."
        }
    }

    await upsertMessageResponse(intent.hash, platform.coinId, analysis.risk, analysis.insight);
    return {
        statusCode: 200,
        message: "Analysis completed",
        data: {
            code: "ANALYZE",
            coin: {
                name: platform.coinList.name,
                symbol: platform.coinList.symbol,
                platform: platform.name,
                address: platform.address,
            },
            market: {
                ...cachedMarketInfo,
                fdv: Number(cachedMarketInfo.fdv) ?? 0,
                coinId: undefined,
            },
            risk: analysis.risk,
            insight: analysis.insight,
        },
    }
}

export const getCachedPrice = async (intent: TIntentResponse & { hash: string }): Promise<TResponse> => {
    const cached = await database.mesageResponse.findUnique({
        where: { hash: intent.hash },
        include: { market: { omit: { coinId: true } } },
    });

    if (cached && isCacheValid(cached.updatedAt)) {
        const coinList = await database.coinList.findFirst({
            where: { id: cached.marketId }
        });
        if (!coinList) {
            return {
                statusCode: 404,
                error: "Not Found",
                message: "Sorry, I can't analyze this token. The address you provided is not available in our database.",
            };
        }

        return {
            statusCode: 200,
            message: "Get price successfully",
            data: {
                code: "PRICE",
                coin: {
                    name: coinList.name,
                    symbol: coinList.symbol,
                },
                ...cached.market.price as TPrice
            },
        };
    }


    const method = getSearchMethod(intent);
    if (!method) {
        return {
            statusCode: 400,
            error: "Bad Request",
            message: "Sorry, I can't get the price for this token. Please provide a valid symbol or name.",
        }
    }

    const coinList = await getCoinList(method, intent[method] as string);
    if (!coinList) {
        return {
            statusCode: 404,
            error: "Not Found",
            message: "Sorry, I can't get the price for this token. The symbol or name you provided is not available in our database.",
        }
    }

    let cachedMarketInfo = await database.coinMarketInfo.findFirst({
        where: { coinId: coinList.id },
        omit: { coinId: true },
        orderBy: { updatedAt: "desc" },
    });

    if (cachedMarketInfo && isCacheValid(cachedMarketInfo.updatedAt)) {
        return {
            statusCode: 200,
            message: "Get price successfully",
            data: { 
                code: "PRICE",
                coin: {
                    name: coinList.name,
                    symbol: coinList.symbol,
                },
                ...cachedMarketInfo.price as TPrice
            },
        };
    }

    const coinMarketInfo = await fetchCoinMarketInfo(coinList.id);
    if (!coinMarketInfo) {
        return {
            statusCode: 404,
            error: "Not Found",
            message: "Sorry, I can't get the price for this token. The symbol or name you provided is not available in our database.",
        }
    }

    cachedMarketInfo = await upsertMarketInfo(coinMarketInfo, coinList.id);
    await upsertMessageResponse(intent.hash, coinList.id);

    return {
        statusCode: 200,
        message: "Get price successfully",
        data: {
            code: "PRICE",
            coin: {
                name: coinList.name,
                symbol: coinList.symbol,
            },
            ...cachedMarketInfo.price as TPrice
        },
    }
}

export const getCachedMarketcap = async (intent: TIntentResponse & { hash: string }): Promise<TResponse> => {
    const cached = await database.mesageResponse.findUnique({
        where: { hash: intent.hash },
        include: { market: { omit: { coinId: true } } },
    });

    if (cached && isCacheValid(cached.updatedAt)) {
        const coinList = await database.coinList.findFirst({
            where: { id: cached.marketId }
        });

        if (!coinList) {
            return {
                statusCode: 404,
                error: "Not Found",
                message: "Sorry, I can't analyze this token. The address you provided is not available in our database.",
            };
        }

        return {
            statusCode: 200,
            message: "Get marketcap successfully",
            data: {
                code: "MARKETCAP",
                coin: {
                    name: coinList.name,
                    symbol: coinList.symbol,
                },
                ...cached.market.marketCap as TMarketCap
            },
        };
    }

    const method = getSearchMethod(intent);
    if (!method) {
        return {
            statusCode: 400,
            error: "Bad Request",
            message: "Sorry, I can't get the marketcap for this token. Please provide a valid symbol or name.",
        }
    }

    const coinList = await getCoinList(method, intent[method] as string);
    if (!coinList) {
        return {
            statusCode: 404,
            error: "Not Found",
            message: "Sorry, I can't get the marketcap for this token. The symbol or name you provided is not available in our database.",
        }
    }

    let cachedMarketInfo = await database.coinMarketInfo.findFirst({
        where: { coinId: coinList.id },
        omit: { coinId: true },
        orderBy: { updatedAt: "desc" },
    });

    if (cachedMarketInfo && isCacheValid(cachedMarketInfo.updatedAt)) {
        return {
            statusCode: 200,
            message: "Get marketcap successfully",
            data: {
                code: "MARKETCAP",
                coin: {
                    name: coinList.name,
                    symbol: coinList.symbol,
                },
                ...cachedMarketInfo.marketCap as TMarketCap
            },
        };
    }


    const coinMarketInfo = await fetchCoinMarketInfo(coinList.id);
    if (!coinMarketInfo) {
        return {
            statusCode: 404,
            error: "Not Found",
            message: "Sorry, I can't get the marketcap for this token. The symbol or name you provided is not available in our database.",
        }
    }

    cachedMarketInfo = await upsertMarketInfo(coinMarketInfo, coinList.id);
    await upsertMessageResponse(intent.hash, coinList.id);

    return {
        statusCode: 200,
        message: "Get marketcap successfully",
        data: {
            code: "MARKETCAP",
            coin: {
                name: coinList.name,
                symbol: coinList.symbol,
            },
            ...cachedMarketInfo.marketCap as TMarketCap
        },
    }
}

export const getCachedAnswer = async (intent: TIntentResponse & { hash: string }): Promise<TResponse> => {
    if (!intent.query) {
        return {
            statusCode: 400,
            error: "Bad Request",
            message: "Sorry, I can't answer this question. Please provide a valid question.",
        }
    }

    const cached = await database.messageResponseChat.findUnique({
        where: { hash: intent.hash }
    });

    if (cached && isCacheValid(cached.updatedAt)) {
        return {
            statusCode: 200,
            message: "Answer from AI",
            data: {
                code: "ASK",
                text: cached.text
            },
        };
    }

    const answer = await getChatAnswer(intent.query);
    if (!answer) {
        return {
            statusCode: 500,
            error: "Internal Server Error",
            message: "Answer failed. Please try again later."
        }
    }

    await database.messageResponseChat.upsert({
        where: { hash: intent.hash },
        update: { text: answer.text },
        create: { hash: intent.hash, text: answer.text },
    });

    return {
        statusCode: 200,
        message: "Answer from AI",
        data: {
            code: "ASK",
            text: answer.text
        },
    }
}