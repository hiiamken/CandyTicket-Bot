const fs = require('fs');
const path = require('path');
const { SQLiteTicketModel, SQLiteCooldownModel, SQLiteSettingsModel } = require('./models/SQLiteModels');

/**
 * Database Manager - Supports multiple database types
 * Default: SQLite (lightweight, no setup required)
 * Options: MongoDB, PostgreSQL, MySQL
 */
class DatabaseManager {
  constructor(configLoader) {
    this.configLoader = configLoader;
    this.dbType = configLoader.get('database.type', 'sqlite');
    this.connection = null;
    this.models = {};
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      console.log(`🗄️ Initializing ${this.dbType.toUpperCase()} database...`);
      
      switch (this.dbType) {
        case 'sqlite':
          await this.initializeSQLite();
          break;
        case 'mongodb':
          await this.initializeMongoDB();
          break;
        case 'postgresql':
          await this.initializePostgreSQL();
          break;
        case 'mysql':
          await this.initializeMySQL();
          break;
        default:
          throw new Error(`Unsupported database type: ${this.dbType}`);
      }
      
      console.log(`✅ ${this.dbType.toUpperCase()} database initialized successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.dbType} database:`, error);
      return false;
    }
  }

  /**
   * Initialize SQLite database (default)
   */
  async initializeSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');
    
    const config = this.configLoader.get('database.sqlite');
    const dbPath = path.join(process.cwd(), config.file);
    
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Open database connection
    this.connection = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Enable WAL mode for better performance
    if (config.wal_mode) {
      await this.connection.exec('PRAGMA journal_mode = WAL');
    }
    
    // Create tables
    await this.createSQLiteTables();
    
    // Initialize models
    this.models = {
      tickets: new SQLiteTicketModel(this.connection),
      cooldowns: new SQLiteCooldownModel(this.connection),
      settings: new SQLiteSettingsModel(this.connection)
    };
  }

  /**
   * Initialize MongoDB database
   */
  async initializeMongoDB() {
    const mongoose = require('mongoose');
    
    const config = this.configLoader.get('database.mongodb');
    
    // Connect to MongoDB
    await mongoose.connect(config.uri, config.options);
    
    this.connection = mongoose.connection;
    
    // Initialize models
    this.models = {
      tickets: require('./models/MongoTicketModel'),
      cooldowns: require('./models/MongoCooldownModel'),
      settings: require('./models/MongoSettingsModel')
    };
  }

  /**
   * Initialize PostgreSQL database
   */
  async initializePostgreSQL() {
    const { Pool } = require('pg');
    
    const config = this.configLoader.get('database.postgresql');
    
    // Create connection pool
    this.connection = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ...config.pool
    });
    
    // Test connection
    await this.connection.query('SELECT NOW()');
    
    // Create tables
    await this.createPostgreSQLTables();
    
    // Initialize models
    this.models = {
      tickets: new PostgreSQLTicketModel(this.connection),
      cooldowns: new PostgreSQLCooldownModel(this.connection),
      settings: new PostgreSQLSettingsModel(this.connection)
    };
  }

  /**
   * Initialize MySQL database
   */
  async initializeMySQL() {
    const mysql = require('mysql2/promise');
    
    const config = this.configLoader.get('database.mysql');
    
    // Create connection pool
    this.connection = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ...config.pool
    });
    
    // Test connection
    await this.connection.query('SELECT NOW()');
    
    // Create tables
    await this.createMySQLTables();
    
    // Initialize models
    this.models = {
      tickets: new MySQLTicketModel(this.connection),
      cooldowns: new MySQLCooldownModel(this.connection),
      settings: new MySQLSettingsModel(this.connection)
    };
  }

  /**
   * Create SQLite tables
   */
  async createSQLiteTables() {
    // Tickets table
    await this.connection.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        closed_by TEXT,
        form_data TEXT,
        thread_id TEXT,
        guild_id TEXT NOT NULL
      )
    `);

    // Cooldowns table
    await this.connection.exec(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        UNIQUE(user_id, type)
      )
    `);

    // Settings table
    await this.connection.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await this.connection.exec(`
      CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON tickets(guild_id);
      CREATE INDEX IF NOT EXISTS idx_cooldowns_user_id ON cooldowns(user_id);
      CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at);
    `);
  }

  /**
   * Create PostgreSQL tables
   */
  async createPostgreSQLTables() {
    // Tickets table
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        closed_by VARCHAR(255),
        form_data JSONB,
        thread_id VARCHAR(255),
        guild_id VARCHAR(255) NOT NULL
      )
    `);

    // Cooldowns table
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        UNIQUE(user_id, type)
      )
    `);

    // Settings table
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await this.connection.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON tickets(guild_id);
      CREATE INDEX IF NOT EXISTS idx_cooldowns_user_id ON cooldowns(user_id);
      CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at);
    `);
  }

  /**
   * Create MySQL tables
   */
  async createMySQLTables() {
    // Tickets table
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        closed_by VARCHAR(255),
        form_data JSON,
        thread_id VARCHAR(255),
        guild_id VARCHAR(255) NOT NULL
      )
    `);

    // Cooldowns table
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        UNIQUE KEY unique_user_type (user_id, type)
      )
    `);

    // Settings table
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await this.connection.query(`
      CREATE INDEX idx_tickets_user_id ON tickets(user_id);
      CREATE INDEX idx_tickets_status ON tickets(status);
      CREATE INDEX idx_tickets_guild_id ON tickets(guild_id);
      CREATE INDEX idx_cooldowns_user_id ON cooldowns(user_id);
      CREATE INDEX idx_cooldowns_expires ON cooldowns(expires_at);
    `);
  }

  /**
   * Get database model
   */
  getModel(name) {
    return this.models[name];
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.connection) {
      if (this.dbType === 'sqlite') {
        await this.connection.close();
      } else if (this.dbType === 'mongodb') {
        await this.connection.close();
      } else {
        await this.connection.end();
      }
    }
  }
}

module.exports = DatabaseManager; 