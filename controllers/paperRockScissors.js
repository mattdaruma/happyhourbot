function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
const responses = ["Paper", "Rock", "Scissors"]

module.exports = {
    triggers: ['prs', 'rps'],
    onMessage: (msg, arguments) => {
        let paperRockScissors = arguments.shift();
        let myRoll = responses[getRandomInt(0, 2)];
        if (paperRockScissors.includes('pap')) {
            let victory = myRoll == "Scissors";
            let tie = myRoll == "Paper";
            let reaction = victory ? "Yay!  Cut you deep!" : tie ? "Oh well.  White on white." : "Dang!  You were all over me.";
            return msg.reply(`${myRoll}! ${reaction}`);
        }
        if (paperRockScissors.includes('roc')) {
            let victory = myRoll == "Paper";
            let tie = myRoll == "Rock";
            let reaction = victory ? "Yay!  I'm all over you!" : tie ? "Oh well.  Stuck between a rock and a hard place." : "Dang!  Crushed.";
            return msg.reply(`${myRoll}! ${reaction}`);
        }
        if (paperRockScissors.includes('sci')) {
            let victory = myRoll == "Rock";
            let tie = myRoll == "Scissors";
            let reaction = victory ? "Yay!  Crushed you!" : tie ? "Oh well.  Can't cut the blade." : "Dang!  Cut me deep.";
            return msg.reply(`${myRoll}! ${reaction}`);
        }
        return msg.reply("Valid commands are: paper, rock, and scissors.")
    }
};