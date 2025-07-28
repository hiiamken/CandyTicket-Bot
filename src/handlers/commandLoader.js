const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function loadCommands(client) {
  client.commands = new Collection();
  
  const commandsPath = path.join(__dirname, '..', 'commands', 'slash');
  
  // Load commands from tickets directory
  const ticketsPath = path.join(commandsPath, 'tickets');
  if (fs.existsSync(ticketsPath)) {
    const ticketFiles = fs.readdirSync(ticketsPath).filter(file => file.endsWith('.js'));
    
    for (const file of ticketFiles) {
      const filePath = path.join(ticketsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.log(`⚠️ Command ${filePath} missing "data" or "execute" properties`);
      }
    }
  }
  
  // Load commands from root slash directory
  const slashFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of slashFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.log(`⚠️ Command ${filePath} missing "data" or "execute" properties`);
    }
  }
}

module.exports = { loadCommands }; 