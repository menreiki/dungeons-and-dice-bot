var builder = require('botbuilder');
var restify = require('restify');
var moment = require('moment');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: '778a07c5-59dd-4068-a076-e2c327e6233c',//process.env.MICROSOFT_APP_ID,
    appPassword: 'oT4OzuNYjDrT0ELEXkSYx9h'//process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector, { persistConversationData: true });
server.post('/api/messages', connector.listen());

bot.dialog('/', function (session) {
    session.userData.name = session.message.user.name.match(/([^\s]+)/i)[0];
    session.send("Hi " + session.userData.name + ", I am a Dungeons and Dice bot. (hi)");
    session.conversationData.lastSendTime = session.lastSendTime;
    if (CheckDice(session.userData)) {
        session.beginDialog('/roll');
    } else {
        session.beginDialog('/start');
    }
});

bot.dialog('/start', [
    function (session) {
        builder.Prompts.text(session, "Our Dice Set includes D4, D6, D8, D10, D12, D20 and D100 dices. Which dice should I roll for you?");
    },
    function (session, results) {
        ParseDice(session.userData, results.response);
        ValidateDice(session);
    },
    function (session, results) {
        if (results.response) {
            session.userData.diceName = "D" + session.userData.diceNumber;
            Roll(session, function () {
                session.beginDialog('/roll');
            });
        } else {
            session.userData.diceNumber = 0;
            session.replaceDialog('/start', { reprompt: true });
        }
    }
]);

bot.dialog('/roll', [
    function (session) {
        if (session.userData.diceNumber === 0) {
            session.beginDialog('/start');
        }
        var msg = "What do you want to do next?";
        builder.Prompts.choice(session, msg, ["Roll " + session.userData.diceName, "Change the dice", "I'm good"], { retryPrompt: GetRetryPrompt(session, msg) });
    },
    function (session, results) {
        if (results.response.entity === "Roll " + session.userData.diceName) {
            Roll(session, function () {
                session.replaceDialog('/roll', { reprompt: true });
            });
        } else if (results.response.entity === "Change the dice") {
            session.beginDialog('/start');
        } else {
            session.send("Thank you for visiting us! See you soon ^__^");
            session.endConversation();
        }
    }
]);

function CheckDice(userData) {
    return userData.diceName && userData.diceCount && userData.diceCount > 0 && userData.diceNumber && userData.diceNumber > 0 && userData.diceNumber !== 13;
}

function ParseDice(userData, input) {
    var dices = [4, 6, 8, 10, 12, 13, 20, 100];
    var count = 1;
    var number = 0;
    var delta = 0;
    var name = null;
    input = input.replace(/\s+/g, '').toUpperCase();
    var names = input.match(/D\d+/i);
    if (names) {
        name = names[0];
        number = parseInt(name.match(/\d+/i)[0], 10);
        if (dices.indexOf(number) !== -1) {
            names = input.match(/\d+D\d+/i);
            if (names) {
                count = parseInt(names[0].match(/\d+/i)[0], 10);
                if (count > 1) {
                    name = names[0];
                }
            }
            names = input.match(/D\d+\+\d+/i);
            if (names) {
                delta = parseInt(names[0].match(/\d+/g)[1], 10);
                if (delta > 0) {
                    name = names[0];
                }
            }
            if (count > 1 && delta > 0) {
                name = input.match(/\d+D\d+\+\d+/i)[0];
            }
        } else {
            number = 0;
        }
    } else {
        var numbers = input.match(/\d+/i);
        if (numbers) {
            number = parseInt(numbers[0]);
            if (dices.indexOf(number) === -1) {
                number = 0;
            }
        }
    }
    userData.diceName = name;
    userData.diceCount = count;
    userData.diceNumber = number;
    userData.diceDelta = delta;
}

function ValidateDice(session) {
    var msg;
    if (CheckDice(session.userData)) {
        Roll(session, function () {
            session.beginDialog('/roll');
        });
    } else {
        if (session.userData.diceNumber === 13) {
            session.send("#lemmings16 is awesome!");
            session.userData.diceNumber = 0;
            session.replaceDialog('/start', { reprompt: true });
        } else if (session.userData.diceNumber === 0) {
            if (session.userData.diceCount > 1 || session.userData.diceDelta > 0) {
                msg = "It seems you forgot to specify the dice :p";
            } else if (session.userData.diceName) {
                msg = "Sorry " + session.userData.name + ", I can't roll the dice " + session.userData.diceName + " (think)";
            } else {
                msg = "Sorry " + session.userData.name + ", that's not a dice I know about :$ Try a different one..";
            }
            session.send(msg);
            session.replaceDialog('/start', { reprompt: true });
        } else if (session.userData.diceCount === 0) {
            msg = "You can't roll 0 dice! (mm)";
            session.send(msg);
            session.replaceDialog('/start', { reprompt: true });
        } else if (session.userData.diceNumber > 0) {
            msg = "Do you mean dice D" + session.userData.diceNumber.toString() + "? (wait)";
            builder.Prompts.confirm(session, msg, { retryPrompt: GetRetryPrompt(session, msg) });
            Roll(session, function () {
                session.beginDialog('/roll');
            });
        }
    }
}

function Roll(session, next) {
    var names = [];
    if (session.userData.diceCount === 1) {
        var n = GenerateNumber(session.userData.diceNumber, session.userData.diceDelta);
        names.push(n);
    } else {
        for (var i = 1; i <= session.userData.diceCount; i++) {
            var name = i + ": " + GenerateNumber(session.userData.diceNumber, session.userData.diceDelta);
            names.push(name);
        }
    }
    var msg = GetQuote() + "  \n\n" + names.join("  \n");
    session.send(msg);
    next();
}

function GenerateNumber(max, delta) {
    var number = Random(1, max) + delta;
    var name = number.toString();
    if (max === 20 && delta === 0) {
        if (number === 1) {
            name = name + "... you failed! |-)";
        } else if (number === 20) {
            name = name + "! Yay, that's a crit! (happy)";
        }
    }
    return name;
}

function GetQuote() {
    var quotes = [
        "What do the dice say..",
        "Don't roll the dice if you can't pay the price.",
        "Dice say nothing. They are dice.",
        "I will roll the dice and take delight in your suffering.",
        "God does not play dice.",
        "The dice of Zeus always fall luckily.",
        "One who doesn't throw the dice can never expect to score a six.",
        "Life is like the dice that, falling, still show a different face.",
        "Time to toss the dice",
        "Slice and Dice, Slice and Dice...",
        "A human, a half orc, and an elf walk into a bar. The dwarf walks under it.",
        "Rouges do it from behind."
    ];
    return quotes[Random(0, quotes.length - 1)];
}

function Random(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function GetRetryPrompt(session, msg) {
    return [
        "Sorry " + session.userData.name + ", I didn't get it. Please choose one of the following options.  \n\n" + msg,
        "You are way too fast for me! I didn't get that.  \n\n" + msg];
}

bot.use({
    botbuilder: function (session, next) {
        var last = session.conversationData.lastSendTime;
        var now = Date.now();
        var diff = moment.duration(now - last).asHours();
        if (last == undefined || diff > 1) {
            session.conversationData = {};
            session.beginDialog('/');
        } else {
            session.conversationData.lastSendTime = session.lastSendTime;
            next();
        }
    }
});