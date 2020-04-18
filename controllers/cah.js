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
        player.hand = game.whites.draw(10)
    }
    game.czar = gamesInPlayers[gameId][Math.floor(Math.random()*Math.floor(gamesInPlayers[gameId].length))]
    game.blackCard = game.blacks.draw(1)[0]
}
let selectCard = (playerId, cardId)=>{
    let gameId = playersInGames[playerId]
    let game = games[gameId]
    if(players[playerId].selections.length < game.blackCard.pick){
        players[playerId].selections.push(cardId)
        return true
    }
    return false
}
let readyToFlip = (gameId)=>{
    let game = games[gameId]
    let myPlayers = gamesInPlayers[gameId]
    for(let ind=0; ind<myPlayers.length; ind++){
        let playerId = myPlayers[ind]
        let player = players[playerId]
        if(player.selections.length < game.blackCard.pick) return false
    }
    return true
}
let selectWinner = (gameId, cardId)=>{
    let game = games[gameId]
    let myPlayers = gamesInPlayers[gameId]
    let topScore = 0;
    for(let ind=0; ind<myPlayers.length; ind++){
        let playerId = myPlayers[ind]
        let player = players[playerId]

        if(player.selections.includes(cardId)) player.score++
        if(player.score > topScore) topScore = player.score
        for(let sind=0; sind<player.selections.length; sind++){
            let selectedId = player.selections[sind]
            for(let hind=0; hind<player.hand.length; hind++){
                let card = player.hand[hind]
                if(card.id == selectedId){
                    player.hand.splice(hind, 1)
                    player.hand.push(game.whites.draw(1)[0])
                }
            }
        }
    }
    if(topScore > 10) return true
    else {
        rotateCzar(gameId)
        return false
    }
}
let rotateCzar = (gameId) => {
    let game = games[gameId]
    let myPlayers = gamesInPlayers[gameId]
    let czarFound = false;
    let czarReplaced = false;
    for(let ind=0; ind<myPlayers.length; ind++){
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
    let card = games[gameId].blackCard ? games[gameId].blackCard.text : "None"
    return msg.reply(`**Game: ${gameId}**\n*Czar: ${discordCzar}*\nCard: ${card}\n${playerList.join('\n')}`)
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

//events
//- open game
//- join game
//- begin game
//- - deal
//- leave game
//- select card



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
                let joinGameId = playersInGames[msg.author.id]
                if(!games[joinGameId]) return msg.reply(`There is no such game: ${joinGameId}`)
                joinGame(msg.author.id, joinGameId)
                return reportGame(joinGameId, msg)
            case "begin":
                if(!playersInGames[msg.author.id]) return msg.reply("You would have to join a game first.")
                let beginGameId = playersInGames[msg.author.id]
                let myPlayers = gamesInPlayers[beginGameId]
                if(myPlayers.length >= 3) {
                    beginGame(beginGameId)
                    for(let ind=0; ind<myPlayers.length; ind++){
                        let playerId = myPlayers[ind]
                        let discordMember = msg.guild.members.cache.get(playerId)
                        discordMember.send(reportHand(playerId))
                    }
                    return reportGame(beginGameId, msg)
                }
            case "play":
                if(!playersInGames[msg.author.id]) return msg.reply("You would have to join a game first.")
                let handIndex = arguments.shift()
                let playOnPlayer = players[msg.author.id]
                let playGameId = playersInGames[msg.author.id]
                let game = games[playGameId]
                if(playOnPlayer.selections.length >= game.blackCard.pick) return msg.reply("You already have too many cards selected.")
                playOnPlayer.selections.push(playOnPlayer.hand[handIndex].id)
                return msg.reply(`Card **${handIndex}** selected.`)
                break;
            case "leave":
                if(!playersInGames[msg.author.id]) return msg.reply("You would have to join a game first.")
                leaveGame(msg.author.id)
                break;
            case "games":
                let gameLines = []
                for(let gameId in games){
                    gameLines.push(` Game: **${gameId}**, Players: ${gamesInPlayers[gameId].length}`)
                }
                msg.reply(`**Game Report**\n${gameLines.join('\n')}`)
                break;
            case "game":
                let gameId = arguments.shift()
                if(!games[gameId]) return msg.reply(`Couldn't find game **${gameId}**`)
                return reportGame(gameId, msg)
            case "hand":
                msg.author.send(reportHand(msg.author.id))
                break;
            default: 
                return msg.reply(`Valid commands are: create, join, play, leave, games, players, hand, and score.`)
        }
    }
}