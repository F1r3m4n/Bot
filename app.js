var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

var model = process.env.MODEL;
var recognizer = new builder.LuisRecognizer(model);
var intent = new builder.IntentDialog({ recognizers: [recognizer] });


//=========================================================
// Bots Dialogs
//=========================================================

//bot.dialog('/', function (session) {
//    session.send("Hello World");
//});

bot.dialog('/', intent);

intent.matches('Profanity', [
    function (session, args, next) {
        // session.sendTyping();
        session.send("That's a little inappropriate...");
            session.endDialog();
    }
]);

