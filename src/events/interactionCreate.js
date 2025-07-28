const { Events } = require('discord.js');
const { handleTicketInteraction } = require('../handlers/ticketInteractionHandler');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      // Handle slash commands
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        
        if (!command) {
          console.error(`Command not found: ${interaction.commandName}`);
          return;
        }

        try {
          await command.execute(interaction);
        } catch (error) {
          console.error(`Error executing command ${interaction.commandName}:`, error);
          
          const errorMessage = '❌ An error occurred while executing this command!';
          
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
          } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
          }
        }
        return;
      }

      // Handle ticket interactions
      if (interaction.isStringSelectMenu() || interaction.isModalSubmit() || interaction.isButton()) {
        const customId = interaction.customId;
        
        // Check if it's a ticket interaction
        if (customId === 'ticket_category_select' || 
            customId.startsWith('ticket_modal_') || 
            customId.startsWith('ticket_')) {
          await handleTicketInteraction(interaction);
          return;
        }
      }

    } catch (error) {
      console.error('Error handling interaction:', error);
    }
  }
}; 