import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import * as Log from "../utils/log";

const model = new ChatOpenAI({
    temperature: 0.7,
    maxTokens: 1000,
    model: "gpt-4o-mini",
});

export const getChatIntent = async (query: string): Promise<TIntentResponse | null> => {
    const systemMessage = `
        You are an assistant that extracts user intent and relevant data from Telegram messages.

        Possible intents:
        analyze: When the user wants to analyze a specific coin or token. (e.g., "Analyze Bitcoin", "What do you think about Ethereum?", "0xcb50350ab555ed5d56265e096288536e8cac41eb")
        price: When the user is asking for the current price of a coin or token. (e.g., "What is the price of Bitcoin?", "How much is Ethereum right now?")
        marketcap: When the user is asking for the market cap of a coin or token. (e.g., "What is the market cap of Bitcoin?", "How much is Ethereum worth?")
        ask: When the user is asking a question that relates to a coin or token but does not fit into the other categories. (e.g., "Who created Bitcoin?", "What is the purpose of Ethereum?")
        unknown: When the user is asking for something that is not related to any coin or token. (e.g., "Tell me a joke", "What is the weather like?")
    `;

    const formatInstructions = `        
        Return the result strictly in this JSON format, no extra keys, no additional text or formatting, no explanations outside JSON:
        {{
            "intent": "analyze" | "price" | "marketcap" | "ask" | "unknown"
            "symbol": string | null,
            "name": string | null,
            "address": string | null,
            "query": string | null
        }}

        intent: choose one of "analyze", "price", "marketcap", "ask", "unknown"
        symbol: lowercase string of the coin symbol (e.g., "btc", "eth") if and only if the user explicitly mentions the symbol, not the name
        name: lowercase string of the coin name (e.g., "bitcoin", "ethereum") if and only if the user explicitly mentions the coin name, not the symbol
        address: lowercase string of the coin full address (e.g., "0xcb50350ab555ed5d56265e096288536e8cac41eb", "0x0a2a868f6a8618b599e49f6b49240088d85b93660003da5a066841e28f19d629::pchu::PCHU", "kaspa:qzsytqthtcus8kfhkafxqrj39jylgv8ksys3656z9mrws6xknxskkqcajxsx0") if and only if the user explicitly mentions the address, not the symbol or name
        query: users telegram chat message if and only if the user is asking a question that does not fit into the other categories, otherwise null

        Example:
        how much is the price of bitcoin? -> { "intent": "price", "symbol": null, "name": "bitcoin", "address": null, "query": null }
        how much is the price of btc? -> { "intent": "price", "symbol": "btc", "name": null, "address": null, "query": null }
        how much is the price of 0xcb50350ab555ed5d56265e096288536e8cac41eb? -> { "intent": "price", "symbol": null, "name": null, "address": "0xcb50350ab555ed5d56265e096288536e8cac41eb", "query": null }
        who is the creator of bitcoin? -> { "intent": "ask", "symbol": null, "name": null, "address": null, "query": "who is the creator of bitcoin?" }
    `;

    const parser = new JsonOutputParser<TIntentResponse>();
    const prompt = await ChatPromptTemplate.fromMessages([
        ["system", `${systemMessage}{format_instructions}`],
        ["human", "{query}"],
    ]).partial({
        format_instructions: formatInstructions,
    });

    const chain = prompt.pipe(model).pipe(parser);
    try {
        const response = await chain.invoke({ query }, { timeout: 30000 });
        return response;
    } catch (error) {
        Log.error("Error in getChatIntent:", error);
        return null;
    }
}

export const getAnalysis = async (data: TAnalyzePromptInput): Promise<TAnalysisResponse | null> => {
    const systemMessage = `
        Your are a crypto analyst AI. You will be given data about a cryptocurrency token.
        Analyze the data and provide a risk score from 0 to 100, where 0 means no risk and 100 means extremely high risk. Also, provide an explanation of the score in natural language. The explanation should be clear and easy to understand for a retail investor. Use simple language and avoid technical jargon. The insights should be actionable and concise, helping the user understand the token's market health.
        The explanation should sound natural, like how a real person would explain it. Don't make it too formal or stiff, just keep it relaxed, like you're chatting with a friend.
    `;

    const humanMessage = `
        Token Data:
        Name: ${data.name}
        Symbol: ${data.symbol}
        Chain: ${data.chain}
        Current Price: $${data.price.currentPrice}
        High Price 24h: $${data.price.highPrice24h}
        Low Price 24h: $${data.price.lowPrice24h}
        Price Change 24h: $${data.price.priceChange24h}
        Price Change Percentage 24h: ${data.price.priceChangePercentage24h}%
        Market Cap: $${data.marketCap.marketCap}
        Market Cap Rank: ${data.marketCap.marketCapRank}
        Market Cap Change 24h: $${data.marketCap.marketCapChange24h}
        Market Cap Change Percentage 24h: ${data.marketCap.marketCapChangePercentage24h}%
        Circulating Supply: ${data.supply.circulatingSupply}
        Total Supply: ${data.supply.totalSupply}
        Max Supply: ${data.supply.maxSupply}
        All Time High: $${data.allTimeHigh.ath}
        All Time High Percentage: ${data.allTimeHigh.athPercentage}%
        All Time High Date: ${data.allTimeHigh.athDate}
        All Time Low: $${data.allTimeLow.atl}
        All Time Low Percentage: ${data.allTimeLow.atlPercentage}%
        All Time Low Date: ${data.allTimeLow.atlDate}
        Fully Diluted Valuation: $${data.fdv}
    `

    const formatInstructions = `        
        Return the result strictly in this JSON format, no extra keys, no additional text or formatting, no explanations outside JSON:
        {{
            "risk": {{
                "score": 35,
                "explanation": "This token has a healthy trading volume and decent liquidity, indicating strong community interest. However, price volatility suggests short-term risks. Proceed with caution."
            }},
            "insight": [
                "High liquidity indicates a lower risk of sudden price drops.",
                "Strong trading activity suggests a strong community interest.",
                "Stable price indicates lower short-term volatility risk.",
                "Recent price changes indicate potential for short-term gains.",
                "Market cap rank suggests a well-established token in the market."
            ]
        }}

        risk:
         - score: integer between 0 and 100
         - explanation: string, a natural language explanation of the risk score
        insight: array of strings, each string is an actionable insight
    `;

    const parser = new JsonOutputParser<TAnalysisResponse>();
    const prompt = await ChatPromptTemplate.fromMessages([
        ["system", `${systemMessage}{format_instructions}`],
        ["human", humanMessage],
    ]).partial({
        format_instructions: formatInstructions,
    });

    const chain = prompt.pipe(model).pipe(parser);
    try {
        const response = await chain.invoke(data, { timeout: 30000 });
        return response;
    } catch (error) {
        Log.error("Error in getAnalysis:", error);
        return null;
    }
}

export const getChatAnswer = async (query: string): Promise<TAnswerResponse | null> => {
    const systemMessage = `
        You are a crypto assistant AI. You will be given a question about cryptocurrency.
        Answer the question in a clear and concise manner, using simple language and avoiding technical jargon. The answer should be actionable and easy to understand for a retail investor. The answer should be no more than 3 sentences long.
        The answer should sound natural, like how a real person would explain it. Don't make it too formal or stiff, just keep it relaxed, like you're chatting with a friend.
    `;

    const formatInstructions = `        
        Return the result strictly in this JSON format, no extra keys, no additional text or formatting, no explanations outside JSON:
        {{
            "text": "This is the answer to the question."
        }}

        text: string, the answer to the question
    `;

    const parser = new JsonOutputParser<TAnswerResponse>();
    const prompt = await ChatPromptTemplate.fromMessages([
        ["system", `${systemMessage}{format_instructions}`],
        ["human", "{query}"],
    ]).partial({
        format_instructions: formatInstructions,
    });

    const chain = prompt.pipe(model).pipe(parser);
    try {
        const response = await chain.invoke({ query }, { timeout: 30000 });
        return response;
    } catch (error) {
        Log.error("Error in getChatAnswer:", error);
        return null;
    }
}