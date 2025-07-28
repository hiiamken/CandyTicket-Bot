const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createTicketPanel } = require('../../../utils/createTicketPanel');
const configLoader = require('../../../utils/configLoader');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createpanel')
    .setDescription('Create new ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: configLoader.getMessage('errors.no_permission', '❌ You do not have permission to use this command!'),
          ephemeral: true
        });
        return;
      }

      const panel = createTicketPanel();
      
      await interaction.channel.send(panel);
      
      await interaction.reply({
        content: configLoader.getMessage('success.panel_created', '✅ Ticket panel created successfully!'),
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error creating panel:', error);
      await interaction.reply({
        content: configLoader.getMessage('errors.panel_creation_error', '❌ An error occurred while creating the panel!'),
        ephemeral: true
      });
    }
  }
}; 