const fs = require('fs');
const path = require('path');
const token = fs.readFileSync(path.join(__dirname, 'token.txt'), 'utf8');
const Discord = require('discord.js');
const client = new Discord.Client();
const myTag = "DarumaBot#8854";

const controllers = fs.readdirSync(path.join(__dirname, 'controllers'));
controllerObjs = []
const controllerMap = {};
for(let ind=0; ind<controllers.length; ind++){
  let controllerFileName = controllers[ind];
  let controller = require(path.join(__dirname, 'controllers', controllerFileName));
  controllerObjs.push(controller)
  console.log('Registering Controller', controllerFileName, `Triggers: ${controller.triggers.join(', ')}`)
  for(let cind=0; cind<controller.triggers.length; cind++){
    controllerMap[controller.triggers[cind]] = controllerObjs[controllerObjs.length-1];
  }
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
  let content = msg.content.toLowerCase().trim();
  let firstMention = msg.mentions.users.first();
  if(!firstMention || !firstMention.tag) return;
  if(firstMention.tag == myTag){
    content = content.replace(`<@!${firstMention.id}>`, "").replace(`<@&${firstMention.id}>`, "").replace(`<@${firstMention.id}>`, "").trim();
    let arguments = content.split(' ');
    let controllerTrigger = arguments.shift();
    if(controllerMap[controllerTrigger]){
      controllerMap[controllerTrigger].onMessage(msg, arguments);
    }else{
      let triggerLines = []
      for(let ind=0; ind<controllerObjs.length; ind++){
        triggerLines.push(controllerObjs[ind].triggers.join(', '))
      }
      msg.reply(`Valid commands are: ${triggerLines.join(', ')}`);
    }
  }
});
 
client.login(token);