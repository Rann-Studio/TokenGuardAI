export const isCacheValid = (updatedAt: Date | null | undefined): boolean => {
    if (!updatedAt) return false;
    return updatedAt.getTime() > Date.now() - 1000 * 60 * 30;
}

export const getSearchMethod = (intent: TIntentResponse): "symbol" | "name" | null => {
    if (intent.symbol) {
        intent.symbol = intent.symbol.toLowerCase();
        return "symbol";
    }
    if (intent.name) {
        intent.name = intent.name.toLowerCase();
        return "name";
    }
    return null;
};