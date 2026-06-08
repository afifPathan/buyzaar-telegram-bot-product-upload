// productEnhancer.js - Product Data Cleaner & Enhancer

class ProductEnhancer {
  
  // ===============================
  // ENHANCE PRODUCT NAME
  // ===============================
  static enhanceName(name, description, unit) {
    if (!name || name === "Unknown Product") {
      return this.extractNameFromDescription(description);
    }
    
    let cleanName = name;
    
    // Remove quantity/size from name (move to unit)
    cleanName = cleanName.replace(/^\d+\s*[LMLKG]?\s*/i, '');
    cleanName = cleanName.replace(/\s+\d+\s*[LMLKG]/i, '');
    
    // Remove price patterns
    cleanName = cleanName.replace(/@\s?₹?\s?\d+/gi, '');
    cleanName = cleanName.replace(/₹\s?\d+/gi, '');
    cleanName = cleanName.replace(/\d+\s*\/-/gi, '');
    cleanName = cleanName.replace(/MRP\s*[:=-]?\s*₹?\s*\d+/gi, '');
    
    // Remove special characters
    cleanName = cleanName.replace(/[^\w\s-]/g, '');
    
    // Capitalize properly
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
  // PROFESSIONAL DESCRIPTION GENERATOR (FIXED)
  // ===============================
  static generateDescription(productName, price, mrp, unit, originalDescription) {
    const name = productName;
    const unitValue = parseInt(unit) || 1;
    const unitType = this.extractUnitType(unit);
    const discount = mrp && price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    
    // Extract features from original description
    const features = this.extractFeaturesFromText(originalDescription);
    
    let description = '';
    
    // ===============================
    // OPENING LINE - Based on product type
    // ===============================
    if (name.toLowerCase().includes('organiser') || name.toLowerCase().includes('organizer')) {
      description = `✨ Keep your space tidy with this ${unit} ${name}. `;
    } 
    else if (name.toLowerCase().includes('tea')) {
      description = `🍵 Start your morning right with ${name}. `;
    }
    else if (name.toLowerCase().includes('body wash') || name.toLowerCase().includes('soap')) {
      description = `🚿 Premium ${name} for a refreshing experience. `;
    }
    else {
      description = `🌟 Premium quality ${name}. `;
    }
    
    // ===============================
    // ADD FEATURES (if found in original text)
    // ===============================
    if (features.length > 0) {
      description += features.join(' ') + ' ';
    }
    
    // ===============================
    // ADD CAPACITY/QUANTITY INFO
    // ===============================
    if (unit && unit !== "1 Piece") {
      if (unitType === 'Liter' || unitType === 'ML') {
        description += `📦 Capacity: ${unit}. `;
      } else if (unitType === 'Kg' || unitType === 'Gram') {
        description += `⚖️ Weight: ${unit}. `;
      } else if (unitType === 'Pack' || unitType === 'Pieces') {
        description += `📦 Contains: ${unit}. `;
      }
    }
    
    // ===============================
    // ADD PRICE AND DISCOUNT INFO
    // ===============================
    if (mrp && mrp > price && discount > 0) {
      description += `💸 Get ${discount}% OFF! `;
    }
    
    // ===============================
    // CLOSING LINE
    // ===============================
    description += `🛒 Shop now at just ₹${price}. `;
    
    // Add urgency
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
    
    // Check for quantity/units
    const literMatch = text.match(/(\d+)\s*[Ll]/);
    if (literMatch && !features.some(f => f.includes('Liter'))) {
      features.push(`📦 ${literMatch[1]} Liters capacity`);
    }
    
    const pcMatch = text.match(/(\d+)\s*[Pp][Cc]/);
    if (pcMatch) {
      features.push(`📦 ${pcMatch[1]} pieces included`);
    }
    
    // Check for design/color
    if (lowerText.includes('transparent')) {
      features.push(`🔍 Transparent design`);
    }
    if (lowerText.includes('cartoon')) {
      features.push(`🎨 Cartoon design`);
    }
    if (lowerText.includes('multicolor') || lowerText.includes('multi-color')) {
      features.push(`🌈 Multicolor`);
    }
    
    // Check for material
    if (lowerText.includes('plastic')) {
      features.push(`♻️ Durable plastic`);
    }
    if (lowerText.includes('glass')) {
      features.push(`🥃 Premium glass`);
    }
    if (lowerText.includes('stainless')) {
      features.push(`🔩 Stainless steel`);
    }
    
    // Check for special features
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
    
    // Enhance name
    enhanced.name = this.enhanceName(product.name, product.description, product.unit);
    
    // Smart MRP calculation if not set properly
    if (!product.mrp || product.mrp === 0 || product.mrp === product.price) {
      enhanced.mrp = this.calculateMRP(product.price, enhanced.name, product.unit);
    }
    
    // ===============================
    // GENERATE PROFESSIONAL DESCRIPTION
    // ===============================
    enhanced.description = this.generateDescription(
      enhanced.name, 
      product.price, 
      enhanced.mrp, 
      product.unit, 
      product.description
    );
    
    // Fix unit
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