import { FastifyInstance, FastifyPluginOptions } from "fastify";
import TelegramController from "../controllers/telegram";

const telegramRoutes = async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
    fastify.post('/telegram/message', TelegramController.postMessage);
};

export default telegramRoutes;