const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const configLoader = require('./configLoader');

function createTicketPanel() {
  // Get all categories from config
  const categories = Object.entries(configLoader.getAllCategories());
  
  // Create embed fields dynamically from categories
  const embedFields = categories.map(([key, category]) => ({
    name: `${category.emoji} ${category.name}`,
    value: category.description,
    inline: true
  }));

  const embed = new EmbedBuilder()
    .setTitle(configLoader.getMessage('panel.title', '🎫 Candy Ticket System'))
    .setDescription(configLoader.getMessage('panel.description', 'Welcome to Candy Community support system!\n\nPlease select the ticket type that fits your needs:'))
    .setColor(`#${configLoader.get('embed_colors.primary', 'FF69B4')}`)
    .addFields(embedFields)
    .setFooter({ 
      text: configLoader.getMessage('panel.footer', 'Candy Community • Automated Support System')
    })
    .setTimestamp();

  // Create select menu options dynamically from categories
  const selectMenuOptions = categories.map(([key, category]) => ({
    label: category.name,
    description: category.description,
    value: key,
    emoji: category.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_category_select')
    .setPlaceholder(configLoader.getMessage('panel.select_placeholder', 'Select ticket type...'))
    .addOptions(selectMenuOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return {
    embeds: [embed],
    components: [row]
  };
}

module.exports = { createTicketPanel }; 