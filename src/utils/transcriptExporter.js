const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const dayjs = require('dayjs');
const configLoader = require('./configLoader');

class TranscriptExporter {
  constructor() {
    this.config = configLoader;
  }

  async generateTranscript(thread, guild) {
    try {
      const messages = await this.fetchAllMessages(thread);
      const html = this.generateHTML(messages, thread, guild);
      
      return {
        html,
        filename: `transcript-${thread.name}-${dayjs().format('YYYY-MM-DD-HH-mm')}.html`
      };
    } catch (error) {
      console.error('Error generating transcript:', error);
      throw error;
    }
  }

  async fetchAllMessages(thread) {
    const messages = [];
    let lastId;

    while (true) {
      const options = { limit: 100 };
      if (lastId) {
        options.before = lastId;
      }

      const batch = await thread.messages.fetch(options);
      if (batch.size === 0) break;

      messages.push(...batch.values());
      lastId = batch.last().id;

      if (batch.size < 100) break;
    }

    return messages.reverse();
  }

  generateHTML(messages, thread, guild) {
    const threadInfo = {
      name: thread.name,
      id: thread.id,
      createdAt: dayjs(thread.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      guildName: guild.name,
      guildIcon: guild.iconURL({ format: 'png', size: 128 })
    };

    const css = `
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 2.5em;
          font-weight: 300;
        }
        .header .subtitle {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 1.1em;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          padding: 20px;
          background: #f8f9fa;
        }
        .info-item {
          background: white;
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .info-item h3 {
          margin: 0 0 10px 0;
          color: #FF69B4;
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .info-item p {
          margin: 0;
          font-size: 1.1em;
          font-weight: 500;
        }
        .messages {
          padding: 20px;
        }
        .message {
          display: flex;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 10px;
          border-left: 4px solid #FF69B4;
        }
        .avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .message-content {
          flex: 1;
        }
        .message-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        .username {
          font-weight: 600;
          color: #FF69B4;
          margin-right: 10px;
        }
        .timestamp {
          color: #666;
          font-size: 0.9em;
        }
        .message-text {
          line-height: 1.6;
          margin: 0;
        }
        .embed {
          background: #2f3136;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
          border-left: 4px solid #FF69B4;
        }
        .embed-title {
          color: white;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .embed-description {
          color: #dcddde;
          line-height: 1.4;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          border-top: 1px solid #e9ecef;
        }
        .footer p {
          margin: 0;
        }
      </style>
    `;

    const messagesHTML = messages.map(msg => {
      const timestamp = dayjs(msg.createdAt).format('YYYY-MM-DD HH:mm:ss');
      const avatar = msg.author.displayAvatarURL({ format: 'png', size: 128 });
      
      let content = msg.content;
      if (msg.embeds.length > 0) {
        content += msg.embeds.map(embed => `
          <div class="embed">
            ${embed.title ? `<div class="embed-title">${embed.title}</div>` : ''}
            ${embed.description ? `<div class="embed-description">${embed.description}</div>` : ''}
          </div>
        `).join('');
      }

      return `
        <div class="message">
          <img src="${avatar}" alt="Avatar" class="avatar">
          <div class="message-content">
            <div class="message-header">
              <span class="username">${msg.author.username}</span>
              <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-text">${content || '<em>No content</em>'}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Transcript - ${threadInfo.name}</title>
        ${css}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Ticket Transcript</h1>
            <p class="subtitle">${threadInfo.name}</p>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <h3>Ticket Name</h3>
              <p>${threadInfo.name}</p>
            </div>
            <div class="info-item">
              <h3>Server</h3>
              <p>${threadInfo.guildName}</p>
            </div>
            <div class="info-item">
              <h3>Created</h3>
              <p>${threadInfo.createdAt}</p>
            </div>
            <div class="info-item">
              <h3>Messages</h3>
              <p>${messages.length}</p>
            </div>
          </div>
          
          <div class="messages">
            ${messagesHTML}
          </div>
          
          <div class="footer">
            <p>Generated by CandyTicket Bot • ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async createTranscriptAttachment(thread, guild) {
    try {
      const { html, filename } = await this.generateTranscript(thread, guild);
      
      const buffer = Buffer.from(html, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: filename });
      
      return attachment;
    } catch (error) {
      console.error('Error creating transcript attachment:', error);
      throw error;
    }
  }
}

module.exports = TranscriptExporter; 