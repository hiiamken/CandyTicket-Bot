const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const configLoader = require('../../../utils/configLoader');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketstats')
    .setDescription('View ticket statistics')
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

      const guild = interaction.guild;
      
      // Count current threads
      const activeThreads = guild.channels.cache.filter(
        channel => channel.isThread() && !channel.archived
      );
      
      // Initialize stats object with all categories
      const stats = {
        total: activeThreads.size
      };
      
      // Initialize all categories with 0
      const categories = configLoader.getAllCategories();
      Object.keys(categories).forEach(categoryKey => {
        stats[categoryKey] = 0;
      });
      
      // Count tickets by category
      activeThreads.forEach(thread => {
        // Check which category emoji is in the thread name
        Object.entries(categories).forEach(([categoryKey, category]) => {
          if (thread.name.includes(category.emoji)) {
            stats[categoryKey]++;
          }
        });
      });
      
      // Create fields for each category
      const statsFields = Object.entries(categories).map(([categoryKey, category]) => ({
        name: `${category.emoji} ${category.name}`,
        value: `${stats[categoryKey]}`,
        inline: true
      }));
      
      // Add total field
      statsFields.push({
        name: configLoader.getMessage('statistics.total', '📈 Total'),
        value: `${stats.total}`,
        inline: false
      });
      
      // Create stats embed
      const statsEmbed = new EmbedBuilder()
        .setTitle(configLoader.getMessage('statistics.title', '📊 Ticket Statistics'))
        .setDescription(configLoader.formatMessage('statistics.description', { server: guild.name }))
        .setColor(`#${configLoader.get('embed_colors.info', '0099FF')}`)
        .addFields(statsFields)
        .setFooter({ text: configLoader.getMessage('ticket.embed.footer', 'Candy Community • Support System') })
        .setTimestamp();
      
      await interaction.reply({ embeds: [statsEmbed] });
      
    } catch (error) {
      console.error('Error viewing statistics:', error);
      await interaction.reply({
        content: configLoader.getMessage('errors.statistics_error', '❌ An error occurred while viewing statistics!'),
        ephemeral: true
      });
    }
  }
}; 