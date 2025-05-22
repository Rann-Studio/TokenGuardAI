import { FastifyReply, FastifyRequest } from "fastify";

class IndexController {
    static async getIndex(request: FastifyRequest, reply: FastifyReply) {
        return reply.status(200).send({
            statusCode: 200,
            message: 'Welcome to the API',
        });
    }
}

export default IndexController;