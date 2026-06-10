
// Add this at the VERY TOP 
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Buyzaar Bot Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const githubService = require('./githubService');
const groqService = require('./groqService');
const AIService = require('./aiService');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
console.log('🤖 Bot running...');

// ===============================
// CLEAN POST FUNCTION
// ===============================

function cleanPost(text, productLink) {
  if (!text) return '';
  text = text.replace(/(https?:\/\/[^\s]+)/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  if (!text.includes(productLink)) {
    text += `\n\n🛒 Order Now:\n${productLink}`;
  }
  
  return text;
}

// ===============================
// FORMAT POST FUNCTION
// ===============================

function formatPost(emoji, platform, content) {
  let cleanContent = content
    .replace(/^📸\s*INSTAGRAM\s*POST\s*\n+/i, '')
    .replace(/^📘\s*FACEBOOK\s*POST\s*\n+/i, '')
    .replace(/^💬\s*WHATSAPP\s*POST\s*\n+/i, '')
    .replace(/^🐦\s*X\s*POST\s*\n+/i, '')
    .trim();
  
  return `${emoji} ${platform} POST\n\n${cleanContent}`;
}

// ===============================
// FALLBACK POSTS
// ===============================

function getFallbackPosts(product, productLink) {
  const name = product.name || 'Product';
  const price = product.price || '0';
  
  return {
    instagram: `🔥 ${name} 🔥\n\n💰 Just ₹${price}\n\n#Buyzaar #Deal`,
    facebook: `🛍️ ${name}\n💰 ₹${price}\n\nOrder now: ${productLink}`,
    whatsapp: `${name}\n💰 ₹${price}\n👉 ${productLink}`,
    x: `${name} - ₹${price}\n${productLink}`
  };
}

// ===============================
// MAIN MESSAGE HANDLER
// ===============================

bot.on('message', async (msg) => {
  try {
    if (msg.text && msg.text.startsWith('/')) return;
    
    await bot.sendChatAction(msg.chat.id, 'typing');
    
    const text = msg.caption || msg.text || '';
    console.log('📨 Received:', text.substring(0, 100));
    
    let imageUrl = '';
    if (msg.photo && msg.photo.length > 0) {
      const photo = msg.photo[msg.photo.length - 1];
      const file = await bot.getFile(photo.file_id);
      imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    }
    
    const product = await AIService.extractProduct({ text, imageUrl });
    console.log('✅ Product extracted:', product.name);
    
    await githubService.addProduct(product);
    
    const productLink = `https://buyzaar-26379.web.app/#/product-detail/${product.id}`;
    
    let posts = await groqService.generateSocialPosts(product, productLink);
    
    if (!posts) {
      posts = getFallbackPosts(product, productLink);
    }
    
    // Clean posts
    const cleanedPosts = {
      instagram: cleanPost(posts.instagram || '', productLink),
      facebook: cleanPost(posts.facebook || '', productLink),
      whatsapp: cleanPost(posts.whatsapp || '', productLink),
      x: cleanPost(posts.x || '', productLink)
    };
    
     await bot.sendMessage(msg.chat.id, formatPost('📸', 'INSTAGRAM', cleanedPosts.instagram));
      await bot.sendMessage(msg.chat.id, formatPost('📘', 'FACEBOOK', cleanedPosts.facebook));
      await bot.sendMessage(msg.chat.id, formatPost('💬', 'WHATSAPP', cleanedPosts.whatsapp));
      await bot.sendMessage(msg.chat.id, formatPost('🐦', 'X', cleanedPosts.x));
    
  } catch (e) {
    console.log('❌ BOT ERROR:', e.message);
    await bot.sendMessage(msg.chat.id, '❌ Error processing product');
  }
});

console.log('🚀 Bot is ready with Buffer integration!');