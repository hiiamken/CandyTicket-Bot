const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const dayjs = require('dayjs');
const configLoader = require('./configLoader');

class AnalyticsGenerator {
  constructor() {
    this.config = configLoader;
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: 800, 
      height: 400,
      backgroundColour: 'white'
    });
  }

  async generateAnalytics(guild) {
    try {
      const stats = await this.collectStatistics(guild);
      const charts = await this.generateCharts(stats);
      
      return {
        stats,
        charts,
        embeds: this.createAnalyticsEmbeds(stats)
      };
    } catch (error) {
      console.error('Error generating analytics:', error);
      throw error;
    }
  }

  async collectStatistics(guild) {
    const threads = guild.channels.cache.filter(channel => channel.isThread());
    const categories = this.config.getAllCategories();
    
    const stats = {
      total: threads.size,
      active: threads.filter(t => !t.archived).size,
      archived: threads.filter(t => t.archived).size,
      byCategory: {},
      byDay: {},
      byHour: {},
      averageResponseTime: 0,
      staffActivity: {},
      topStaff: []
    };

    // Initialize category stats
    Object.keys(categories).forEach(categoryKey => {
      stats.byCategory[categoryKey] = {
        total: 0,
        active: 0,
        archived: 0
      };
    });

    // Collect data from threads
    const responseTimes = [];
    const staffMessages = new Map();

    for (const [threadId, thread] of threads) {
      const category = this.getThreadCategory(thread, categories);
      if (category) {
        stats.byCategory[category].total++;
        if (thread.archived) {
          stats.byCategory[category].archived++;
        } else {
          stats.byCategory[category].active++;
        }
      }

      // Daily stats
      const day = dayjs(thread.createdAt).format('YYYY-MM-DD');
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;

      // Hourly stats
      const hour = dayjs(thread.createdAt).format('HH');
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;

      // Response time calculation
      const responseTime = await this.calculateResponseTime(thread);
      if (responseTime > 0) {
        responseTimes.push(responseTime);
      }

      // Staff activity
      await this.analyzeStaffActivity(thread, staffMessages);
    }

    // Calculate averages
    if (responseTimes.length > 0) {
      stats.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // Top staff members
    stats.topStaff = Array.from(staffMessages.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }

  getThreadCategory(thread, categories) {
    for (const [categoryKey, category] of Object.entries(categories)) {
      if (thread.name.includes(category.emoji)) {
        return categoryKey;
      }
    }
    return null;
  }

  async calculateResponseTime(thread) {
    try {
      const messages = await thread.messages.fetch({ limit: 100 });
      const userMessages = messages.filter(msg => !msg.author.bot);
      
      if (userMessages.size < 2) return 0;

      const firstUserMsg = userMessages.first();
      const staffMessages = messages.filter(msg => 
        !msg.author.bot && 
        msg.createdTimestamp > firstUserMsg.createdTimestamp &&
        this.isStaffMember(msg.member)
      );

      if (staffMessages.size === 0) return 0;

      const firstStaffMsg = staffMessages.first();
      return firstStaffMsg.createdTimestamp - firstUserMsg.createdTimestamp;
    } catch (error) {
      return 0;
    }
  }

  isStaffMember(member) {
    if (!member) return false;
    const staffRoles = this.config.get('staff_roles', []);
    return member.roles.cache.some(role => staffRoles.includes(role.id));
  }

  async analyzeStaffActivity(thread, staffMessages) {
    try {
      const messages = await thread.messages.fetch({ limit: 100 });
      
      messages.forEach(msg => {
        if (!msg.author.bot && this.isStaffMember(msg.member)) {
          const count = staffMessages.get(msg.author.id) || 0;
          staffMessages.set(msg.author.id, count + 1);
        }
      });
    } catch (error) {
      console.error('Error analyzing staff activity:', error);
    }
  }

  async generateCharts(stats) {
    const charts = {};

    // Category distribution chart
    charts.categoryChart = await this.createCategoryChart(stats.byCategory);
    
    // Daily activity chart
    charts.dailyChart = await this.createDailyChart(stats.byDay);
    
    // Hourly activity chart
    charts.hourlyChart = await this.createHourlyChart(stats.byHour);

    return charts;
  }

  async createCategoryChart(categoryStats) {
    const categories = this.config.getAllCategories();
    const labels = [];
    const data = [];
    const colors = ['#FF69B4', '#FF1493', '#FFB6C1', '#FFC0CB', '#FFE4E1'];

    Object.entries(categoryStats).forEach(([categoryKey, stats], index) => {
      const category = categories[categoryKey];
      if (category) {
        labels.push(category.name);
        data.push(stats.total);
      }
    });

    const configuration = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Ticket Distribution by Category',
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    };

    return await this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  async createDailyChart(dailyStats) {
    const last7Days = [];
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      last7Days.push(dayjs(date).format('MMM DD'));
      data.push(dailyStats[date] || 0);
    }

    const configuration = {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [{
          label: 'Tickets Created',
          data,
          borderColor: '#FF69B4',
          backgroundColor: 'rgba(255, 105, 180, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Daily Ticket Activity (Last 7 Days)',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };

    return await this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  async createHourlyChart(hourlyStats) {
    const hours = [];
    const data = [];

    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      hours.push(`${hour}:00`);
      data.push(hourlyStats[hour] || 0);
    }

    const configuration = {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [{
          label: 'Tickets Created',
          data,
          backgroundColor: 'rgba(255, 105, 180, 0.8)',
          borderColor: '#FF69B4',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Hourly Ticket Activity',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };

    return await this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  createAnalyticsEmbeds(stats) {
    const embeds = [];

    // Main stats embed
    const mainEmbed = new EmbedBuilder()
      .setTitle('📊 Ticket Analytics Dashboard')
      .setColor(`#${this.config.get('embed_colors.primary', 'FF69B4')}`)
      .addFields(
        { 
          name: '📈 Overview', 
          value: `**Total Tickets:** ${stats.total}\n**Active:** ${stats.active}\n**Archived:** ${stats.archived}`, 
          inline: true 
        },
        { 
          name: '⏱️ Response Time', 
          value: `**Average:** ${Math.round(stats.averageResponseTime / 1000 / 60)} minutes`, 
          inline: true 
        },
        { 
          name: '📅 Today', 
          value: `**Created:** ${stats.byDay[dayjs().format('YYYY-MM-DD')] || 0}`, 
          inline: true 
        }
      )
      .setTimestamp();

    embeds.push(mainEmbed);

    // Category breakdown embed
    const categories = this.config.getAllCategories();
    const categoryFields = Object.entries(stats.byCategory)
      .filter(([key, data]) => data.total > 0)
      .map(([key, data]) => {
        const category = categories[key];
        return {
          name: `${category.emoji} ${category.name}`,
          value: `**Total:** ${data.total} | **Active:** ${data.active} | **Archived:** ${data.archived}`,
          inline: true
        };
      });

    if (categoryFields.length > 0) {
      const categoryEmbed = new EmbedBuilder()
        .setTitle('🎯 Category Breakdown')
        .setColor(`#${this.config.get('embed_colors.secondary', 'FF1493')}`)
        .addFields(categoryFields)
        .setTimestamp();
      
      embeds.push(categoryEmbed);
    }

    // Top staff embed
    if (stats.topStaff.length > 0) {
      const staffFields = stats.topStaff.map((staff, index) => ({
        name: `${index + 1}. <@${staff.userId}>`,
        value: `**Messages:** ${staff.count}`,
        inline: true
      }));

      const staffEmbed = new EmbedBuilder()
        .setTitle('👥 Top Staff Members')
        .setColor(`#${this.config.get('embed_colors.success', '00FF00')}`)
        .addFields(staffFields)
        .setTimestamp();
      
      embeds.push(staffEmbed);
    }

    return embeds;
  }

  async createChartAttachments(charts) {
    const attachments = [];

    if (charts.categoryChart) {
      attachments.push(new AttachmentBuilder(charts.categoryChart, { name: 'category-chart.png' }));
    }
    if (charts.dailyChart) {
      attachments.push(new AttachmentBuilder(charts.dailyChart, { name: 'daily-chart.png' }));
    }
    if (charts.hourlyChart) {
      attachments.push(new AttachmentBuilder(charts.hourlyChart, { name: 'hourly-chart.png' }));
    }

    return attachments;
  }
}

module.exports = AnalyticsGenerator; 