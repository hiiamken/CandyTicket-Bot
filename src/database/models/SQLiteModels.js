/**
 * SQLite Models for CandyTicket Bot
 */

/**
 * SQLite Ticket Model
 */
class SQLiteTicketModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new ticket
   */
  async create(ticketData) {
    const {
      ticketId,
      userId,
      category,
      formData,
      threadId,
      guildId
    } = ticketData;

    const result = await this.db.run(`
      INSERT INTO tickets (ticket_id, user_id, category, form_data, thread_id, guild_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [ticketId, userId, category, JSON.stringify(formData), threadId, guildId]);

    return {
      id: result.lastID,
      ticketId,
      userId,
      category,
      status: 'open',
      formData,
      threadId,
      guildId,
      createdAt: new Date()
    };
  }

  /**
   * Get ticket by ID
   */
  async getById(ticketId) {
    const ticket = await this.db.get(`
      SELECT * FROM tickets WHERE ticket_id = ?
    `, [ticketId]);

    if (ticket) {
      ticket.formData = JSON.parse(ticket.formData || '{}');
    }

    return ticket;
  }

  /**
   * Get tickets by user ID
   */
  async getByUserId(userId, guildId) {
    const tickets = await this.db.all(`
      SELECT * FROM tickets 
      WHERE user_id = ? AND guild_id = ?
      ORDER BY created_at DESC
    `, [userId, guildId]);

    return tickets.map(ticket => ({
      ...ticket,
      formData: JSON.parse(ticket.formData || '{}')
    }));
  }

  /**
   * Get open tickets by user ID
   */
  async getOpenTicketsByUserId(userId, guildId) {
    const tickets = await this.db.all(`
      SELECT * FROM tickets 
      WHERE user_id = ? AND guild_id = ? AND status = 'open'
      ORDER BY created_at DESC
    `, [userId, guildId]);

    return tickets.map(ticket => ({
      ...ticket,
      formData: JSON.parse(ticket.formData || '{}')
    }));
  }

  /**
   * Get all tickets by guild ID
   */
  async getByGuildId(guildId, status = null) {
    let query = `
      SELECT * FROM tickets 
      WHERE guild_id = ?
      ORDER BY created_at DESC
    `;
    let params = [guildId];

    if (status) {
      query = query.replace('WHERE guild_id = ?', 'WHERE guild_id = ? AND status = ?');
      params.push(status);
    }

    const tickets = await this.db.all(query, params);

    return tickets.map(ticket => ({
      ...ticket,
      formData: JSON.parse(ticket.formData || '{}')
    }));
  }

  /**
   * Update ticket status
   */
  async updateStatus(ticketId, status, closedBy = null) {
    const updateData = {
      status,
      closed_at: status === 'closed' ? new Date().toISOString() : null,
      closed_by: closedBy
    };

    await this.db.run(`
      UPDATE tickets 
      SET status = ?, closed_at = ?, closed_by = ?
      WHERE ticket_id = ?
    `, [updateData.status, updateData.closed_at, updateData.closed_by, ticketId]);

    return this.getById(ticketId);
  }

  /**
   * Get ticket statistics
   */
  async getStatistics(guildId) {
    const stats = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
      FROM tickets 
      WHERE guild_id = ?
    `, [guildId]);

    const categoryStats = await this.db.all(`
      SELECT 
        category,
        COUNT(*) as count
      FROM tickets 
      WHERE guild_id = ?
      GROUP BY category
    `, [guildId]);

    return {
      total: stats.total,
      open: stats.open,
      closed: stats.closed,
      byCategory: categoryStats
    };
  }

  /**
   * Delete old closed tickets
   */
  async deleteOldTickets(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.db.run(`
      DELETE FROM tickets 
      WHERE status = 'closed' AND closed_at < ?
    `, [cutoffDate.toISOString()]);

    return result.changes;
  }
}

/**
 * SQLite Cooldown Model
 */
class SQLiteCooldownModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Set cooldown for user
   */
  async setCooldown(userId, type, expiresAt) {
    await this.db.run(`
      INSERT OR REPLACE INTO cooldowns (user_id, type, expires_at)
      VALUES (?, ?, ?)
    `, [userId, type, expiresAt.toISOString()]);
  }

  /**
   * Get cooldown for user
   */
  async getCooldown(userId, type) {
    const cooldown = await this.db.get(`
      SELECT * FROM cooldowns 
      WHERE user_id = ? AND type = ? AND expires_at > ?
    `, [userId, type, new Date().toISOString()]);

    return cooldown;
  }

  /**
   * Clear expired cooldowns
   */
  async clearExpiredCooldowns() {
    const result = await this.db.run(`
      DELETE FROM cooldowns 
      WHERE expires_at < ?
    `, [new Date().toISOString()]);

    return result.changes;
  }

  /**
   * Clear cooldown for user
   */
  async clearCooldown(userId, type) {
    await this.db.run(`
      DELETE FROM cooldowns 
      WHERE user_id = ? AND type = ?
    `, [userId, type]);
  }
}

/**
 * SQLite Settings Model
 */
class SQLiteSettingsModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Set setting value
   */
  async set(key, value) {
    await this.db.run(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `, [key, JSON.stringify(value), new Date().toISOString()]);
  }

  /**
   * Get setting value
   */
  async get(key, defaultValue = null) {
    const setting = await this.db.get(`
      SELECT value FROM settings WHERE key = ?
    `, [key]);

    if (setting) {
      try {
        return JSON.parse(setting.value);
      } catch {
        return setting.value;
      }
    }

    return defaultValue;
  }

  /**
   * Delete setting
   */
  async delete(key) {
    await this.db.run(`
      DELETE FROM settings WHERE key = ?
    `, [key]);
  }

  /**
   * Get all settings
   */
  async getAll() {
    const settings = await this.db.all(`
      SELECT key, value FROM settings
    `);

    const result = {};
    for (const setting of settings) {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch {
        result[setting.key] = setting.value;
      }
    }

    return result;
  }
}

module.exports = {
  SQLiteTicketModel,
  SQLiteCooldownModel,
  SQLiteSettingsModel
}; 