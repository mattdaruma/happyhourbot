const fs = require('fs');
const path = require('path');
const token = fs.readFileSync(path.join(__dirname, 'token.txt'), 'utf8');
const Discord = require('discord.js');
const client = new Discord.Client();
const myId = 698250911272796170;

const controllers = fs.readdirSync(path.join(__dirname, 'controllers'));
const controllerMap = {};
for(let ind=0; ind<controllers.length; ind++){
  let controllerFileName = controllers[ind];
  let controller = require(path.join(__dirname, 'controllers', controllerFileName));
  console.log('Registering Controller', controllerFileName, controller.command)
  controllerMap[controller.command] = controller;
}

client.on('ready', () => {
  client.user.setPresence({
    game: {
      name: 'Happy Hour'
      , type: 'Damaging Liver'
    }
    , status: 'Happy'
  })
  console.log(`Logged in as ${client.user.tag}!`);
});
 
client.on('message', msg => {
  let content = msg.content;
  let firstMention = msg.mentions.members.first();
  if(!firstMention || !firstMention.user) return;
  if(firstMention.user.id == myId){
    content = content.replace("<@!698250911272796170>", "").trim();
    let arguments = content.split(' ');
    let controllerCommand = arguments.shift();
    if(controllerMap[controllerCommand]){
      controllerMap[controllerCommand].onMessage(msg, arguments);
    }else{
      msg.reply("What's up, buddy?");
    }
  }
});
 
client.login(token);