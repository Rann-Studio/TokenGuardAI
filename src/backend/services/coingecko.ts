import { request } from 'undici';
import * as Log from '../utils/log';

export const fetchCoinList = async (): Promise<TCoinList[] | null> => {
    try {
        const response = await request('https://api.coingecko.com/api/v3/coins/list?include_platform=true', {
            method: 'GET',
            headers: {
                'x-cg-demo-api-key': process.env.COINGECKO_API_KEY,
            },
        });

        if (response.statusCode !== 200) {
            Log.error(`Unexpected status code: ${response.statusCode} when fetching coin list`);
            return null;
        }

        const json = await response.body.json() as any;
        const data: TCoinList[] = json.map((coin: any) => ({
            id: coin.id.toLowerCase(),
            symbol: coin.symbol.toLowerCase(),
            name: coin.name.toLowerCase(),
            platform: Object.entries(coin.platforms).map(([name, address]) => ({
                name: name.toLowerCase(),
                address: (address as string).toLowerCase()
            })),
        }));

        return data;
    } catch (error) {
        Log.error('Error fetching coin list:', error);
        return null;
    }
};

export const fetchCoinMarketInfo = async (coinId: string): Promise<TMarketInfo | null> => {
    try {
        const response = await request(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}`, {
            method: 'GET',
            headers: {
                'x-cg-demo-api-key': process.env.COINGECKO_API_KEY,
            },
        });

        if (response.statusCode !== 200) {
            Log.error(`Unexpected status code: ${response.statusCode} when fetching market info for coinId: ${coinId}`);
            return null;
        }

        const json = await response.body.json() as any;
        if (!json || json.length === 0) {
            Log.error(`No market info found for coinId: ${coinId}`);
            return null;
        }

        const data: TMarketInfo = {
            fdv: json[0].fully_diluted_valuation,
            price: {
                currentPrice: json[0].current_price,
                highPrice24h: json[0].high_24h,
                lowPrice24h: json[0].low_24h,
                priceChange24h: json[0].price_change_24h,
                priceChangePercentage24h: json[0].price_change_percentage_24h,
            },
            marketCap: {
                marketCap: json[0].market_cap,
                marketCapRank: json[0].market_cap_rank,
                marketCapChange24h: json[0].market_cap_change_24h,
                marketCapChangePercentage24h: json[0].market_cap_change_percentage_24h,
            },
            supply: {
                circulatingSupply: json[0].circulating_supply,
                totalSupply: json[0].total_supply,
                maxSupply: json[0].max_supply,
            },
            allTimeHigh: {
                ath: json[0].ath,
                athPercentage: json[0].ath_change_percentage,
                athDate: json[0].ath_date,
            },
            allTimeLow: {
                atl: json[0].atl,
                atlPercentage: json[0].atl_change_percentage,
                atlDate: json[0].atl_date,
            }
        };

        return data;

    } catch (error) {
        Log.error('Error fetching coin market info:', error);
        return null;
    }
}