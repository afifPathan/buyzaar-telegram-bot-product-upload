// productEnhancer.js - Product Data Cleaner & Enhancer
// WITH DETAILED API ERROR LOGGING

const axios = require('axios');
const FormData = require('form-data');

class ProductEnhancer {

  // ============================================
  // API KEY VALIDATION HELPER
  // ============================================
  static validateApiKey(keyName, keyValue) {
    console.log(`🔑 ${keyName}: ${keyValue ? keyValue.substring(0, 10) + '...' : '❌ MISSING'}`);
    if (!keyValue) {
      console.error(`❌ ERROR: ${keyName} is missing in .env file`);
      return false;
    }
    return true;
  }
 

  // ============================================
  // IMAGE UPLOAD WITH ERROR LOGGING
  // ============================================
  static async uploadImage(imageBuffer, filename = 'product.jpg') {
    console.log('\n📸 ===== IMAGE UPLOAD START =====');
    console.log(`📁 File: ${filename}`);
    console.log(`📦 Buffer size: ${imageBuffer ? imageBuffer.length : '❌ NO BUFFER'} bytes`);

    const apiKey = process.env.IMGBB_API_KEY;
    this.validateApiKey('IMGBB_API_KEY', apiKey);

    if (!apiKey) {
      console.error('📸 ===== IMAGE UPLOAD END =====\n');
      return {
        success: false,
        error: 'IMGBB_API_KEY_MISSING',
        message: 'ImgBB API key not found. Please add IMGBB_API_KEY to .env file'
      };
    }

    try {
      const formData = new FormData();
      formData.append('image', imageBuffer.toString('base64'));
      formData.append('key', apiKey);

      console.log('📤 Uploading to ImgBB...');

      const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      console.log('✅ IMAGE UPLOAD SUCCESS');
      console.log(`🔗 URL: ${response.data.data.url}`);
      console.log('📸 ===== IMAGE UPLOAD END =====\n');

      return {
        success: true,
        url: response.data.data.url,
        thumb: response.data.data.thumb?.url,
        delete_url: response.data.data.delete_url
      };

    } catch (error) {
      console.error('\n❌ ===== IMAGE UPLOAD FAILED =====');

      if (error.response) {
        console.error(`📊 Status: ${error.response.status}`);
        console.error(`📝 Response Data:`, JSON.stringify(error.response.data, null, 2));

        if (error.response.status === 400) {
          const errorMsg = error.response.data?.error?.message || '';
          console.error('🔍 LIKELY CAUSE:');
          if (errorMsg.includes('invalid API key')) {
            console.error('   ❌ ImgBB API key is INVALID or EXPIRED');
            console.error('💡 SOLUTION: Get new key from https://api.imgbb.com/');
          } else if (errorMsg.includes('image')) {
            console.error('   ❌ Image format not supported or corrupted');
          } else {
            console.error(`   ❌ ${errorMsg}`);
          }
        } else if (error.response.status === 401) {
          console.error('🔍 LIKELY CAUSE: Unauthorized - API key is invalid');
          console.error('💡 SOLUTION: Get new key from https://api.imgbb.com/');
        } else if (error.response.status === 429) {
          console.error('🔍 LIKELY CAUSE: Rate limit exceeded');
          console.error('💡 SOLUTION: Wait a few minutes and try again');
        }
      } else if (error.request) {
        console.error('🌐 No response received from ImgBB server');
        console.error('💡 SOLUTION: Check internet connection');
      } else {
        console.error(`❌ Error Message: ${error.message}`);
        console.error('💡 SOLUTION: Check axios configuration');
      }

      console.error('📸 ===== IMAGE UPLOAD END =====\n');

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        status: error.response?.status,
        details: error.response?.data
      };
    }
  }

  // ============================================
  // ENHANCE NAME
  // ============================================
  static enhanceName(name, description, unit) {
    if (!name || name === "Unknown Product") {
      return this.extractNameFromDescription(description);
    }

    let cleanName = name;

    cleanName = cleanName.replace(/^\d+\s*[LMLKG]?\s*/i, '');
    cleanName = cleanName.replace(/\s+\d+\s*[LMLKG]/i, '');
    cleanName = cleanName.replace(/@\s?₹?\s?\d+/gi, '');
    cleanName = cleanName.replace(/₹\s?\d+/gi, '');
    cleanName = cleanName.replace(/\d+\s*\/-/gi, '');
    cleanName = cleanName.replace(/MRP\s*[:=-]?\s*₹?\s*\d+/gi, '');
    cleanName = cleanName.replace(/[^\w\s-]/g, '');

    cleanName = cleanName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();

    return cleanName || "Premium Product";
  }

  // ===============================
  // EXTRACT NAME FROM DESCRIPTION
  // ===============================
  static extractNameFromDescription(description) {
    if (!description) return "Product";

    const firstLine = description.split('\n')[0];
    let name = firstLine.replace(/https?:\/\/\S+/gi, '');
    name = name.replace(/^\d+\s*[LMLKG]?\s*/i, '');
    name = name.replace(/[^\w\s-]/g, '');
    name = name.trim();

    return name || "Product";
  }

  // ===============================
  // CALCULATE SMART MRP
  // ===============================
  static calculateMRP(price, productName, unit) {
    if (!price || price === 0) return 0;

    const name = productName.toLowerCase();
    const unitLower = unit.toLowerCase();

    let markupPercent = 20;

    if (name.includes('cable') || name.includes('charger')) {
      markupPercent = 10;
    } else if (name.includes('premium') || name.includes('luxury')) {
      markupPercent = 35;
    } else if (unitLower.includes('pack') || parseInt(unit) > 10) {
      markupPercent = 15;
    } else if (unitLower.includes('piece') && price < 100) {
      markupPercent = 25;
    }

    let mrp = Math.round(price * (1 + markupPercent / 100));

    if (mrp % 10 === 0) {
      mrp = mrp - 0;
    }

    return mrp;
  }

  // ===============================
  // GENERATE DESCRIPTION (WITHOUT API)
  // ===============================
  static generateDescription(productName, price, mrp, unit, originalDescription) {
    const name = productName;
    const unitType = this.extractUnitType(unit);
    const discount = mrp && price ? Math.round(((mrp - price) / mrp) * 100) : 0;

    const features = this.extractFeaturesFromText(originalDescription);

    let description = '';

    if (name.toLowerCase().includes('organiser') || name.toLowerCase().includes('organizer')) {
      description = `✨ Keep your space tidy with this ${unit} ${name}. `;
    } else if (name.toLowerCase().includes('tea')) {
      description = `🍵 Start your morning right with ${name}. `;
    } else if (name.toLowerCase().includes('body wash') || name.toLowerCase().includes('soap')) {
      description = `🚿 Premium ${name} for a refreshing experience. `;
    } else {
      description = `🌟 Premium quality ${name}. `;
    }

    if (features.length > 0) {
      description += features.join(' ') + ' ';
    }

    if (unit && unit !== "1 Piece") {
      if (unitType === 'Liter' || unitType === 'ML') {
        description += `📦 Capacity: ${unit}. `;
      } else if (unitType === 'Kg' || unitType === 'Gram') {
        description += `⚖️ Weight: ${unit}. `;
      } else if (unitType === 'Pack' || unitType === 'Pieces') {
        description += `📦 Contains: ${unit}. `;
      }
    }

    if (mrp && mrp > price && discount > 0) {
      description += `💸 Get ${discount}% OFF! `;
    }

    description += `🛒 Shop now at just ₹${price}. `;

    const urgencyPhrases = [
      "Limited stock available!",
      "Hurry, while stocks last!",
      "Grab yours today!",
      "Don't miss this deal!"
    ];
    const randomUrgency = urgencyPhrases[Math.floor(Math.random() * urgencyPhrases.length)];
    description += randomUrgency;

    return description;
  }

  // ===============================
  // EXTRACT FEATURES FROM RAW TEXT
  // ===============================
  static extractFeaturesFromText(text) {
    if (!text) return [];

    const features = [];
    const lowerText = text.toLowerCase();

    const literMatch = text.match(/(\d+)\s*[Ll]/);
    if (literMatch && !features.some(f => f.includes('Liter'))) {
      features.push(`📦 ${literMatch[1]} Liters capacity`);
    }

    const pcMatch = text.match(/(\d+)\s*[Pp][Cc]/);
    if (pcMatch) {
      features.push(`📦 ${pcMatch[1]} pieces included`);
    }

    if (lowerText.includes('transparent')) {
      features.push(`🔍 Transparent design`);
    }
    if (lowerText.includes('cartoon')) {
      features.push(`🎨 Cartoon design`);
    }
    if (lowerText.includes('multicolor') || lowerText.includes('multi-color')) {
      features.push(`🌈 Multicolor`);
    }
    if (lowerText.includes('plastic')) {
      features.push(`♻️ Durable plastic`);
    }
    if (lowerText.includes('glass')) {
      features.push(`🥃 Premium glass`);
    }
    if (lowerText.includes('stainless')) {
      features.push(`🔩 Stainless steel`);
    }
    if (lowerText.includes('leak proof') || lowerText.includes('leakproof')) {
      features.push(`💧 Leak-proof`);
    }
    if (lowerText.includes('airtight')) {
      features.push(`🔒 Airtight seal`);
    }
    if (lowerText.includes('bfree') || lowerText.includes('bpa free')) {
      features.push(`✅ BPA free`);
    }

    return features;
  }

  // ===============================
  // EXTRACT UNIT TYPE
  // ===============================
  static extractUnitType(unit) {
    if (!unit) return 'Piece';
    if (unit.includes('Liter')) return 'Liter';
    if (unit.includes('ML')) return 'ML';
    if (unit.includes('Kg')) return 'Kg';
    if (unit.includes('Gram')) return 'Gram';
    if (unit.includes('Pack')) return 'Pack';
    if (unit.includes('Pieces')) return 'Pieces';
    return 'Piece';
  }

  // ===============================
  // DETECT UNIT PROPERLY
  // ===============================
  static detectUnit(text, price) {
    text = (text || '').toLowerCase();

    const literMatch = text.match(/(\d+)\s*l\b/);
    if (literMatch) return `${literMatch[1]} Liters`;

    const mlMatch = text.match(/(\d+)\s*ml\b/);
    if (mlMatch) return `${mlMatch[1]} ML`;

    const kgMatch = text.match(/(\d+)\s*kg\b/);
    if (kgMatch) return `${kgMatch[1]} Kg`;

    const gramMatch = text.match(/(\d+)\s*g\b/);
    if (gramMatch) return `${gramMatch[1]} Gram`;

    const pcMatch = text.match(/(\d+)\s*pc/i);
    if (pcMatch) return `${pcMatch[1]} Pieces`;

    const packMatch = text.match(/pack/i);
    if (packMatch) return `1 Pack`;

    if (price && price < 50) return "1 Piece";

    return "1 Piece";
  }

  // ===============================
  // MAIN ENHANCE FUNCTION
  // ===============================
  static enhanceProduct(product) {
    console.log('🔧 Enhancing product data...');

    const enhanced = { ...product };

    enhanced.name = this.enhanceName(product.name, product.description, product.unit);

    if (!product.mrp || product.mrp === 0 || product.mrp === product.price) {
      enhanced.mrp = this.calculateMRP(product.price, enhanced.name, product.unit);
    }

    enhanced.description = this.generateDescription(
      enhanced.name,
      product.price,
      enhanced.mrp,
      product.unit,
      product.description
    );

    if (!product.unit || product.unit === "1 Piece") {
      enhanced.unit = this.detectUnit(product.description, product.price);
    }

    console.log('✨ Enhanced:', {
      name: enhanced.name,
      price: enhanced.price,
      mrp: enhanced.mrp,
      unit: enhanced.unit,
      description: enhanced.description.substring(0, 80) + '...'
    });

    return enhanced;
  }
}

module.exports = ProductEnhancer;