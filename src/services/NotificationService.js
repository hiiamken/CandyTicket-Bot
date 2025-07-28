const { EmbedBuilder, WebhookClient } = require('discord.js');
const dayjs = require('dayjs');
const configLoader = require('../utils/configLoader');

class NotificationService {
  constructor() {
    this.config = configLoader;
    this.webhooks = new Map();
    this.notificationQueue = [];
    this.isProcessing = false;
  }

  async initialize() {
    try {
      // Initialize webhooks if configured
      const webhookConfig = this.config.get('notifications.webhooks', {});
      
      for (const [name, url] of Object.entries(webhookConfig)) {
        if (url && url.startsWith('https://discord.com/api/webhooks/')) {
          this.webhooks.set(name, new WebhookClient({ url }));
        }
      }

      console.log(`✅ Notification service initialized with ${this.webhooks.size} webhooks`);
      return true;
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
      return false;
    }
  }

  async sendTicketCreatedNotification(ticket, user, category) {
    const notification = {
      type: 'ticket_created',
      data: { ticket, user, category },
      priority: 'high',
      timestamp: Date.now()
    };

    await this.queueNotification(notification);
  }

  async sendTicketClosedNotification(ticket, closedBy) {
    const notification = {
      type: 'ticket_closed',
      data: { ticket, closedBy },
      priority: 'medium',
      timestamp: Date.now()
    };

    await this.queueNotification(notification);
  }

  async sendStaffAssignedNotification(ticket, staffMember) {
    const notification = {
      type: 'staff_assigned',
      data: { ticket, staffMember },
      priority: 'medium',
      timestamp: Date.now()
    };

    await this.queueNotification(notification);
  }

  async sendUrgentTicketNotification(ticket, user, category) {
    const notification = {
      type: 'urgent_ticket',
      data: { ticket, user, category },
      priority: 'urgent',
      timestamp: Date.now()
    };

    await this.queueNotification(notification);
  }

  async sendDailyReport(guild, stats) {
    const notification = {
      type: 'daily_report',
      data: { guild, stats },
      priority: 'low',
      timestamp: Date.now()
    };

    await this.queueNotification(notification);
  }

  async queueNotification(notification) {
    this.notificationQueue.push(notification);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        await this.processNotification(notification);
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processNotification(notification) {
    try {
      const embed = this.createNotificationEmbed(notification);
      const webhookName = this.getWebhookForNotification(notification);
      
      if (webhookName && this.webhooks.has(webhookName)) {
        const webhook = this.webhooks.get(webhookName);
        await webhook.send({ embeds: [embed] });
      }

      // Also send to configured channels
      await this.sendToChannels(embed, notification);
      
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  }

  createNotificationEmbed(notification) {
    const { type, data, priority } = notification;
    
    const embed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ 
        text: this.config.getMessage('notifications.footer', 'CandyTicket Bot • Notification System')
      });

    switch (type) {
      case 'ticket_created':
        return this.createTicketCreatedEmbed(embed, data, priority);
      case 'ticket_closed':
        return this.createTicketClosedEmbed(embed, data, priority);
      case 'staff_assigned':
        return this.createStaffAssignedEmbed(embed, data, priority);
      case 'urgent_ticket':
        return this.createUrgentTicketEmbed(embed, data, priority);
      case 'daily_report':
        return this.createDailyReportEmbed(embed, data, priority);
      default:
        return embed.setTitle('📢 Notification').setDescription('Unknown notification type');
    }
  }

  createTicketCreatedEmbed(embed, data, priority) {
    const { ticket, user, category } = data;
    
    embed
      .setTitle('🎫 New Ticket Created')
      .setDescription(`A new ticket has been created by ${user.toString()}`)
      .setColor(this.getPriorityColor(priority))
      .addFields(
        { 
          name: '👤 User', 
          value: user.toString(), 
          inline: true 
        },
        { 
          name: '🎯 Category', 
          value: category.name, 
          inline: true 
        },
        { 
          name: '📅 Created', 
          value: `<t:${Math.floor(Date.now() / 1000)}:R>`, 
          inline: true 
        },
        { 
          name: '🔗 Ticket', 
          value: `[View Ticket](${ticket.url})`, 
          inline: false 
        }
      );

    if (user.avatarURL()) {
      embed.setThumbnail(user.avatarURL());
    }

    return embed;
  }

  createTicketClosedEmbed(embed, data, priority) {
    const { ticket, closedBy } = data;
    
    embed
      .setTitle('🔒 Ticket Closed')
      .setDescription(`Ticket has been closed by ${closedBy.toString()}`)
      .setColor(this.getPriorityColor(priority))
      .addFields(
        { 
          name: '👤 Closed by', 
          value: closedBy.toString(), 
          inline: true 
        },
        { 
          name: '📅 Closed', 
          value: `<t:${Math.floor(Date.now() / 1000)}:R>`, 
          inline: true 
        },
        { 
          name: '🎫 Ticket', 
          value: ticket.name, 
          inline: true 
        }
      );

    return embed;
  }

  createStaffAssignedEmbed(embed, data, priority) {
    const { ticket, staffMember } = data;
    
    embed
      .setTitle('👋 Staff Assigned')
      .setDescription(`${staffMember.toString()} has been assigned to the ticket`)
      .setColor(this.getPriorityColor(priority))
      .addFields(
        { 
          name: '👤 Staff Member', 
          value: staffMember.toString(), 
          inline: true 
        },
        { 
          name: '🎫 Ticket', 
          value: ticket.name, 
          inline: true 
        },
        { 
          name: '📅 Assigned', 
          value: `<t:${Math.floor(Date.now() / 1000)}:R>`, 
          inline: true 
        }
      );

    return embed;
  }

  createUrgentTicketEmbed(embed, data, priority) {
    const { ticket, user, category } = data;
    
    embed
      .setTitle('🚨 Urgent Ticket Alert')
      .setDescription(`**URGENT** ticket created by ${user.toString()}`)
      .setColor(this.getPriorityColor(priority))
      .addFields(
        { 
          name: '👤 User', 
          value: user.toString(), 
          inline: true 
        },
        { 
          name: '🎯 Category', 
          value: category.name, 
          inline: true 
        },
        { 
          name: '🔗 Ticket', 
          value: `[View Ticket](${ticket.url})`, 
          inline: false 
        }
      )
      .setThumbnail('https://cdn.discordapp.com/emojis/1378294260708806729.webp?size=96&quality=lossless');

    return embed;
  }

  createDailyReportEmbed(embed, data, priority) {
    const { guild, stats } = data;
    
    embed
      .setTitle('📊 Daily Report')
      .setDescription(`Daily ticket statistics for ${guild.name}`)
      .setColor(this.getPriorityColor(priority))
      .addFields(
        { 
          name: '📈 Total Tickets', 
          value: stats.total.toString(), 
          inline: true 
        },
        { 
          name: '✅ Active', 
          value: stats.active.toString(), 
          inline: true 
        },
        { 
          name: '🔒 Closed', 
          value: stats.archived.toString(), 
          inline: true 
        },
        { 
          name: '⏱️ Avg Response', 
          value: `${Math.round(stats.averageResponseTime / 1000 / 60)} minutes`, 
          inline: true 
        },
        { 
          name: '📅 Date', 
          value: dayjs().format('YYYY-MM-DD'), 
          inline: true 
        }
      );

    if (guild.iconURL()) {
      embed.setThumbnail(guild.iconURL());
    }

    return embed;
  }

  getPriorityColor(priority) {
    const colors = {
      urgent: '#FF0000',
      high: '#FF69B4',
      medium: '#FFA500',
      low: '#00FF00'
    };
    
    return colors[priority] || colors.medium;
  }

  getWebhookForNotification(notification) {
    const webhookMapping = this.config.get('notifications.webhook_mapping', {});
    return webhookMapping[notification.type] || 'default';
  }

  async sendToChannels(embed, notification) {
    const channelConfig = this.config.get('notifications.channels', {});
    const channelIds = channelConfig[notification.type] || channelConfig.default || [];
    
    for (const channelId of channelIds) {
      try {
        const channel = await this.getChannelById(channelId);
        if (channel) {
          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error(`Error sending notification to channel ${channelId}:`, error);
      }
    }
  }

  async getChannelById(channelId) {
    // This would need to be implemented based on your bot's client
    // For now, we'll return null
    return null;
  }

  async sendTestNotification() {
    const testNotification = {
      type: 'test',
      data: { message: 'This is a test notification' },
      priority: 'low',
      timestamp: Date.now()
    };

    await this.queueNotification(testNotification);
  }

  getQueueStatus() {
    return {
      queueLength: this.notificationQueue.length,
      isProcessing: this.isProcessing,
      webhookCount: this.webhooks.size
    };
  }

  clearQueue() {
    this.notificationQueue = [];
    console.log('✅ Notification queue cleared');
  }
}

module.exports = NotificationService; 