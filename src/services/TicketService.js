const { v4: uuidv4 } = require('uuid');

/**
 * Ticket Service - Manages ticket operations with database
 */
class TicketService {
  constructor(dbManager) {
    this.db = dbManager;
    this.ticketModel = dbManager.getModel('tickets');
    this.cooldownModel = dbManager.getModel('cooldowns');
  }

  /**
   * Create a new ticket
   */
  async createTicket(userId, category, formData, threadId, guildId) {
    try {
      const ticketId = `TICKET-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      const ticketData = {
        ticketId,
        userId,
        category,
        formData,
        threadId,
        guildId
      };

      const ticket = await this.ticketModel.create(ticketData);
      
      // Set cooldown for user
      const cooldownTime = new Date();
      cooldownTime.setMinutes(cooldownTime.getMinutes() + 5); // 5 minutes
      await this.cooldownModel.setCooldown(userId, 'ticket_creation', cooldownTime);

      return ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId) {
    try {
      return await this.ticketModel.getById(ticketId);
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId, guildId) {
    try {
      return await this.ticketModel.getByUserId(userId, guildId);
    } catch (error) {
      console.error('Error getting user tickets:', error);
      throw error;
    }
  }

  /**
   * Get user's open tickets
   */
  async getUserOpenTickets(userId, guildId) {
    try {
      return await this.ticketModel.getOpenTicketsByUserId(userId, guildId);
    } catch (error) {
      console.error('Error getting user open tickets:', error);
      throw error;
    }
  }

  /**
   * Get all tickets for guild
   */
  async getGuildTickets(guildId, status = null) {
    try {
      return await this.ticketModel.getByGuildId(guildId, status);
    } catch (error) {
      console.error('Error getting guild tickets:', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId, status, closedBy = null) {
    try {
      return await this.ticketModel.updateStatus(ticketId, status, closedBy);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStatistics(guildId) {
    try {
      return await this.ticketModel.getStatistics(guildId);
    } catch (error) {
      console.error('Error getting ticket statistics:', error);
      throw error;
    }
  }

  /**
   * Check if user has cooldown
   */
  async checkCooldown(userId, type = 'ticket_creation') {
    try {
      const cooldown = await this.cooldownModel.getCooldown(userId, type);
      return cooldown;
    } catch (error) {
      console.error('Error checking cooldown:', error);
      return null;
    }
  }

  /**
   * Clear user cooldown
   */
  async clearCooldown(userId, type = 'ticket_creation') {
    try {
      await this.cooldownModel.clearCooldown(userId, type);
    } catch (error) {
      console.error('Error clearing cooldown:', error);
    }
  }

  /**
   * Clean up old data
   */
  async cleanup() {
    try {
      // Clear expired cooldowns
      const clearedCooldowns = await this.cooldownModel.clearExpiredCooldowns();
      
      // Delete old closed tickets (older than 30 days)
      const deletedTickets = await this.ticketModel.deleteOldTickets(30);
      
      console.log(`🧹 Cleanup completed: ${clearedCooldowns} cooldowns, ${deletedTickets} tickets`);
      
      return { clearedCooldowns, deletedTickets };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Get ticket count by category for statistics
   */
  async getCategoryStatistics(guildId) {
    try {
      const stats = await this.ticketModel.getStatistics(guildId);
      return stats.byCategory || [];
    } catch (error) {
      console.error('Error getting category statistics:', error);
      return [];
    }
  }
}

module.exports = TicketService; 