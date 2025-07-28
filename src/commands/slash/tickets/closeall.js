const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const configLoader = require('../../../utils/configLoader');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('closealltickets')
    .setDescription('Close all open tickets')
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

      await interaction.deferReply();

      const guild = interaction.guild;
      
      // Find all open threads
      const activeThreads = guild.channels.cache.filter(
        channel => channel.isThread() && !channel.archived
      );
      
      if (activeThreads.size === 0) {
        await interaction.editReply({
          content: configLoader.getMessage('success.no_tickets_open', '✅ No tickets are currently open!'),
          ephemeral: true
        });
        return;
      }
      
      let closedCount = 0;
      let errorCount = 0;
      
      // Close each thread
      for (const [threadId, thread] of activeThreads) {
        try {
          await thread.setArchived(true);
          await thread.setLocked(true);
          closedCount++;
        } catch (error) {
          console.error(`Error closing thread ${threadId}:`, error);
          errorCount++;
        }
      }
      
      // Create result embed
      const resultEmbed = new EmbedBuilder()
        .setTitle(configLoader.getMessage('close_all.title', '🔒 Close All Tickets'))
        .setDescription(configLoader.getMessage('close_all.description', 'Ticket closing results:'))
        .setColor(`#${configLoader.get('embed_colors.warning', 'FFA500')}`)
        .addFields(
          { name: configLoader.getMessage('close_all.closed', '✅ Closed'), value: `${closedCount}`, inline: true },
          { name: configLoader.getMessage('close_all.errors', '❌ Errors'), value: `${errorCount}`, inline: true },
          { name: configLoader.getMessage('close_all.total', '📊 Total'), value: `${activeThreads.size}`, inline: true }
        )
        .setFooter({ text: configLoader.getMessage('ticket.embed.footer', 'Candy Community • Support System') })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [resultEmbed] });
      
    } catch (error) {
      console.error('Error closing all tickets:', error);
      await interaction.editReply({
        content: configLoader.getMessage('errors.close_all_error', '❌ An error occurred while closing tickets!'),
        ephemeral: true
      });
    }
  }
}; 