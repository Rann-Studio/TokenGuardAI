# Crypto Token Assistant Telegram Bot

A Telegram bot to analyze and provide insights on crypto tokens, including price, market cap, safety score, and AI-generated insights. Built with Node.js, TypeScript, Fastify, Prisma, and Langchain.

---

## How to Run Locally

1. **Clone the repository**  
   ```sh
   git clone https://github.com/Rann-Studio/TokenGuardAI.git
   cd TokenGuardAI
   ```

2. **Install dependencies**  
   ```sh
   npm install
   ```

3. **Configure environment variables**  
   Copy `.env.example` to `.env` and fill in your credentials.

4. **Generate Prisma client**  
   ```sh
   npx prisma generate
   ```

5. **Run database migrations**  
   ```sh
   npx prisma migrate deploy
   ```

6. **Build the project**  
   ```sh
   npm run build
   ```

7. **Start the bot and backend**  
   ```sh
   npm start
   ```
   Or for development:
   ```sh
   npm run dev
   ```

---

## APIs Used
This project uses the following APIs for various functionalities:
- [CoinGecko API](https://www.coingecko.com/en/api) - For fetching crypto token data.

- [OpenAI API](https://platform.openai.com/docs/api-reference) - For generating AI responses.

- [Telegram Bot API (via grammY)](https://grammy.dev/) - For interacting with Telegram.

---

## BOT Commands
- `/start` - Start the bot and get a welcome message.
- `/help` - Get a list of available commands.
- `/ping` - Check if the bot is online.

You can ask the bot for information about any crypto token by simply sending its name or symbol or its contract address. The bot will respond with detailed information about the token.

For example, you can send:
- "Analyze this token 0x2170ed0880ac9a755fd29b2688956bd959f933f8"
- "What is the price of Bitcoin?"
- "Give me the market cap of Ethereum."
- "Tell me about Dogecoin."

---

## Langchain Prompt Structure
The bot uses [Langchain](https://js.langchain.com) with [OpenAI](https://openai.com) models to generate AI responses.
Prompt templates are defined in the [\src\backend\services\langchain.ts](\src\backend\services\langchain.ts)

- **Intent Prompt**  
  This prompt is used to determine the user's intent based on the input text. It helps in understanding what kind of information the user is looking for.

```json
{
    "intent": "analyze | price | marketcap | ask | unknown",
    "symbol": "string | null",
    "name": "string | null",
    "address": "string | null",
    "query": "string | null"
}
```

- **Analysis Prompt**  
  This prompt is used to analyze the token based on the user's intent. It provides detailed information about the token, including its price, market cap, and other relevant data.

```json
{
    "risk" : {
        "score": "number",
        "explanation": "string"
    },
    "insight": "array of strings",
}
```

- **Chat Prompt**  
  This prompt is used to generate a AI response based on the user's query. It provides a conversational response to the user's question.
```json
{
    "text": "string"
}
```

---

## Link to the Bot
You can find the bot on Telegram at [@TokenGuardAI_BOT](https://t.me/TokenGuardAI_BOT).

## Showcase
Please check out the [TokenGuardAI Showcase](https://files.catbox.moe/0x0rs6.mp4) for a demonstration of the bot's features and capabilities.

## License
This project is licensed under AGPL-3.0 License. See the [LICENSE](LICENSE) file for details.