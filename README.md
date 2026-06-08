# Buyzaar Telegram Bot 🤖

A Telegram bot that extracts product information from messages and generates AI-powered social media posts.

## Features ✨

- 📝 Extract product name, price, unit from text
- 🖼️ Support for images (uploaded to ImgBB)
- 🤖 AI-generated posts for Instagram, Facebook, WhatsApp, X/Twitter
- 💾 Save products to GitHub
- 🏷️ Automatic price detection (₹, @, /- patterns)
- 📦 Unit detection (L, ML, KG, Grams, Pieces)
- 🎯 Category always "store"

## Tech Stack 🛠️

- Node.js
- Telegram Bot API
- Groq AI (Llama 3.3 70B)
- GitHub API
- ImgBB API

## Setup Instructions 🚀

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your API keys
3. Run `npm install`
4. Run `node bot.js`

## Environment Variables 🔑

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `GROQ_API_KEY` | Groq AI API key |
| `GITHUB_TOKEN` | GitHub personal access token |
| `REPO_OWNER` | GitHub username |
| `REPO_NAME` | Repository name |
| `IMGBB_API_KEY` | ImgBB API key for image hosting |

## How It Works 🔄

1. User sends product message to bot
2. Bot extracts product details
3. Saves product to GitHub
4. Generates AI social media posts
5. Returns formatted posts to user

## License 📄

ISC
