const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load and parse YAML configuration files
 */
class ConfigLoader {
  constructor() {
    this.settingsPath = path.join(__dirname, '..', 'config');
    this.config = {};
    this.messages = {};
    this.categories = {};
  }

  /**
   * Load all configuration files
   */
  loadAll() {
    try {
      this.loadConfig();
      this.loadMessages();
      this.loadCategories();
      console.log('✅ All configuration files loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading configuration files:', error);
      return false;
    }
  }

  /**
   * Load main configuration file
   */
  loadConfig() {
    const configPath = path.join(this.settingsPath, 'config.yml');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const fileContent = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(fileContent);
    
    // Validate required fields
    this.validateConfig();
  }

  /**
   * Load messages configuration file
   */
  loadMessages() {
    const messagesPath = path.join(this.settingsPath, 'messages.yml');
    if (!fs.existsSync(messagesPath)) {
      throw new Error(`Messages file not found: ${messagesPath}`);
    }

    const fileContent = fs.readFileSync(messagesPath, 'utf8');
    this.messages = yaml.load(fileContent);
  }

  /**
   * Load categories configuration file
   */
  loadCategories() {
    const categoriesPath = path.join(this.settingsPath, 'categories.yml');
    if (!fs.existsSync(categoriesPath)) {
      throw new Error(`Categories file not found: ${categoriesPath}`);
    }

    const fileContent = fs.readFileSync(categoriesPath, 'utf8');
    this.categories = yaml.load(fileContent);
    
    // Validate categories
    this.validateCategories();
  }

  /**
   * Validate main configuration
   */
  validateConfig() {
    const required = ['guild_id', 'staff_roles', 'ticket_category', 'embed_colors', 'cooldown', 'auto_close'];
    
    for (const field of required) {
      if (!this.config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    // Validate embed colors
    const colorFields = ['primary', 'success', 'warning', 'error', 'info'];
    for (const color of colorFields) {
      if (!this.config.embed_colors[color]) {
        throw new Error(`Missing embed color: ${color}`);
      }
    }
  }

  /**
   * Validate categories configuration
   */
  validateCategories() {
    if (!this.categories || Object.keys(this.categories).length === 0) {
      throw new Error('No categories found in categories.yml');
    }

    for (const [categoryKey, category] of Object.entries(this.categories)) {
      // Check required fields
      const required = ['name', 'label', 'description', 'emoji', 'questions'];
      for (const field of required) {
        if (!category[field]) {
          throw new Error(`Category ${categoryKey} missing required field: ${field}`);
        }
      }

      // Validate questions
      if (!Array.isArray(category.questions) || category.questions.length === 0) {
        throw new Error(`Category ${categoryKey} must have at least one question`);
      }

      // Validate each question
      for (const question of category.questions) {
        this.validateQuestion(categoryKey, question);
      }
    }
  }

  /**
   * Validate individual question
   */
  validateQuestion(categoryKey, question) {
    const required = ['id', 'label', 'placeholder', 'style', 'required'];
    for (const field of required) {
      if (!question.hasOwnProperty(field)) {
        throw new Error(`Question in category ${categoryKey} missing required field: ${field}`);
      }
    }

    // Validate style
    if (![1, 2, 3].includes(question.style)) {
      throw new Error(`Question ${question.id} in category ${categoryKey} has invalid style: ${question.style}`);
    }

    // Validate options for select menu
    if (question.style === 3 && (!question.options || !Array.isArray(question.options))) {
      throw new Error(`Question ${question.id} in category ${categoryKey} is a select menu but has no options`);
    }

    // Validate options structure
    if (question.options) {
      for (const option of question.options) {
        if (!option.label || !option.value) {
          throw new Error(`Invalid option in question ${question.id} in category ${categoryKey}`);
        }
      }
    }
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    return this.getNestedValue(this.config, key, defaultValue);
  }

  /**
   * Get message value
   */
  getMessage(key, defaultValue = null) {
    return this.getNestedValue(this.messages, key, defaultValue);
  }

  /**
   * Get category by key
   */
  getCategory(key) {
    return this.categories[key] || null;
  }

  /**
   * Get all categories
   */
  getAllCategories() {
    return this.categories;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Format message with placeholders
   */
  formatMessage(key, placeholders = {}) {
    let message = this.getMessage(key, key);
    
    // Add branding placeholders
    const branding = this.config.branding || {};
    const brandingPlaceholders = {
      brand_emoji: branding.brand_emoji || '🎫',
      server_name: branding.server_name || 'Candy Community',
      server_description: branding.server_description || 'Welcome to Candy Community support system!',
      footer_text: branding.footer_text || 'Candy Community • Automated Support System',
      footer_alt: branding.footer_alt || 'Candy Community • Support System'
    };
    
    // Merge user placeholders with branding placeholders
    const allPlaceholders = { ...brandingPlaceholders, ...placeholders };
    
    for (const [placeholder, value] of Object.entries(allPlaceholders)) {
      message = message.replace(new RegExp(`{${placeholder}}`, 'g'), value);
    }
    
    return message;
  }

  /**
   * Reload all configuration files
   */
  reload() {
    console.log('🔄 Reloading configuration files...');
    return this.loadAll();
  }
}

// Create singleton instance
const configLoader = new ConfigLoader();

module.exports = configLoader; 