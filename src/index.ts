import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "./telegram";
import Backend from "./backend";

TelegramBot.getInstance().start();

const backend = new Backend()
backend.start()