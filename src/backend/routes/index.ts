import { FastifyInstance, FastifyPluginOptions } from "fastify";
import IndexController from "../controllers";

const indexRoutes = async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
    fastify.get('/', IndexController.getIndex);
};

export default indexRoutes;