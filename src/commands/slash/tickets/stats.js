const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const configLoader = require('../../../utils/configLoader');
const AnalyticsGenerator = require('../../../utils/analyticsGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketstats')
    .setDescription('View comprehensive ticket analytics with charts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption(option =>
      option.setName('charts')
        .setDescription('Include charts in the response')
        .setRequired(false)),
  
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
      const includeCharts = interaction.options.getBoolean('charts') ?? true;
      
      // Generate comprehensive analytics
      const analyticsGenerator = new AnalyticsGenerator();
      const analytics = await analyticsGenerator.generateAnalytics(guild);
      
      // Send embeds
      await interaction.editReply({
        embeds: analytics.embeds,
        files: includeCharts ? await analyticsGenerator.createChartAttachments(analytics.charts) : []
      });
      
      // Success message
      console.log(`✅ Analytics generated for guild: ${guild.name}`);
      
    } catch (error) {
      console.error('Error viewing statistics:', error);
      
      const errorMessage = configLoader.getMessage('errors.statistics_error', '❌ An error occurred while generating analytics!');
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
}; 