var builder = require('botbuilder');
var restify = require('restify');

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
    session.send("Hi! I am a Dungeons and Dice bot.");
    if (ValidateDice(session.userData)) {
        session.beginDialog('/roll');
    } else {
        session.beginDialog('/start');
    }
});

bot.dialog('/start', [
    function (session) {
        builder.Prompts.text(session, "Our Dice Set includes D4, D6, D8, D10, D12, D20 and D100 dices. Which dice should I roll?");
    },
    function (session, results) {
        ParseDice(session, results.response);
        if (session.userData.diceNumber === 13) {
            session.send("#lemmings16 is awesome!");
            session.userData.diceNumber = 0;
            session.replaceDialog('/start', { reprompt: true });
        } else if (session.userData.diceNumber === 0) {
            var msg = "Sorry, I didn't recognise the dice. ";
            if (session.userData.diceName) {
                msg = "Can't roll dice " + session.userData.diceName + ". ";
            }
            session.send(msg);
            session.replaceDialog('/start', { reprompt: true });
        } else {
            if (session.userData.diceNumber > 0 && !session.userData.diceName) {
                builder.Prompts.confirm(session, "Do you want to roll dice D" + session.userData.diceNumber.toString() + "?");
            } else {
                Roll(session, function () {
                    session.beginDialog('/roll');
                });
            }
        } 
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
        builder.Prompts.choice(session, "Would you like to roll or change your dice " + session.userData.diceName + "?", ["Roll " + session.userData.diceName + "!", "Change the dice."]);
    },
    function (session, results) {
        if (results.response.entity.indexOf("Roll") !== -1) {
            Roll(session, function () {
                session.replaceDialog('/roll', { reprompt: true });
            });
        } else {
            session.beginDialog('/start');
        }
    }
]);

bot.dialog('/current', [
    function (session) {
        builder.Prompts.text(session, "Your current dice is " + session.userData.diceName);
    }
]);

function ValidateDice(userData) {
    return userData.diceName && userData.diceNumber && userData.diceNumber > 0 && userData.diceNumber !== 13;
}

function ParseDice(session, input) {
    var dices = [4, 6, 8, 10, 12, 13, 20, 100];
    session.userData.diceNumber = 0;
    session.userData.diceName = null;
    var name = input.match(/D\d+/i);
    var number;
    if (name) {
        session.userData.diceName = name[0].toUpperCase();
        number = parseInt(name[0].match(/\d+/i)[0]);
        if (dices.indexOf(number) !== -1) {
            session.userData.diceNumber = number;
        }
    } else {
        var numbers = input.match(/\d+/i);
        if (numbers) {
            number = parseInt(numbers[0]);
            if (dices.indexOf(number) !== -1) {
                session.userData.diceNumber = number;
            }
        }
    }
}

function Roll(session, next) {
    var n = Random(1, session.userData.diceNumber);
    session.send(n.toString());
    next();
}

function Random(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}
