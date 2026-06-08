const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ===============================
// CLEAN PRODUCT NAME FUNCTION
// ===============================

function cleanProductName(name, originalText) {
  if (!name) return "Special Product";
  
  // Remove price patterns
  let clean = name
    .replace(/@\s?₹?\s?\d+(\+\d+\s*SC)?/gi, '')
    .replace(/₹\s?\d+/gi, '')
    .replace(/\d+\s*\/-/gi, '')
    .replace(/\b(starts?|from|only|just|@)\b/gi, '')
    .replace(/\s+\d+\s*Sc$/i, '')
    .replace(/\s+\d+\s*ML$/i, '')
    .replace(/\s+\d+\s*Gram$/i, '')
    .replace(/\s+\d+\s*Kg$/i, '')
    .trim();
  
  // If name is too short or empty, try to extract from original text
  if (clean.length < 3 && originalText) {
    // Get first line and clean it
    const firstLine = originalText.split('\n')[0] || '';
    clean = firstLine
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/@\s?₹?\s?\d+/gi, '')
      .replace(/₹\s?\d+/gi, '')
      .replace(/\b(starts?|from|only|just)\b/gi, '')
      .trim();
  }
  
  // Capitalize properly
  clean = clean.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return clean || "Special Product";
}

// ===============================
// TRENDING POST GENERATOR
// ===============================

async function generateSocialPosts(product, productLink) {
  try {
    // First, clean the product name properly
    const cleanName = cleanProductName(product.name, product.description);
    product.cleanName = cleanName;
    
    console.log(`📝 Original name: ${product.name}`);
    console.log(`✨ Clean name: ${cleanName}`);

    const prompt = `
Create professional social media posts using the provided product information.

PRODUCT DETAILS
━━━━━━━━━━━━━━━━━━━━━
Product Name: ${cleanName}
Price: ${product.price}
Unit: ${product.unit}

Description:
${product.fullDescription || product.description}

Product Link:
${productLink}
━━━━━━━━━━━━━━━━━━━━━

Requirements:

INSTAGRAM:
- Product Name as title
- Use provided description
- Mention price
- Add CTA
- Add 8-12 relevant hashtags

FACEBOOK:
- Product Name
- Description
- Price
- CTA
- 5-8 hashtags

WHATSAPP:
- Product Name
- Description
- Price
- CTA
- Keep readable

X:
- Product Name
- Short description
- Price
- CTA
- 3-5 hashtags

IMPORTANT:
- Use actual product description
- Do not create fake features
- Do not use POV
- Do not use Main Character Energy
- Do not use Don't Sleep On This
- Do not use fake urgency
- Do not use clickbait
- Return ONLY JSON

Format:

{
  "instagram": "",
  "facebook": "",
  "whatsapp": "",
  "x": ""
}
`;

    const chat = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a viral social media expert. Return ONLY valid JSON. No explanations. Make posts engaging and trendy.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.9,  // Higher for creativity
      max_tokens: 800
    });

    let text = chat.choices[0].message.content;
    
    // Clean response
    text = text.replace(/```json\s*/gi, '');
    text = text.replace(/```\s*/g, '');
    text = text.trim();
    
    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    const parsed = JSON.parse(text);
    
    // Inject clean product name into posts if missing
    const result = {
      instagram: (parsed.instagram || '').replace(/Product Name/g, cleanName),
      facebook: (parsed.facebook || '').replace(/Product Name/g, cleanName),
      whatsapp: (parsed.whatsapp || '').replace(/Product Name/g, cleanName),
      x: (parsed.x || '').replace(/Product Name/g, cleanName)
    };
    
    return result;

  } catch (e) {
    console.log('❌ GROQ ERROR:', e.message);
    return getTrendingFallbackPosts(product, productLink);
  }
}

// ===============================
// TRENDING FALLBACK POSTS
// ===============================

function getTrendingFallbackPosts(product, productLink) {

  const name =
    product.cleanName ||
    cleanProductName(product.name, product.description);

  const description =
    product.fullDescription ||
    product.description ||
    "";

  const price = product.price || "0";

  return {

    instagram: `${name}

${description}

💰 Price: ${price}

🛒 Order Now

${productLink}

#Buyzaar #Shopping #Deals #OnlineShopping #TrendingProducts`,

    facebook: `${name}

${description}

💰 Price: ${price}

🛒 Order Now

${productLink}

#Buyzaar #Deals #Shopping #OnlineStore #TrendingProducts`,

    whatsapp: `${name}

${description}

💰 Price: ${price}

🛒 Order Now

${productLink}`,

    x: `${name}

${description}

💰 Price: ${price}

${productLink}

#Buyzaar #Deals #Shopping`

  };
}

module.exports = {
  generateSocialPosts,
  cleanProductName  // Export for testing
};