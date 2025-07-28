const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];

// Load commands from tickets directory
const ticketsPath = path.join(__dirname, 'src', 'commands', 'slash', 'tickets');
if (fs.existsSync(ticketsPath)) {
  const ticketFiles = fs.readdirSync(ticketsPath).filter(file => file.endsWith('.js'));
  
  for (const file of ticketFiles) {
    const filePath = path.join(ticketsPath, file);
    const command = require(filePath);
    
    if ('data' in command) {
      commands.push(command.data.toJSON());
      console.log(`✅ Loaded command: ${command.data.name}`);
    }
  }
}

// Load commands from root slash directory
const slashPath = path.join(__dirname, 'src', 'commands', 'slash');
const slashFiles = fs.readdirSync(slashPath).filter(file => file.endsWith('.js'));

for (const file of slashFiles) {
  const filePath = path.join(slashPath, file);
  const command = require(filePath);
  
  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  }
}

// Initialize REST
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`🚀 Starting to deploy ${commands.length} commands...`);

    // Deploy to specific guild (faster)
    if (process.env.GUILD_ID) {
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`✅ Deployed ${data.length} commands to guild ${process.env.GUILD_ID}`);
    } else {
      // Deploy globally (may take 1 hour to update)
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ Deployed ${data.length} commands globally`);
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})(); 