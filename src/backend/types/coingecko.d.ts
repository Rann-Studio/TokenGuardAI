type TCoinPlatform = {
    name: string;
    address: string;
}

type TCoinList = {
    id: string;
    symbol: string;
    name: string;
    platform: TCoinPlatform[]
}

type TPrice = {
    currentPrice: number | null;
    highPrice24h: number | null;
    lowPrice24h: number | null;
    priceChange24h: number | null;
    priceChangePercentage24h: number | null;
}

type TMarketCap = {
    marketCap: number | null;
    marketCapRank: number | null;
    marketCapChange24h: number | null;
    marketCapChangePercentage24h: number | null;
}

type TSupply = {
    circulatingSupply: number | null;
    totalSupply: number | null;
    maxSupply: number | null;
}

type TAllTimeHigh = {
    ath: number | null;
    athPercentage: number | null;
    athDate: string;
}

type TAllTimeLow = {
    atl: number | null;
    atlPercentage: number | null;
    atlDate: string;
}

type TMarketInfo = {
    fdv: bigint | null;
    price: TPrice;
    marketCap: TMarketCap;
    supply: TSupply;
    allTimeHigh: TAllTimeHigh;
    allTimeLow: TAllTimeLow;
}