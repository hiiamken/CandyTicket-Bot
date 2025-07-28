const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { loadCommands } = require('./handlers/commandLoader');
const { loadEvents } = require('./handlers/eventLoader');
const configLoader = require('./utils/configLoader');
const DatabaseManager = require('./database/DatabaseManager');
require('dotenv').config();

// Create client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize collections
client.commands = new Collection();

// Initialize database manager
const dbManager = new DatabaseManager(configLoader);

// ASCII Art Banner
const BANNER = `
                                                                         
                                   ,--.                                  
  ,----..     ,---,              ,--.'|    ,---,                         
 /   /   \   '  .' \         ,--,:  : |  .'  .' \`\         ,---,         
|   :     : /  ;    '.    ,\`--.'\`|  ' :,---.'     \       /_ ./|         
.   |  ;. /:  :       \   |   :  :  | ||   |  .\`\  |,---, |  ' :         
.   ; /--\` :  |   /\   \  :   |   \ | ::   : |  '  /___/ \.  : |         
;   | ;    |  :  ' ;.   : |   : '  '; ||   ' '  ;  :.  \  \ ,' '         
|   : |    |  |  ;/  \   \'   ' ;.    ;'   | ;  .  | \  ;  \`  ,'         
.   | '___ '  :  | \  \ ,'|   | | \   ||   | :  |  '  \  \    '          
'   ; : .'||  |  '  '--'  '   : |  ; .''   : | /  ;    '  \   |          
'   | '/  :|  :  :        |   | '\`--'  |   | '\` ,/      \  ;  ;          
|   :    / |  | ,'        '   : |      ;   :  .'         :  \  \         
 \   \ .'  \`--''          ;   |.'      |   ,.'            \  ' ;         
  \`---\`            ,----, '---'        '---'               \`--\`          
                 ,/   .\`|                                     ,----..    
  .--.--.      ,\`   .'  :                ,---,       ,---,   /   /   \   
 /  /    '.  ;    ;     /       ,--,   .'  .' \`\  ,\`--.' |  /   .     :  
|  :  /.\` /.'___,/    ,'      ,'_ /| ,---.'     \ |   :  : .   /   ;.  \ 
;  |  |--\` |    :     |  .--. |  | : |   |  .\`\  |:   |  '.   ;   /  \` ; 
|  :  ;_   ;    |.';  ;,'_ /| :  . | :   : |  '  ||   :  |;   |  ; \ ; | 
 \  \    .\`----'  |  ||  ' | |  . . |   ' '  ;  :'   '  ;|   :  | ; | ' 
  \`----.   \   '   :  ;|  | ' |  | | '   | ;  .  ||   |  |.   |  ' ' ' : 
  __ \  \  |   |   |  ':  | | :  ' ; |   | :  |  ''   :  ;'   ;  \; /  | 
 /  /\`--'  /   '   :  ||  ; ' |  | ' '   : | /  ; |   |  ' \   \  ',  /  
'--'.     /    ;   |.' :  | : ;  ; | |   | '\` ,/  '   :  |  ;   :    /   
  \`--'---'     '---'   '  :  \`--'   \;   :  .'    ;   |.'    \   \ .'    
                       :  ,      .-./|   ,.'      '---'       \`---\`      
                        \`--\`----'    '---'                               
                                                                         

                    🎫 TICKET SYSTEM 🎫                      
                    Created by hiiamken                      
`;

// Startup messages
const STARTUP_MESSAGES = [
  '🎯 Initializing CandyTicket Bot...',
  '📁 Loading configuration files...',
  '🗄️ Setting up database connection...',
  '⚙️ Loading commands and events...',
  '🚀 Deploying slash commands...',
  '🔗 Connecting to Discord...',
  '✅ Bot is ready to serve!'
];

// Deploy commands function
async function deployCommands() {
  try {
    console.log('🚀 Deploying slash commands...');
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commands = [];
    
    // Get all command data
    client.commands.forEach(command => {
      commands.push(command.data.toJSON());
    });
    
    console.log(`📝 Deploying ${commands.length} command(s)...`);
    
    // Deploy to guild (faster for development)
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('✅ Commands deployed to guild successfully!');
    } else {
      // Deploy globally (takes up to 1 hour to update)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Commands deployed globally successfully!');
      console.log('⏰ Note: Global commands may take up to 1 hour to appear');
    }
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    throw error;
  }
}

// Load commands and events
async function initializeBot() {
  try {
    // Display banner
    console.log(BANNER);
    console.log('');
    
    // Show startup progress
    for (let i = 0; i < STARTUP_MESSAGES.length; i++) {
      const message = STARTUP_MESSAGES[i];
      process.stdout.write(`\r${message}`);
      
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Clear line and show completion
      process.stdout.write('\r' + ' '.repeat(message.length) + '\r');
      console.log(`✅ ${message}`);
    }
    
    console.log('');

    // Load configuration files
    if (!configLoader.loadAll()) {
      throw new Error('Failed to load configuration files');
    }
    
    // Initialize database
    if (!await dbManager.initialize()) {
      throw new Error('Failed to initialize database');
    }
    
    // Make database available globally
    global.db = dbManager;
    
    // Load commands
    await loadCommands(client);
    
    // Load events
    await loadEvents(client);
    
    // Initialize cooldown map
    global.ticketCooldowns = new Map();
    
    // Deploy commands
    await deployCommands();
    
  } catch (error) {
    console.error('❌ Error initializing bot:', error);
    process.exit(1);
  }
}

// Event when bot is ready
client.once('ready', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 BOT IS READY! 🎉                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ ${client.user.tag} logged in successfully!`);
  console.log(`🎯 Bot is running on ${client.guilds.cache.size} server(s)`);
  console.log(`🎫 Ticket system is active and ready to serve!`);
  console.log('');
  
  // Set status using branding from config
  const branding = configLoader.get('branding', {});
  const serverName = branding.server_name || 'Candy Community';
  client.user.setActivity(`🎫 ${serverName} Support`, { type: 'WATCHING' });
});

// Error handling
client.on('error', (error) => {
  console.error('❌ Bot error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Start bot
async function startBot() {
  await initializeBot();
  
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error('❌ DISCORD_TOKEN not found in .env file');
    process.exit(1);
  }
  
  try {
    await client.login(token);
  } catch (error) {
    console.error('❌ Login error:', error);
    process.exit(1);
  }
}

// Khởi động bot
startBot(); 