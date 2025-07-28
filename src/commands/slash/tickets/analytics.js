const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const configLoader = require('../../../utils/configLoader');
const AnalyticsGenerator = require('../../../utils/analyticsGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('View advanced ticket analytics dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of analytics to view')
        .setRequired(false)
        .addChoices(
          { name: '📊 Overview', value: 'overview' },
          { name: '📈 Performance', value: 'performance' },
          { name: '👥 Staff Activity', value: 'staff' },
          { name: '🎯 Categories', value: 'categories' },
          { name: '📅 Time Analysis', value: 'time' }
        ))
    .addBooleanOption(option =>
      option.setName('detailed')
        .setDescription('Show detailed breakdown')
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
      const type = interaction.options.getString('type') ?? 'overview';
      const detailed = interaction.options.getBoolean('detailed') ?? false;
      
      // Generate analytics
      const analyticsGenerator = new AnalyticsGenerator();
      const analytics = await analyticsGenerator.generateAnalytics(guild);
      
      // Create specific analytics embed based on type
      const embed = this.createAnalyticsEmbed(type, analytics.stats, detailed, guild);
      
      // Send response
      await interaction.editReply({
        embeds: [embed],
        files: await analyticsGenerator.createChartAttachments(analytics.charts)
      });
      
      console.log(`✅ Advanced analytics generated for guild: ${guild.name} (Type: ${type})`);
      
    } catch (error) {
      console.error('Error generating advanced analytics:', error);
      
      const errorMessage = configLoader.getMessage('errors.analytics_error', '❌ An error occurred while generating analytics!');
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },

  createAnalyticsEmbed(type, stats, detailed, guild) {
    const embed = new EmbedBuilder()
      .setColor(`#${configLoader.get('embed_colors.primary', 'FF69B4')}`)
      .setTimestamp()
      .setFooter({ 
        text: configLoader.getMessage('analytics.footer', 'CandyTicket Bot • Advanced Analytics')
      });

    switch (type) {
      case 'overview':
        return this.createOverviewEmbed(embed, stats, detailed, guild);
      case 'performance':
        return this.createPerformanceEmbed(embed, stats, detailed, guild);
      case 'staff':
        return this.createStaffEmbed(embed, stats, detailed, guild);
      case 'categories':
        return this.createCategoriesEmbed(embed, stats, detailed, guild);
      case 'time':
        return this.createTimeEmbed(embed, stats, detailed, guild);
      default:
        return this.createOverviewEmbed(embed, stats, detailed, guild);
    }
  },

  createOverviewEmbed(embed, stats, detailed, guild) {
    embed
      .setTitle('📊 Analytics Overview')
      .setDescription(`Comprehensive analytics for **${guild.name}**`)
      .addFields(
        { 
          name: '📈 Ticket Statistics', 
          value: `**Total:** ${stats.total}\n**Active:** ${stats.active}\n**Archived:** ${stats.archived}`, 
          inline: true 
        },
        { 
          name: '⏱️ Performance', 
          value: `**Avg Response:** ${Math.round(stats.averageResponseTime / 1000 / 60)} minutes\n**Today:** ${stats.byDay[new Date().toISOString().split('T')[0]] || 0}`, 
          inline: true 
        },
        { 
          name: '👥 Staff Activity', 
          value: `**Top Staff:** ${stats.topStaff.length > 0 ? stats.topStaff[0].count + ' messages' : 'No data'}`, 
          inline: true 
        }
      );

    if (detailed) {
      const categoryStats = Object.entries(stats.byCategory)
        .filter(([key, data]) => data.total > 0)
        .map(([key, data]) => `**${key}:** ${data.total} total, ${data.active} active`)
        .join('\n');

      if (categoryStats) {
        embed.addFields({
          name: '🎯 Category Breakdown',
          value: categoryStats,
          inline: false
        });
      }
    }

    return embed;
  },

  createPerformanceEmbed(embed, stats, detailed, guild) {
    const responseTimeHours = Math.round(stats.averageResponseTime / 1000 / 60 / 60 * 10) / 10;
    const responseTimeMinutes = Math.round(stats.averageResponseTime / 1000 / 60);
    
    embed
      .setTitle('📈 Performance Analytics')
      .setDescription(`Performance metrics for **${guild.name}**`)
      .addFields(
        { 
          name: '⏱️ Response Time', 
          value: `**Average:** ${responseTimeHours > 1 ? responseTimeHours + ' hours' : responseTimeMinutes + ' minutes'}\n**Best:** < 5 minutes\n**Target:** < 30 minutes`, 
          inline: true 
        },
        { 
          name: '📊 Efficiency', 
          value: `**Active Rate:** ${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%\n**Resolution Rate:** ${stats.total > 0 ? Math.round((stats.archived / stats.total) * 100) : 0}%`, 
          inline: true 
        },
        { 
          name: '📅 Daily Activity', 
          value: `**Today:** ${stats.byDay[new Date().toISOString().split('T')[0]] || 0}\n**This Week:** ${Object.values(stats.byDay).reduce((a, b) => a + b, 0)}`, 
          inline: true 
        }
      );

    if (detailed) {
      // Add hourly performance data
      const peakHour = Object.entries(stats.byHour).reduce((a, b) => stats.byHour[a] > stats.byHour[b] ? a : b);
      embed.addFields({
        name: '🕐 Peak Activity',
        value: `**Peak Hour:** ${peakHour}:00 (${stats.byHour[peakHour]} tickets)`,
        inline: false
      });
    }

    return embed;
  },

  createStaffEmbed(embed, stats, detailed, guild) {
    embed
      .setTitle('👥 Staff Activity Analytics')
      .setDescription(`Staff performance for **${guild.name}**`);

    if (stats.topStaff.length > 0) {
      const staffList = stats.topStaff
        .map((staff, index) => `${index + 1}. <@${staff.userId}> - **${staff.count}** messages`)
        .join('\n');

      embed.addFields({
        name: '🏆 Top Staff Members',
        value: staffList,
        inline: false
      });
    } else {
      embed.addFields({
        name: '👥 Staff Activity',
        value: 'No staff activity data available',
        inline: false
      });
    }

    if (detailed) {
      const totalStaffMessages = stats.topStaff.reduce((sum, staff) => sum + staff.count, 0);
      const avgMessagesPerStaff = stats.topStaff.length > 0 ? Math.round(totalStaffMessages / stats.topStaff.length) : 0;

      embed.addFields(
        { 
          name: '📊 Staff Metrics', 
          value: `**Total Messages:** ${totalStaffMessages}\n**Avg per Staff:** ${avgMessagesPerStaff}`, 
          inline: true 
        },
        { 
          name: '🎯 Performance', 
          value: `**Most Active:** ${stats.topStaff.length > 0 ? stats.topStaff[0].count : 0} messages\n**Least Active:** ${stats.topStaff.length > 1 ? stats.topStaff[stats.topStaff.length - 1].count : 0} messages`, 
          inline: true 
        }
      );
    }

    return embed;
  },

  createCategoriesEmbed(embed, stats, detailed, guild) {
    embed
      .setTitle('🎯 Category Analytics')
      .setDescription(`Category performance for **${guild.name}**`);

    const categories = configLoader.getAllCategories();
    const categoryStats = Object.entries(stats.byCategory)
      .filter(([key, data]) => data.total > 0)
      .map(([key, data]) => {
        const category = categories[key];
        const activeRate = data.total > 0 ? Math.round((data.active / data.total) * 100) : 0;
        return {
          name: `${category.emoji} ${category.name}`,
          value: `**Total:** ${data.total} | **Active:** ${data.active} | **Rate:** ${activeRate}%`,
          inline: true
        };
      });

    if (categoryStats.length > 0) {
      embed.addFields(categoryStats);
    } else {
      embed.addFields({
        name: '📊 Categories',
        value: 'No category data available',
        inline: false
      });
    }

    if (detailed) {
      const mostPopular = Object.entries(stats.byCategory)
        .reduce((a, b) => stats.byCategory[a[0]].total > stats.byCategory[b[0]].total ? a : b);
      
      if (mostPopular && stats.byCategory[mostPopular[0]].total > 0) {
        const category = categories[mostPopular[0]];
        embed.addFields({
          name: '🏆 Most Popular Category',
          value: `${category.emoji} **${category.name}** with ${stats.byCategory[mostPopular[0]].total} tickets`,
          inline: false
        });
      }
    }

    return embed;
  },

  createTimeEmbed(embed, stats, detailed, guild) {
    embed
      .setTitle('📅 Time Analysis')
      .setDescription(`Temporal patterns for **${guild.name}**`)
      .addFields(
        { 
          name: '📊 Daily Activity', 
          value: `**Today:** ${stats.byDay[new Date().toISOString().split('T')[0]] || 0}\n**This Week:** ${Object.values(stats.byDay).reduce((a, b) => a + b, 0)}`, 
          inline: true 
        },
        { 
          name: '🕐 Hourly Patterns', 
          value: `**Peak Hour:** ${Object.entries(stats.byHour).reduce((a, b) => stats.byHour[a] > stats.byHour[b] ? a : b)}:00\n**Total Hours:** ${Object.keys(stats.byHour).length}`, 
          inline: true 
        },
        { 
          name: '📈 Trends', 
          value: `**Active Periods:** ${Object.values(stats.byHour).filter(count => count > 0).length} hours\n**Quiet Periods:** ${Object.values(stats.byHour).filter(count => count === 0).length} hours`, 
          inline: true 
        }
      );

    if (detailed) {
      const recentDays = Object.entries(stats.byDay)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
        .slice(0, 7)
        .map(([date, count]) => `${date}: ${count} tickets`)
        .join('\n');

      embed.addFields({
        name: '📅 Recent Activity (7 days)',
        value: recentDays || 'No recent activity data',
        inline: false
      });
    }

    return embed;
  }
}; 