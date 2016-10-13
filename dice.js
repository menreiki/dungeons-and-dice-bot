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
    session.send("Greetings from the darkness, " + GetUserName(session.message.user.name) + "! I will guide you on your journey through dark dungeons ^_^");
    session.conversationData.lastSendTime = session.lastSendTime;
    if (CheckDice(session.userData)) {
        session.beginDialog('/roll');
    } else {
        session.beginDialog('/start');
    }
});

bot.dialog('/start', [
    function (session) {
        builder.Prompts.text(session, "I have the following dices in my dice bag: D4, D6, D8, D10, D12, D20 and D100.  \nWhich one should I roll for you?");
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
        var msg = "What is your next action, " + GetUserName(session.message.user.name) + "?";
        var name = GetUserName(session.message.user.name);
        builder.Prompts.choice(session, msg, ["Roll " + session.userData.diceName, "Switch the dice", "Leave the dungeon"], { retryPrompt: GetRetryPrompt(name, msg) });
    },
    function (session, results) {
        if (results.response.entity === "Roll " + session.userData.diceName) {
            Roll(session, function () {
                session.replaceDialog('/roll', { reprompt: true });
            });
        } else if (results.response.entity === "Switch the dice") {
            session.beginDialog('/start');
        } else {
            session.send("Good luck in your journey, " + GetUserName(session.message.user.name) + "! Fear not, I'm always there for you <3");
            session.endConversation();
        }
    }
]);

function EasterEgg(session) {
    session.userData.diceNumber = 0;
    var card = new builder.HeroCard(session)
        .title("Lemmings I/O")
        .subtitle("This chatbot was produced by three Lemmings: Eva, Tanya and Vaida. Lemmings is an organization of creative, tech savvy and very curious people. If you hear of us for the first time, it will definitely not be the last one.")
        .tap(builder.CardAction.openUrl(session, "https://lemmings.io/"))
        .buttons([builder.CardAction.openUrl(session, "https://www.facebook.com/lemmings.io", 'Join community now!')])
        .images([builder.CardImage.create(session, "http://www.evalettner.com/images/projects/lemmings/lemmings.png")]);
    var reply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments([card]);
    session.send(reply);
}

function CheckDice(userData) {
    return userData.diceName &&
        userData.diceCount && userData.diceCount > 0 &&
        userData.diceNumber && userData.diceNumber > 0 &&
        userData.diceNumber !== 13;
}

function ParseDice(userData, input) {
    input = input.replace(/\s+/g, '').toUpperCase();
    userData.diceCount = GetDiceCount(input);
    userData.diceNumber = GetDiceNumber(input);
    userData.diceDelta = GetDiceDelta(input);
    userData.diceName = GetDiceName(input, userData.diceCount, userData.diceNumber, userData.diceDelta);
}

function GetDiceName(input, count, number, delta) {
    var dices = [4, 6, 8, 10, 12, 13, 20, 100];
    var name = null;
    var names = input.match(/D\d+/i);
    if (names) {
        number = parseInt(names[0].match(/\d+/i)[0], 10);
        if (dices.indexOf(number) === -1) {
            name = names[0];
        } else {
            name = "D" + number.toString();
            if (count > 1) {
                name = count.toString() + name;
            }
            if (delta > 0) {
                name = name + "+" + delta.toString();
            }
        }
    }
    return name;
}

function GetDiceNumber(input) {
    var dices = [4, 6, 8, 10, 12, 13, 20, 100];
    var number = 0;
    var name = input.match(/D\d+/i);
    if (name) {
        number = parseInt(name[0].match(/\d+/i)[0], 10);
        if (dices.indexOf(number) === -1) {
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
    return number;
}

function GetDiceCount(input) {
    var count = 1;
    var name = input.match(/\d+D\d+/i);
    if (name) {
        count = parseInt(name[0].match(/\d+/i)[0], 10);
    } else {
        name = input.match(/\d+D/i);
        if (name) {
            count = parseInt(name[0].match(/\d+/i)[0], 10);
        }
    }
    return count;
}

function GetDiceDelta(input) {
    var delta = 0;
    var name = input.match(/D\d+\+\d+/i);
    if (name) {
        delta = parseInt(name[0].match(/\d+/g)[1], 10);
    } else {
        name = input.match(/\d+\+D\d+/i);
        if (name) {
            delta = parseInt(name[0].match(/\d+/i)[0], 10);
        } else {
            name = input.match(/D\+\d+/i);
            if (name) {
                delta = parseInt(name[0].match(/\d+/i)[0], 10);
            } else {
                name = input.match(/\d+\+D/i);
                if (name) {
                    delta = parseInt(name[0].match(/\d+/i)[0], 10);
                }
            }
        }
    }
    return delta;
}

function ValidateDice(session) {
    var msg;
    if (CheckDice(session.userData)) {
        Roll(session, function () {
            session.beginDialog('/roll');
        });
    } else {
        if (session.userData.diceNumber === 13) {
            EasterEgg(session);
            session.replaceDialog('/start', { reprompt: true });
        } else if (session.userData.diceNumber === 0) {
            if (session.userData.diceName) { //d5, 5d5, 5d+5
                msg = session.userData.diceName + "?! Are absolutely you sure? ;)";
            } else if (session.userData.diceCount > 1 || session.userData.diceDelta > 0) { //5d+5, 5d, d+5
                msg = "It seems you forgot to specify the dice ;p";
            } else {
                msg = "Forgive me " + GetUserName(session.message.user.name) + ", that's not a dice I know about 8-) Try a different one..";
            }
            session.send(msg);
            session.replaceDialog('/start', { reprompt: true });
        } else if (session.userData.diceCount === 0) {//0d12
            msg = "Tell me exactly how I can roll 0 dice! :P";
            session.send(msg);
            session.replaceDialog('/start', { reprompt: true });
        } else if (session.userData.diceNumber > 0) { //12
            msg = "By any chance.. do you mean dice D" + session.userData.diceNumber.toString() + "? ;)";
            var name = GetUserName(session.message.user.name);
            builder.Prompts.confirm(session, msg, { retryPrompt: GetRetryPrompt(name, msg) });
        } else {
            Roll(session, function () {
                session.beginDialog('/roll');
            });
        }
    }
}

function Roll(session, next) {
    var names = [];
    if (session.userData.diceNumber === 6 && session.userData.diceDelta === 0) {
        Roll6(session);
    } else {
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
    }
    next();
}

function GenerateNumber(max, delta) {
    var number = Random(1, max) + delta;
    var name = number.toString();
    if (max === 20 && delta === 0) {
        if (number === 1) {
            name = name + "... you failed! :o";
        } else if (number === 20) {
            name = name + "! Yay, that's a crit! ^_^";
        }
    }
    return name;
}

function Roll6(session) {
    var attachments = [];
    var card = null;
    if (session.userData.diceCount === 1) {
        card = GenerateCard6(session);
        attachments.push(card);
    } else {
        for (var i = 1; i <= session.userData.diceCount; i++) {
            card = GenerateCard6(session);
            var name = i.toString() + ": " + card.title;
            card.title(name);
            attachments.push(card);
        }
    }
    var reply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(attachments);
    session.send(reply);
}

function GenerateCard6(session) {
    var number = Humanize6(Random(1, 6));
    var link = "http://www.evalettner.com/images/projects/lemmings/" + number + ".png";
    var card = new builder.ThumbnailCard(session)
        .title(number)
        .images([builder.CardImage.create(session, link)]);
    return card;
}

function Humanize6(number) {
    switch (number) {
        case 1:
            return "one";
        case 2:
            return "two";
        case 3:
            return "three";
        case 4:
            return "four";
        case 5:
            return "five";
        case 6:
            return "six";
        default:
            return "six";
    }
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
        "Rouges do it from behind.",
        "Dice, Camera, Action!"
    ];
    return quotes[Random(0, quotes.length - 1)];
}

function GetUserName(fullName) {
    var names = [
        fullName.match(/([^\s]+)/i)[0],
        "Traveler",
        "Dark Lord",
        "Your Highness",
        "My Lord",
        "Dungeon Master",
        "Master"
    ];
    return names[Random(0, names.length - 1)];
}

function Random(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function GetRetryPrompt(name, msg) {
    return [
        "My deepest apologies, " + name + ", I didn't quite get it O:)  \n\n" + msg,
        "No hush and no rush! :)  \n\n" + msg,
        "This sounds like one powerful spell! :) But now is not the right time for it.  \n\n" + msg,
        "Please concentrate, " + name + "!  \n\n" + msg
    ];
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