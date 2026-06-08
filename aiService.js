const axios = require("axios");
const ProductEnhancer = require("./productEnhancer");

// ===============================
// 1. TEXT SANITIZER CLASS
// ===============================
class TextUtil {
  static safe(input) {
    if (!input) return "";
    if (typeof input === "string") return input;
    if (typeof input === "object") {
      return (
        input.text ||
        input.message ||
        input.caption ||
        Object.values(input).join("\n") ||
        JSON.stringify(input)
      );
    }
    return String(input);
  }

  static lines(text) {
    return this.safe(text)
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);
  }
}

// ===============================
// 2. IMPROVED PRICE EXTRACTOR
// ===============================
class PriceUtil {
  static extract(text) {
    text = TextUtil.safe(text);
    
    console.log("🔍 Extracting price from:", text.substring(0, 100));
    
    // Pattern 1: Starts @100
    let match = text.match(/@\s?(\d+)/i);
    if (match) {
      console.log("✅ Pattern 1 matched (@ symbol):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 2: Starts from 100
    match = text.match(/(?:starts?|from)\s+@?\s?(\d+)/i);
    if (match) {
      console.log("✅ Pattern 2 matched (starts from):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 3: ₹100
    match = text.match(/₹\s?(\d+)/);
    if (match) {
      console.log("✅ Pattern 3 matched (₹ symbol):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 4: 100/-
    match = text.match(/(\d+)\s*\/-/);
    if (match) {
      console.log("✅ Pattern 4 matched (/-):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 5: Rs. 100
    match = text.match(/rs\.?\s?(\d+)/i);
    if (match) {
      console.log("✅ Pattern 5 matched (Rs.):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 6: Price: 100
    match = text.match(/price[:\s-]+(\d+)/i);
    if (match) {
      console.log("✅ Pattern 6 matched (Price:):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 7: 100 only
    match = text.match(/(\d+)\s*only/i);
    if (match) {
      console.log("✅ Pattern 7 matched (only):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 8: Any standalone number
    const urlPattern = /https?:\/\/[^\s]+/g;
    const textWithoutUrls = text.replace(urlPattern, '');
    const numbers = textWithoutUrls.match(/\b(\d{2,5})\b/g);
    if (numbers && numbers.length > 0) {
      const validPrices = numbers.map(Number).filter(p => p >= 10 && p <= 99999);
      if (validPrices.length > 0) {
        console.log("✅ Pattern 8 matched (standalone number):", validPrices[0]);
        return Math.min(...validPrices);
      }
    }
    
    console.log("❌ No price pattern matched");
    return 0;
  }
  
  // ===============================
  // NEW: EXTRACT MRP FROM TEXT
  // ===============================
  static extractMRP(text) {
    text = TextUtil.safe(text);
    
    console.log("🔍 Extracting MRP from text...");
    
    // Pattern 1: MRP: ₹100, MRP ₹100, MRP-100
    let match = text.match(/MRP\s*[:=-]?\s*₹?\s*(\d+)/i);
    if (match) {
      console.log("✅ MRP found (MRP: pattern):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 2: Maximum Retail Price: ₹100
    match = text.match(/maximum\s+retail\s+price\s*[:=-]?\s*₹?\s*(\d+)/i);
    if (match) {
      console.log("✅ MRP found (Maximum Retail Price):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 3: M.R.P. ₹100, M.R.P.: ₹100
    match = text.match(/M\.?R\.?P\.?\s*[:=-]?\s*₹?\s*(\d+)/i);
    if (match) {
      console.log("✅ MRP found (M.R.P. pattern):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 4: Was ₹100, Now ₹50 (then MRP is the 'was' price)
    match = text.match(/was\s*[:=-]?\s*₹?\s*(\d+)/i);
    if (match) {
      console.log("✅ MRP found (was pattern):", match[1]);
      return parseInt(match[1]);
    }
    
    // Pattern 5: Original Price: ₹100
    match = text.match(/original\s+price\s*[:=-]?\s*₹?\s*(\d+)/i);
    if (match) {
      console.log("✅ MRP found (original price):", match[1]);
      return parseInt(match[1]);
    }
    
    console.log("❌ No MRP found in text");
    return null; // Return null if not found
  }
}

// ===============================
// 3. IMAGE HANDLER
// ===============================
class ImageUtil {
  static async upload(imageUrl) {
    if (!imageUrl || typeof imageUrl !== "string") {
      return "";
    }
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 10000
      });
      const base64 = Buffer.from(response.data).toString("base64");
      const formData = new URLSearchParams();
      formData.append("image", base64);
      const res = await axios.post(
        `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
        formData,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return res?.data?.data?.url || "";
    } catch (err) {
      console.log("IMAGE ERROR:", err.message);
      return "";
    }
  }
}

// ===============================
// 4. PRODUCT BUILDER CLASS
// ===============================
class ProductBuilder {
  static generateId() {
    return "prod" + Date.now();
  }

  static extractName(lines) {
    let name = lines?.[0] || "";
    
    if (!name) return "Special Product";
    
    // Remove URLs
    name = name.replace(/https?:\/\/\S+/gi, "");
    
    // Remove ALL price patterns
    name = name.replace(/@\s?₹?\s?\d+(\+\d+\s*[A-Z]{2})?/gi, "");
    name = name.replace(/₹\s?\d+/gi, "");
    name = name.replace(/\d+\s*\/-/gi, "");
    name = name.replace(/\d+\s*[A-Z]{2}\b/gi, "");
    name = name.replace(/MRP\s*[:=-]?\s*₹?\s*\d+/gi, "");
    name = name.replace(/was\s*[:=-]?\s*₹?\s*\d+/gi, "");
    
    // Remove trigger words
    name = name.replace(/\b(starts?|from|only|just|@|new|hot|deal)\b/gi, "");
    
    // Remove special characters
    name = name.replace(/[^\w\s-]/g, "");
    
    // Clean extra spaces
    name = name.replace(/\s+/g, " ").trim();
    
    // If name is still weird, take first 3-4 words
    const words = name.split(' ');
    if (words.length > 4) {
      name = words.slice(0, 4).join(' ');
    }
    
    // Capitalize properly
    name = name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    return name || "Special Product";
  }

  static detectUnit(text) {
    text = TextUtil.safe(text).toLowerCase();
    
    const patterns = [
      { r: /(\d+)\s?l\b/, f: v => `${v} Liter` },
      { r: /(\d+)\s?ml\b/, f: v => `${v} ML` },
      { r: /(\d+)\s?kg\b/, f: v => `${v} Kg` },
      { r: /(\d+)\s?g\b/, f: v => `${v} Gram` },
      { r: /(\d+)\s?pcs?\b/, f: v => `${v} Pieces` },
      { r: /bottle|pack/, f: () => `1 Pack` }
    ];
    
    for (let p of patterns) {
      const m = text.match(p.r);
      if (m) return p.f(m[1]);
    }
    
    return "1 Piece";
  }
}

// ===============================
// 5. MAIN AI SERVICE CLASS
// ===============================
class AIService {
  static async extractProduct({ text, imageUrl = "" }) {
    const safeText = TextUtil.safe(text);
    const lines = TextUtil.lines(safeText);
    
    // Extract price
    const price = PriceUtil.extract(safeText);
    console.log(`💰 Final price detected: ₹${price}`);
    
    // ===============================
    // EXTRACT MRP FROM TEXT (NEW)
    // ===============================
    let mrp = PriceUtil.extractMRP(safeText);
    
    // If MRP not found in text, calculate dynamically
    if (mrp === null) {
      console.log("⚙️ MRP not found in message, using dynamic calculation");
      mrp = price ? price + 20 : 0;  // Default: price + 20
      
      // Adjust based on price range
      if (price && price < 50) {
        mrp = price + 10;  // Small items: +10
      } else if (price && price > 500) {
        mrp = Math.round(price * 1.15);  // Expensive items: +15%
      } else if (price && price > 1000) {
        mrp = Math.round(price * 1.10);  // Very expensive: +10%
      } else if (price && price >= 50 && price <= 500) {
        mrp = price + 20;  // Medium items: +20
      }
    } else {
      console.log(`✅ MRP found in message: ₹${mrp}`);
    }
    
    // Round MRP to look realistic
    if (mrp && mrp % 10 === 0) {
      mrp = mrp - 1;  // 60 -> 59
    }
    
    const uploadedImage = await ImageUtil.upload(imageUrl);
    const name = ProductBuilder.extractName(lines);
    const unit = ProductBuilder.detectUnit(safeText);
    
    // Create base product
    let product = {
      id: ProductBuilder.generateId(),
      name: name,
      price: price,
      mrp: mrp || 0,
      imageUrl: uploadedImage || imageUrl,
      description: safeText.substring(0, 500),
      unit: unit,
      inStock: true,
      category: "store"
    };
    
    // ===============================
    // ENHANCE PRODUCT DATA
    // ===============================
    product = ProductEnhancer.enhanceProduct(product);
    
    console.log("📦 Final Product:", {
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      unit: product.unit
    });
    
    return product;
  }
}

module.exports = AIService;