const fs = require('fs')
const path = require('path')
const DeckBuilder = require('deckbuilder')

let cah = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'cah.json'), 'utf8'))

let games = {}
let players = {}
let playersInGames = {}
let gamesInPlayers = {}

let friendlyGameId = 0

for(let ind = 0; ind < cah.whiteCards.length; ind++){
    let newCard = {
        id: ind.toString(),
        text: cah.whiteCards[ind]
    }
    cah.whiteCards[ind] = newCard
}
for(let ind = 0; ind < cah.blackCards.length; ind++){
    let newCard = {
        id: ind.toString(),
        text: cah.blackCards[ind].text,
        pick: cah.blackCards[ind].pick
    }
    cah.blackCards[ind] = newCard
}
let createGame = (creatorId)=>{
    let blackDeck = new DeckBuilder()
    blackDeck.add(cah.blackCards)
    blackDeck.shuffle()
    let whiteDeck = new DeckBuilder()
    whiteDeck.add(cah.whiteCards)
    whiteDeck.shuffle()
    let gameId = friendlyGameId.toString()
    games[gameId] = {
        blackCard: null,
        czar: null,
        whites: whiteDeck,
        blacks: blackDeck
    }
    friendlyGameId++
    if(friendlyGameId >= 1000) friendlyGameId = 0
    joinGame(creatorId, gameId)
}
let createPlayer = (playerId)=>{
    players[playerId] = {
        score: 0,
        hand: [],
        selections: []
    }
}
let joinGame = (playerId, gameId)=>{
    playersInGames[playerId] = gameId
    if(!gamesInPlayers[gameId]) gamesInPlayers[gameId] = []
    gamesInPlayers[gameId].push(playerId)
}
let beginGame = (gameId)=>{
    let game = games[gameId]
    for(let ind = 0; ind < gamesInPlayers[gameId].length; ind++){
        let playerId = gamesInPlayers[gameId][ind]
        let player = players[playerId]
        game.whites.draw(10)
        for(let ind = 1; ind<=10; ind++){
            player.hand.push(game.whites.drawn[game.whites.drawn.length - ind])
        }
    }
    game.czar = gamesInPlayers[gameId][Math.floor(Math.random()*Math.floor(gamesInPlayers[gameId].length))]
    game.blacks.draw(1)
    game.blackCard = game.blacks.drawn[game.blacks.drawn.length-1]
}
let readyToFlip = (gameId)=>{
    let game = games[gameId]
    let myPlayers = gamesInPlayers[gameId]
    for(let ind=0; ind<myPlayers.length; ind++){
        let playerId = myPlayers[ind]
        let player = players[playerId]
        if(playerId == game.czar) continue
        if(player.selections.length < game.blackCard.pick) return false
    }
    return true
}
let rotateCzar = (gameId) => {
    let game = games[gameId]
    let myPlayers = gamesInPlayers[gameId]
    let czarFound = false;
    let czarReplaced = false;
    for(let ind=0; ind<myPlayers.length; ind++){
        let playerId = myPlayers[ind]
        if(czarFound && !czarReplaced){
            game.czar = playerId
            czarReplaced = true
        }
        if(playerId == game.czar) czarFound = true
    }
    if(czarFound && !czarReplaced){
        game.czar = myPlayers[0]
        czarReplaced = true
    }
}
let leaveGame = (playerId) => {
    let gameId = playersInGames[playerId]
    let myPlayers = gamesInPlayers[gameId]

    for(let ind = 0; ind < myPlayers.length; ind++){
        if(myPlayers[ind]==playerId){
            myPlayers.splice(ind, 1)
            break;
        }
    }
    if(myPlayers.length == 0) delete games[gameId]
    delete playersInGames[playerId]
    delete players[playerId]
    createPlayer(playerId)
    if(games[gameId] && games[gameId].czar != playerId) return false
    else {
        rotateCzar(gameId)
        return true
    }
}
let reportGame = (gameId, msg)=>{
    let myPlayers = gamesInPlayers[gameId]
    let playerList = []
    for(let ind=0; ind<myPlayers.length; ind++){
        let playerId = myPlayers[ind]
        let player = players[playerId]
        let discordMember = msg.guild.members.cache.get(playerId)
        playerList.push(` - ${discordMember}: Selected: ${player.selections.length} Score: ${player.score}`)
    }
    let discordCzar = games[gameId].czar ? msg.guild.members.cache.get(games[gameId].czar) : "None"
    let card = games[gameId].blackCard ? games[gameId].blackCard : "None"
    return msg.channel.send(`**Game: ${gameId}**\n*Czar: ${discordCzar}*\nCard: ${card == "None" ? card : card.text}\nPick: ${card == "None" ? card : card.pick}\n${playerList.join('\n')}`)
}
let reportHand = (playerId) => {
    let myCards = []
    let player = players[playerId]
    for(let ind=0; ind<player.hand.length; ind++){
        let card = player.hand[ind]
        myCards.push(` **${ind}**: ${card.text}`)
    }
    return `**Your hand**:\n${myCards.join('\n')}`
}

module.exports = {
    triggers: ['cah'],
    onMessage: (msg, arguments, client)=>{
        let command = arguments.shift()
        if(!players[msg.author.id]) createPlayer(msg.author.id)
        switch(command){
            case "create":
                if(playersInGames[msg.author.id]) return msg.reply("You would have to leave your current game first.")
                createGame(msg.author.id)
                let createGameId = playersInGames[msg.author.id]
                return reportGame(createGameId, msg)
            case "join":
                if(playersInGames[msg.author.id]) return msg.reply("You would have to leave your current game first.")
                let joinGameId = arguments.shift()
                if(!games[joinGameId]) return msg.reply(`There is no such game: ${joinGameId}`)
                joinGame(msg.author.id, joinGameId)
                return reportGame(joinGameId, msg)
            case "begin":
                if(!playersInGames[msg.author.id]) return msg.reply("You would have to join a game first.")
                let beginGameId = playersInGames[msg.author.id]
                let myPlayers = gamesInPlayers[beginGameId]
                if(myPlayers.length >= 2) {
                    beginGame(beginGameId)
                    for(let ind=0; ind<myPlayers.length; ind++){
                        let playerId = myPlayers[ind]
                        let discordMember = msg.guild.members.cache.get(playerId)
                        discordMember.send(reportHand(playerId))
                    }
                    return reportGame(beginGameId, msg)
                }
                return msg.reply("Need at least 3 players.")
            case "play":
                if(!playersInGames[msg.author.id]) return msg.reply("You would have to join a game first.")
                let handIndex = arguments.shift()
                let playOnPlayer = players[msg.author.id]
                let playGameId = playersInGames[msg.author.id]
                let myPlayPlayers = gamesInPlayers[playGameId]
                let game = games[playGameId]
                if(game.czar == msg.author.id) return msg.reply("The czar may not play in their own game.")
                if(playOnPlayer.selections.length >= game.blackCard.pick) return msg.reply("You already have too many cards selected.")
                playOnPlayer.selections.push(handIndex)
                msg.reply(`Card **${handIndex}** selected.`)
                if(readyToFlip(playGameId)){
                    let playerLines = []
                    myPlayPlayers = shuffle(myPlayPlayers)
                    for(let ind = 0; ind < myPlayPlayers.length; ind++){
                        let flipPlayId = myPlayPlayers[ind]
                        let flipPlayer = players[flipPlayId]
                        let cardLines = []
                        for(let find = 0; find < flipPlayer.selections.length; find++){
                            cardLines.push(` - ${flipPlayer.hand[flipPlayer.selections[find]].text}`)
                        }
                        playerLines.push(`**${ind}**\n${cardLines.join('\n')}`)
                    }
                    msg.channel.send(`**The Flip**\n*${games[playGameId].blackCard.text}*\n${playerLines.join('\n')}`)
                }
                return;
            case "select": 
                if(!playersInGames[msg.author.id]) return msg.reply("You would have to join a game first.")
                let selectGameId = playersInGames[msg.author.id]
                let selectGame = games[selectGameId]
                if(selectGame.czar != msg.author.id) return msg.reply("Only the Czar can select the winner.")
                let selectIndex = arguments.shift()
                if(!gamesInPlayers[selectGameId][selectIndex]) return msg.reply(`Not a valid selection: ${selectGameId}`)
                let selectedPlayerId = gamesInPlayers[selectGameId][selectIndex];
                players[selectedPlayerId].score++
                let mySelectPlayers = gamesInPlayers[selectGameId]
                if(players[selectedPlayerId].score >= 10){
                    let discordSelectPlayer = msg.guild.members.cache.get(selectedPlayerId)
                    msg.channel.send(`${discordSelectPlayer} has won game **${selectGameId}**!`)
                    for(let ind=0; ind<mySelectPlayers.length; ind++){
                        let mySelectPlayerId = mySelectPlayers[ind]
                        leaveGame(mySelectPlayerId)
                    }
                    return
                }
                for(let ind=0; ind<mySelectPlayers.length; ind++){
                    let mySelectPlayerId = mySelectPlayers[ind]
                    let mySelectPlayer = players[mySelectPlayerId]
                    let mySelectDiscordPlayer = msg.guild.members.cache.get(mySelectPlayerId)
                    for(let sind in mySelectPlayer.selections){
                        let mySelectCard = mySelectPlayer.hand[sind]
                        for(let hind =0; hind<mySelectPlayer.hand.length; hind++){
                            let myInnerSelectCard = mySelectPlayer.hand[hind]
                            if(mySelectCard.id == myInnerSelectCard.id){
                                mySelectPlayer.hand.splice(hind, 1)
                                selectGame.whites.draw(1)
                                let mySelectNewCard = selectGame.whites.drawn[selectGame.whites.drawn.length-1]
                                mySelectPlayer.hand.push(mySelectNewCard)
                            }
                        }
                    }
                    mySelectPlayer.selections = []
                    mySelectDiscordPlayer.send(reportHand(mySelectPlayerId))
                }
                rotateCzar(selectGameId)
                selectGame.blacks.draw(1)
                selectGame.blackCard = selectGame.blacks.drawn[selectGame.blacks.drawn.length-1]
                return reportGame(selectGameId, msg)
            case "leave":
                if(!playersInGames[msg.author.id]) return msg.reply("You would have to join a game first.")
                return leaveGame(msg.author.id)
            case "games":
                let gameLines = []
                for(let gameId in games){
                    gameLines.push(` Game: **${gameId}**, Players: ${gamesInPlayers[gameId].length}`)
                }
                return msg.channel.send(`**Game Report**\n${gameLines.join('\n')}`)
            case "game":
                let gameId = arguments.shift()
                if(!games[gameId]) return msg.reply(`Couldn't find game **${gameId}**`)
                return reportGame(gameId, msg)
            case "hand":
                return msg.author.send(reportHand(msg.author.id))
            default: 
                return msg.reply(`Valid commands are: create, join, play, leave, begin, select, games, game, and hand.`)
        }
    }
}

const shuffle = (array)=>{
    let curind = array.length;
    let tempVal, randInd;
    while(0!==curind){
        randInd = Math.floor(Math.random()*curind);
        curind -= 1;
        tempVal = array[curind]
        array[curind] = array[randInd]
        array[randInd] = tempVal
    }
    return array
}