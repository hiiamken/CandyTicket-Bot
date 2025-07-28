const { buildTicketModal } = require('../utils/ticketQuestionModalBuilder');
const { createTicketThread, closeTicket } = require('../utils/ticketThreadHelper');
const configLoader = require('../utils/configLoader');

async function handleTicketInteraction(interaction) {
  const { customId } = interaction;

  try {
    // Handle category select menu
    if (customId === 'ticket_category_select') {
      const categoryId = interaction.values[0];
      const modal = buildTicketModal(categoryId);
      
      await interaction.showModal(modal);
      return;
    }

    // Handle modal submit
    if (customId.startsWith('ticket_modal_')) {
      const categoryId = customId.replace('ticket_modal_', '');
      const formData = {};
      
      // Get data from form
      interaction.fields.fields.forEach((field) => {
        formData[field.customId] = field.value;
      });

      // Check cooldown
      const cooldownKey = `ticket_${interaction.user.id}`;
      const lastTicket = global.ticketCooldowns?.get(cooldownKey);
      const now = Date.now();
      
      const cooldownTime = configLoader.get('cooldown.ticket_creation', 300000);
      if (lastTicket && (now - lastTicket) < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - (now - lastTicket)) / 1000 / 60);
        await interaction.reply({
          content: configLoader.formatMessage('errors.cooldown', { time: remainingTime }),
          ephemeral: true
        });
        return;
      }

      // Check current ticket count
      const userThreads = interaction.guild.channels.cache.filter(
        channel => channel.isThread() && 
        channel.name.includes(interaction.user.username) &&
        !channel.archived
      );

      const maxTickets = configLoader.get('cooldown.max_tickets_per_user', 3);
      if (userThreads.size >= maxTickets) {
        await interaction.reply({
          content: configLoader.formatMessage('errors.too_many_tickets', { max: maxTickets }),
          ephemeral: true
        });
        return;
      }

      // Create thread
      await interaction.deferReply({ ephemeral: true });
      
      const thread = await createTicketThread(interaction, categoryId, formData);
      
      // Update cooldown
      if (!global.ticketCooldowns) global.ticketCooldowns = new Map();
      global.ticketCooldowns.set(cooldownKey, now);

      await interaction.editReply({
        content: configLoader.formatMessage('ticket.created_success', { thread: thread.toString() }),
        ephemeral: true
      });
      return;
    }

    // Handle close ticket button
    if (customId === 'ticket_close') {
      await closeTicket(interaction);
      return;
    }

    // Handle claim ticket button
    if (customId === 'ticket_claim') {
      const thread = interaction.channel;
      
      if (!thread.isThread()) {
        await interaction.reply({
          content: configLoader.getMessage('errors.thread_only', '❌ This command can only be used in a thread!'),
          ephemeral: true
        });
        return;
      }

      const claimEmbed = {
        title: configLoader.getMessage('ticket.claimed', '👋 Ticket Claimed'),
        description: configLoader.formatMessage('ticket.claimed_description', { user: interaction.user.toString() }),
        color: parseInt(configLoader.get('embed_colors.success', '00FF00'), 16),
        timestamp: new Date().toISOString()
      };

      await interaction.reply({ embeds: [claimEmbed] });
      return;
    }

    // Handle export transcript button
    if (customId === 'ticket_transcript') {
      await interaction.reply({
        content: configLoader.getMessage('transcript.under_development', '📄 Transcript export feature is under development!'),
        ephemeral: true
      });
      return;
    }

  } catch (error) {
    console.error('Error handling ticket interaction:', error);
    
    const errorMessage = configLoader.getMessage('errors.general', '❌ An error occurred while processing your request!');
    
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

module.exports = { handleTicketInteraction }; 