type TIntent = "analyze" | "price" | "marketcap" | "ask" | "unknown"

type TIntentResponse = {
    intent: TIntent;
    symbol: string | null;
    name: string | null;
    address: string | null;
    query: string | null;
}

type TAnalyzePromptInput = TMarketInfo & {
    name: string;
    symbol: string;
    chain: string;
}

type TRiskResponse = {
    score: number;
    explanation: string;
}

type TInsightResponse = Array<string>;

type TAnalysisResponse = {
    risk: TRiskResponse;
    insight: TInsightResponse;
}

type TAnswerResponse = {
    text: string;
}