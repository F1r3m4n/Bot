var restify = require('restify');
var builder = require('botbuilder');
var client = require('twilio')(process.env.accountSid, process.env.authToken);

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

//=========================================================
// LUIS model for recognising intent
//=========================================================

var model = process.env.MODEL;
var recognizer = new builder.LuisRecognizer(model);
var intent = new builder.IntentDialog({ recognizers: [recognizer] });
var intent2 = new builder.IntentDialog({ recognizers: [recognizer] });
var intent3 = new builder.IntentDialog({ recognizers: [recognizer] });
var intent4 = new builder.IntentDialog({ recognizers: [recognizer] });



//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', intent);
bot.dialog('/tariff_eoc', intent2);
bot.dialog('/data', intent3);
bot.dialog('/tariff_inlife', intent4);

intent.matches('Greeting', [

    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile_name');
        } else {
            session.send('Hello %s!', session.userData.name);
        }
    },

    function (session, results) {
        session.send("Great %s! That matches our records. How can I help you today?", session.userData.name);
    }
]);


bot.dialog('/profile_name', [
    function (session, args) {

        if (args && args.reprompt && !session.userData.name) {
            builder.Prompts.text(session, "Enter the first name you used to open your account: Eg 'John' ")
        }
        else if (session.userData.usageQuery) {
            builder.Prompts.text(session, "Hi there, before I can look at your usage I need to get your personal details. Can you please give me your first name as it's registered with VF?")
        }
        else if (session.userData.upgradeQuery) {
            builder.Prompts.text(session, "Hi there, before I can look at your contract details I need to get your personal details. Can you please give me your first name as it's registered with VF?")
        }
         else {
            builder.Prompts.text(session, "Hi, I am Winston, VF's trial Chatbot. Before we continue, could you please give me your first name as it's registered with VF?");
        }
    },
    function (session, results, next) {

        var matched = results.response.match(/[a-zA-Z]+/g);
        var name = matched ? matched.join('') : '';
        if (name.length < 10) {
            session.userData.name = results.response
            session.replaceDialog('/profile_phone', { reprompt: false })
        } else {
            session.replaceDialog('/profile_name', { reprompt: true });
        }

    }
 ]);


bot.dialog('/profile_phone', [

    function (session, args) {
            if (args && args.reprompt) {
                builder.Prompts.text(session, "Enter the number using a format of either: '0741234567' or '074 1234567', '(01234) 123-4567'")
            } else {
                builder.Prompts.text(session, "Thanks "+ session.userData.name + ", Can you also provide me with your current VF number?");
            }
        },
    function (session, results) {
            var matched = results.response.match(/\d+/g);
            var number = matched ? matched.join('') : '';
            if (number.length == 10 || number.length == 11) {
                session.userData.phone = results.response
		if (session.userData.name == 'Giovanna'){
            session.userData.bundle_size = 2;
		    session.userData.bundle_cost = 26;
		    session.userData.usage_tot = 3.6;
		    session.userData.usage_oob = 1.6;
		    session.userData.last_bill = 33.60;
		    session.userData.tt_contract_end = 4;
            session.userData.tt_upgrade = 1;
		    session.userData.lifetime = 'in-life';
		}
		else{
		    session.userData.bundle_size = 10;
            session.userData.bundle_cost = 45;
            session.userData.usage_tot = 6;
            session.userData.usage_oob = 0;
            session.userData.last_bill = 45;
            session.userData.tt_contract_end = 2;
            session.userData.tt_upgrade = 0;
            session.userData.lifetime = 'eoc';
		}
                session.endDialog();
            } else {
                session.replaceDialog('/profile_phone', { reprompt: true });
            }
        }
]);

intent.matches('GetUsage', [

    function (session, args, next) {
        if (!session.userData.name) {
            session.userData.usageQuery = true
            session.beginDialog('/profile_name');
        } else {

	        if (session.userData.usage_oob > 0){
                session.send("Ok %(name)s, your usage last month was %(usage_tot)s GB, %(usage_oob)s GB more than your bundle allowance",session.userData);
                session.endDialog();
	    }
	        else{
		        session.userData.frac = session.userData.usage_tot*100/session.userData.bundle_size;
		        session.send("Ok %(name)s, your usage last month was %(usage_tot)s GB, %(frac)s percent of your bundle allowance",session.userData);
                session.endDialog();
	        }
        }
    },
    function (session, results) {
        if(session.userData.usage_oob > 0){
                session.send("Ok %(name)s, I confirmed your personal data, your usage last month was %(usage_tot)s GB, %(usage_oob)s GB more than your bundle allowance",session.userData);
                session.endDialog();
            }
        else{
                session.userData.frac = session.userData.usage_tot*100/session.userData.bundle_size;
                session.send("Ok %(name)s, I confirmed your personal data, your usage last month was %(usage_tot)s GB, %(frac)s percent of your bundle allowance",session.userData);
                session.endDialog();
        }
    }
]);



intent.matches('UpgradeTime', [
    function (session, args, next) {
            if (!session.userData.name) {
                session.userData.upgradeQuery = true
                session.beginDialog('/profile_name');
            } else {
                session.userData.skip_confirm = true
                next();

            }
        },
    function (session, results) {
        session.userData.upgradeQuery = true
        if (session.userData.skip_confirm){
            if (session.userData.lifetime == 'eoc'){
                //session.send("%(name)s, you are currently eligible for an upgrade!",session.userData);
                builder.Prompts.confirm(session, ""+ session.userData.name + ",you are currently eligible for an upgrade! Would you like to discuss your options?");
                //session.endDialog();
            }
            else{
                //session.send("%(name)s, your contract ends in %(tt_contract_end)s months. You can however upgrade in %(tt_upgrade)s month or I can move you to a different bundle until then",session.userData);
                builder.Prompts.confirm(session, "" + session.userData.name + ", your contract ends in " + session.userData.tt_contract_end + " months. You can however upgrade in " + session.userData.tt_upgrade + " month or I can move you to a different bundle until then. Would you like to discuss your options?");
            }
        }
        else{
            if (session.userData.lifetime == 'eoc'){
                builder.Prompts.confirm(session, "OK "+ session.userData.name + ", I confirmed your personal data and you are currently eligible for an upgrade! Would you like to discuss your options?");
            }
            else{
                //session.send("Ok %(name)s, I confirmed your personal data, your contract ends in %(tt_contract_end)s months. You can however upgrade in %(tt_upgrade)s month or I can move you to a different bundle until then",session.userData);
                builder.Prompts.confirm(session, "OK "+ session.userData.name + ", I confirmed your personal data and your contract ends in " + session.userData.tt_contract_end + " months. You can however upgrade in " + session.userData.tt_upgrade + " month or I can move you to a different bundle until then. Would you like to discuss your options?");
            }
        }
    },
    function (session, results, next) {
        if (results.response){
            builder.Prompts.text(session,"Do you have something in mind or would you like me to recommend something for you?")
        }
        else{
            session.endDialog();
        }
    },
    function (session, results) {
         if (session.userData.lifetime == 'eoc'){
             session.replaceDialog('/tariff_eoc');
         }
         else{
             session.replaceDialog('/tariff_inlife');
         }
    }
]);



intent2.matches('MoreData', [
    function (session, args, next) {
        var data = builder.EntityRecognizer.findEntity(args.entities, 'MoreData');
        //session.userData.data = data.entity

	// Prompt for Data
        if (!session.userData.data) {
            session.send("Ok, Let's look at bundles with more data. How much many GB do you need per month");
	        session.beginDialog('/data');
        } else {
            next();
        }

    },
    function (session, results, next) {

        if (session.userData.data) {
            session.send('Let me check what bundles we have with around %d GB.', session.userData.data);
	        next();
        } else {
            next();
        }
    },
    function (session, results, next){
	    session.send("The Red Value XL bundle has " +  session.userData.data + " GB, unlimited minutes and texts. Prices depend on the device but they start from £30 monthly. Would you like to look at devices or do you want to look at a different bundle?")
        session.endDialog();
    }
]);

intent2.matches('GiveRecommendation', [
    function (session, args, next) {
            session.send('Ok! Based on your recent usage I have the following recommendations for you. Both include a free annual subscription to Spotify that will allow you stream music without worrying about going out of bundle.');
            //var msg = new builder.Message(session)
            //            .attachments([{
            //                contentType: "image/jpeg",
            //                contentUrl: "http://store.storeimages.cdn-apple.com/4973/as-images.apple.com/is/image/AppleInc/aos/published/images/i/ph/iphone7/gallery6/iphone7-gallery6-2016?wid=1670&hei=1282&fmt=jpeg&qlt=95&op_sharpen=0&resMode=bicub&op_usm=0.5,0.5,0,0&iccEmbed=0&layer=comp&.v=1473278890397"
            //            }]);
            //session.send(msg);

            var msg = new builder.Message(session)
                .attachmentLayout(builder.AttachmentLayout.carousel)
                .attachments([
                    new builder.HeroCard(session)
                        .title("iPhone 7 with a 10 GB Red Value Bundle")
                        .subtitle("The new iPhone 7 starting from £53 monthly with an upfront cost of £130. Includes Spotify subscription for 12 months.")
                        .images([
                            builder.CardImage.create(session, "http://store.storeimages.cdn-apple.com/4662/as-images.apple.com/is/image/AppleInc/aos/published/images/i/ph/iphone7/jetblack/iphone7-jetblack-select-2016?wid=1200&hei=630&fmt=jpeg&qlt=95&op_sharpen=0&resMode=bicub&op_usm=0.5,0.5,0,0&iccEmbed=0&layer=comp&.v=1472430076339")
                                .tap(builder.CardAction.showImage(session, "http://store.storeimages.cdn-apple.com/4662/as-images.apple.com/is/image/AppleInc/aos/published/images/i/ph/iphone7/jetblack/iphone7-jetblack-select-2016?wid=1200&hei=630&fmt=jpeg&qlt=95&op_sharpen=0&resMode=bicub&op_usm=0.5,0.5,0,0&iccEmbed=0&layer=comp&.v=1472430076339")),
                        ])
                        .buttons([
                            builder.CardAction.imBack(session, "select:100", "Select this"),
                            builder.CardAction.imBack(session, "neither:neither", "Neither of these")
                        ]),
                    new builder.HeroCard(session)
                        .title("iPhone 7 with a 10 GB Red Value Bundle")
                        .subtitle("The new iPhone 7 Plus starting from £58 monthly with an upfront cost of £220. Includes Spotify subscription for 12 months.")
                        .images([
                            builder.CardImage.create(session, "http://store.storeimages.cdn-apple.com/4662/as-images.apple.com/is/image/AppleInc/aos/published/images/i/ph/iphone7/plus/iphone7-plus-silver-select-2016?wid=1200&hei=630&fmt=jpeg&qlt=95&op_sharpen=0&resMode=bicub&op_usm=0.5,0.5,0,0&iccEmbed=0&layer=comp&.v=1472430122140")
                                .tap(builder.CardAction.showImage(session, "http://store.storeimages.cdn-apple.com/4662/as-images.apple.com/is/image/AppleInc/aos/published/images/i/ph/iphone7/plus/iphone7-plus-silver-select-2016?wid=1200&hei=630&fmt=jpeg&qlt=95&op_sharpen=0&resMode=bicub&op_usm=0.5,0.5,0,0&iccEmbed=0&layer=comp&.v=1472430122140")),
                        ])
                        .buttons([
                            builder.CardAction.imBack(session, "select:101", "Select this"),
                            builder.CardAction.imBack(session, "neither:neither", "Neither of these")
                        ])
                ]);
            builder.Prompts.choice(session, msg, "select:100|select:101|back|neither");

            //builder.Prompts.confirm(session,"Does this interest you?");

    },
        function (session, results) {
            var action, item;
            var kvPair = results.response.entity.split(':');
            switch (kvPair[0]) {
                case 'select':
                    action = 'selected';
                    break;
                case 'back':
                    action = 'back';
                    break;
                case 'neither':
                    action = 'neither';
                    break;
            }
            switch (kvPair[1]) {
                case '100':
                    item = "the iPhone 7 with Red Value Bundle";
                    break;
                case '101':
                    item = "the iPhone 7 Plus with Red Value Bundle";
                    break;
            }
            if (action == 'selected'){
                session.send('You %s "%s"', action, item);
                session.send("I'll go ahead and make the switch for you. If you don't need anything else say bye to end the conversation");
                session.userData.data = 10;
                session.userData.switched = 1;
                session.endDialog();
            }
            else if (action == 'neither'){
                builder.Prompts.text(session,"Could you specify the data allowance that would better suit you ?");
            }
            else{
                session.endDialog();
            }
        },
        function(session){
            session.replaceDialog('/tariff_eoc');
        }

 ]);

//    },
//    function (session, results, next) {
//        if (results.response){
//           session.send("Great, I'll go ahead and make the switch for you. If you don't need anything else say bye to end the conversation");
//           session.userData.data = 10;
//           session.userData.switched = 1;
//           session.endDialog();
//        }
//        else{
//           builder.Prompts.text(session,"Could you specify the data allowance that would better suit you ?");
//        }
//    },
//    function(session){
//            session.replaceDialog('/tariff_eoc');
//    }
//]);



intent4.matches('GiveRecommendation', [
    function (session, args, next) {
        builder.Prompts.confirm(session,"As you are still in-life you can only switch to a larger bundle. Customers similar to you tend to switch to a 4 GB data allowance. You could move te the Red L bundle for an extra £4.50 a month. Does this interest you?");
    },
    function (session, results, next) {
        if (results.response){
           session.send("Great, I'll go ahead and make the switch for you. If you don't need anything else say bye to end the conversation");
           session.userData.data = 4;
           session.userData.switched = 1;
           session.endDialog();
        }
        else{
           builder.Prompts.text(session,"Could you specify the data allowance that would better suit you ?");
        }
    },
    function(session){
        session.replaceDialog('/tariff_inlife');
    }
]);


intent3.matches('SpecifyData', [
    function (session, args, next) {
	    var data = builder.EntityRecognizer.findEntity(args.entities,'builtin.number');
	    session.userData.data = data.entity
        session.endDialog();
    }
]);


intent4.matches('SpecifyData', [
    function (session, args, next) {
	    var data = builder.EntityRecognizer.findEntity(args.entities,'builtin.number');
	    session.userData.data = data.entity
	    builder.Prompts.confirm(session,"The Red Red Value Bundle has " +  session.userData.data + " GB, unlimited minutes and texts. That would be an extra £10 monthly. Does this interest you?")
    },
    function (session, results, next) {
            if (results.response){
               session.send("Great, I'll go ahead and make the switch for you. If you don't need anything else say bye to end the conversation");
               session.endDialog();
            }
            else{
               builder.Prompts.text(session,"Could you specify the data allowance that would better suit you ?");
            }
        },
    function(session){
            session.replaceDialog('/tariff_inlife');
    }
]);



intent2.matches('SpecifyData', [
    function (session, args, next) {
	    var data = builder.EntityRecognizer.findEntity(args.entities,'builtin.number');
	    session.userData.data = data.entity
	    builder.Prompts.confirm(session,"The Red Red Value Bundle has " +  session.userData.data + " GB, unlimited minutes and texts. Prices depend on the device but they start from £68 monthly. Does this interest you?")
    },
    function (session, results, next) {
            if (results.response){
               session.send("Great, I'll go ahead and make the switch for you. If you don't need anything else say bye to end the conversation");
               session.endDialog();
            }
            else{
               builder.Prompts.text(session,"Could you specify the data allowance that would better suit you ?");
            }
        },
    function(session){
            session.replaceDialog('/tariff_eoc');
    }
]);




intent.matches('Profanity', [
    function (session, args, next) {
        session.send("That's a little inappropriate...");
    }
]);

intent.matches('NotInScope', [
    function (session, args, next) {
        session.send("Unfortunately I can only help with Bundle Upgrades and Recommendations. Is there something relevant I can help you with?");
    }
]);

intent.matches('TalkToAgent', [
    function (session, args, next) {
        session.send("Are you sure I cannot help you?");
    }
]);

intent.matches('Thanking', [
    function (session, args, next) {
        session.send("Glad I could help");
    }
]);

intent.matches('CanYouHelp', [
    function (session, args, next) {
        session.send("I can try helping, whats your concern?");
    }
]);

intent2.matches('Profanity', [
    function (session, args, next) {
            session.send("I don't endorse this kind of behaviour");
    }
]);

intent.matches('EndConversation', [
    function (session, args, next) {
            if(session.userData.switched == 1){
                client.messages.create({
                           to: session.userData.phone,
                           from: '+441233800666',
                           body: 'Thanks ' + session.userData.name + '! I hope you enjoy your ' + session.userData.data + ' GB of data every month!'
                       }, function (err, message) {
                           console.log(message.sid);
                       });
            }
            else if(session.userData.data != null){
                 client.messages.create({
                           to: session.userData.phone,
                           from: '+441233800666',
                           body: 'Thanks ' + session.userData.name + '! Feel free to get back in touch if you decide you want ' + session.userData.data + ' GB of data every month!'
                       }, function (err, message) {
                           console.log(message.sid);
                       });
            }
            session.userData.name = null
            session.userData.phone = null
            session.userData.upgradeQuery = null
            session.userData.usageQuery = null
            session.send("Ok… Goodbye.")

            session.endConversation();
    }
]);

intent2.matches('EndConversation', [
    function (session, args, next) {
            if(session.userData.switched == 1){
                client.messages.create({
                           to: session.userData.phone,
                           from: '+441233800666',
                           body: 'Thanks ' + session.userData.name + '! I hope you enjoy your ' + session.userData.data + ' GB of data every month!'
                       }, function (err, message) {
                           console.log(message.sid);
                       });
            }
            else if(session.userData.data != null){
                 client.messages.create({
                           to: session.userData.phone,
                           from: '+441233800666',
                           body: 'Thanks ' + session.userData.name + '! Feel free to get back in touch if you decide you want ' + session.userData.data + ' GB of data every month!'
                       }, function (err, message) {
                           console.log(message.sid);
                       });
            }
            session.userData.name = null
            session.userData.phone = null
            session.userData.upgradeQuery = null
            session.userData.usageQuery = null
            session.send("Ok… Goodbye.")
            session.endConversation();
    }
]);



intent.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. Could you please rephrase that."));
intent2.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. Could you please rephrase that."));
intent3.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. Could you please rephrase that."));
intent4.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. Could you please rephrase that."));


