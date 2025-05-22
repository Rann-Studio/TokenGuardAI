import fastify, { FastifyInstance, FastifyReply, FastifyRequest, FastifyServerOptions, HookHandlerDoneFunction } from 'fastify';
import * as Log from './utils/log';
import indexRoutes from './routes';

import CoinGeckoScheduler from './schedulers/database';
import telegramRoutes from './routes/telegram';

class Backend {

    private port: number;
    private server: FastifyInstance;

    constructor(port: number = 3000, options?: FastifyServerOptions) {
        this.port = port;
        this.server = fastify(options);
        this.registerMiddleware();
        this.registerRoutes();
        this.registerScheduler();
    }

    private registerMiddleware() {
        this.server.addHook('onRequest', this.checkSecretKey);
    }

    private registerRoutes() {
        this.server.register(indexRoutes);
        this.server.register(telegramRoutes, { prefix: '/api' });
    }

    private registerScheduler() {
        const coinGeckoScheduler = new CoinGeckoScheduler();
        coinGeckoScheduler.start();
    }

    private checkSecretKey(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
        const secret = request.headers['x-secret-key'];
        if (!secret || secret !== process.env.BACKEND_SECRET) {
            return reply.status(401).send({
                statusCode: 401,
                message: 'missing or invalid header x-secret-key',
                error: 'Unauthorized',
            });
        }
        done();
    }


    public start() {
        this.server.listen({ port: this.port }, (error, address) => {
            if (error) {
                Log.error('Error starting server:', error);
                process.exit(1);
            }
            Log.event(`Server listening at ${address}`);
        });
    }
}

export default Backend