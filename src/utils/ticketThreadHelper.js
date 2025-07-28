const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const configLoader = require('./configLoader');

async function createTicketThread(interaction, categoryId, formData) {
  const category = configLoader.getCategory(categoryId);
  const user = interaction.user;
  
  // Create ticket information embed
  const ticketEmbed = new EmbedBuilder()
    .setTitle(configLoader.formatMessage('ticket.embed.title', {
      emoji: category.emoji,
      category: category.name
    }))
    .setDescription(configLoader.formatMessage('ticket.embed.description', {
      user: user.toString()
    }))
    .setColor(`#${configLoader.get('embed_colors.primary', 'FF69B4')}`)
    .addFields(
      { 
        name: configLoader.getMessage('ticket.embed.fields.created_by', '👤 Created by'), 
        value: user.toString(), 
        inline: true 
      },
      { 
        name: configLoader.getMessage('ticket.embed.fields.time', '📅 Time'), 
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`, 
        inline: true 
      },
      { 
        name: configLoader.getMessage('ticket.embed.fields.type', '🎫 Type'), 
        value: category.name, 
        inline: true 
      }
    )
    .setFooter({ 
      text: configLoader.getMessage('ticket.embed.footer', 'Candy Community • Support System')
    })
    .setTimestamp();

  // Add form information
  Object.entries(formData).forEach(([key, value]) => {
    if (value && value.trim()) {
      const question = category.questions.find(q => q.id === key);
      if (question) {
        ticketEmbed.addFields({
          name: question.label,
          value: value.length > 1024 ? value.substring(0, 1021) + '...' : value,
          inline: false
        });
      }
    }
  });

  // Create buttons
  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel(configLoader.getMessage('buttons.close', 'Close ticket'))
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel(configLoader.getMessage('buttons.claim', 'Claim ticket'))
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👋'),
      new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel(configLoader.getMessage('buttons.transcript', 'Export transcript'))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📄')
    );

  try {
    // Create thread
    const thread = await interaction.channel.threads.create({
      name: configLoader.formatMessage('ticket.thread.name', {
        emoji: category.emoji,
        category: category.name,
        username: user.username
      }),
      type: ChannelType.GuildPublicThread,
      autoArchiveDuration: configLoader.get('ticket.thread.auto_archive_duration', 60),
      reason: configLoader.formatMessage('ticket.thread.reason', {
        category: category.name,
        tag: user.tag
      })
    });

    // Send embed to thread
    await thread.send({
      embeds: [ticketEmbed],
      components: [buttons]
    });

    // Ping staff roles
    const staffRoles = configLoader.get('staff_roles', []);
    const staffMention = staffRoles.map(roleId => `<@&${roleId}>`).join(' ');
    if (staffMention) {
      await thread.send({
        content: configLoader.formatMessage('ticket.staff_notification', {
          roles: staffMention
        }),
        allowedMentions: { roles: staffRoles }
      });
    }

    return thread;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

async function closeTicket(interaction) {
  const thread = interaction.channel;
  
  if (!thread.isThread()) {
    await interaction.reply({
      content: configLoader.getMessage('errors.thread_only', '❌ This command can only be used in a thread!'),
      ephemeral: true
    });
    return;
  }

  const closeEmbed = new EmbedBuilder()
    .setTitle(configLoader.getMessage('ticket.closed', '🔒 Ticket Closed'))
    .setDescription(configLoader.formatMessage('ticket.closed_description', {
      user: interaction.user.toString()
    }))
    .setColor(`#${configLoader.get('embed_colors.warning', 'FFA500')}`)
    .setTimestamp();

  await interaction.reply({ embeds: [closeEmbed] });

  // Close thread after 5 seconds
  setTimeout(async () => {
    try {
      await thread.setArchived(true);
      await thread.setLocked(true);
    } catch (error) {
      console.error('Error closing thread:', error);
    }
  }, 5000);
}

module.exports = { createTicketThread, closeTicket }; 