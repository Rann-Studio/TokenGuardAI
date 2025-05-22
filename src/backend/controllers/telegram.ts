import { FastifyReply, FastifyRequest } from "fastify";
import { TeleMessageSchema } from "../schemas/telegram";
import { getCachedAnalysis, getCachedAnswer, getCachedChatIntent, getCachedMarketcap, getCachedPrice } from "../services/database";
import { error } from "console";

class TelegramController {
    static async postMessage(request: FastifyRequest, reply: FastifyReply) {
        const bodyParsed = TeleMessageSchema.safeParse(request.body || {});
        if (!bodyParsed.success) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid request body',
                data: bodyParsed.error.issues
            });
        }

        let response: TResponse;

        const intent = await getCachedChatIntent(bodyParsed.data.text);
        if (!intent) {
            return reply.status(500).send({
                statusCode: 500,
                error: 'Internal Server Error',
                message: 'Failed to determine intent',
            });
        }

        switch (intent.intent) {
            case 'analyze':
                response = await getCachedAnalysis(intent)
                break;

            case 'price':
                response = await getCachedPrice(intent)
                break;

            case 'marketcap':
                response = await getCachedMarketcap(intent)
                break;

            case 'ask':
                response = await getCachedAnswer(intent)
                break;

            case 'unknown':
                response = {
                    statusCode: 422,
                    error: 'Unprocessable Entity',
                    message: "I'm sorry, I don't understand your request. Please ask me something related to cryptocurrency, such as 'What is the price of Bitcoin?' or 'What is the market cap of Ethereum?'",
                }
                break;
        }

        return reply.status(response.statusCode).send(response);
    }
}

export default TelegramController;