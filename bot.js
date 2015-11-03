var MarkovIRC = function(config) {
	
	this.config = config;
	var irc = require('irc');
	
	var fs = require('fs');
	var	MarkovChain = require('markovchain').MarkovChain;
	
	this.error = function(error) {
		if(error) {
			console.log(error);
			process.exit();
		}
	};
	
	this.speakingTo = [];
	
	this.amISpeakingWith = function(user, channel) {
		for(var i = 0; i < this.speakingTo.length; i++) {
			if(this.speakingTo[i].user == user && this.speakingTo[i].channel == channel) {
				return this.speakingTo[i].uuid;
			}
		}
		return false;
	};
	
	this.iAmSpeakingWith = function(user, channel) {
		var uuid = Math.random() * 10000;
		this.speakingTo.unshift({
			user : user,
			channel : channel,
			uuid : uuid
		});
		var self = this;
		console.log("Speaking with " + user + " in " + channel + " for " + (config.attentionSpan/1000) + " seconds");
		setTimeout(function() {
			for(var i = self.speakingTo.length-1; i >= 0; i--) {
				if(self.speakingTo[i].uuid ===  uuid) {
					self.speakingTo.splice(i,1);
					console.log("Stopped speaking with " + user + " in " + channel + " after " + (config.attentionSpan/1000) + " seconds");
					return;
				}
			}
			return;
		},
		config.attentionSpan
		);
	};
	
	this.sayWithDelay = function(to, text, callback) {
		var self = this;
		setTimeout(
			function() {
				self.bot.say(to, text);
				callback();
			},
			(text.length*20) + (~~(Math.random()*1000))
		);
	};
	
	this.getLongestWord = function(text) {
		return text.replace(config.irc.name,"").split(" ").reduce(function (a, b) { return a.length > b.length? a : b; });
	};
	
	this.cleanOutput = function(text) {
		text = text.replace(/^([^"]+)?"([^"]+)?$/,"$1$2");
		return text;
	};
	
	this.markovStart = function(seed) {
		return function(wordList) {
			var tmpList = null;
			if(seed != null) {
				seed = seed.replace(/[\.\,\?\!]$/g,"");
				tmpList = Object.keys(wordList).filter(function(w) { return w.replace(/[\.\,\?\!]$/g,"").toLowerCase() == seed.toLowerCase(); });
			}
			if(seed == null || tmpList.length == 0) {
				tmpList = Object.keys(wordList);
			}
			if(tmpList.length == 0) {
				return "hej";
			}
			return tmpList[~~(Math.random()*tmpList.length)];
		};
	};
	
	this.getMarkov = function(source, text, callback) {
		var self = this;
		fs.exists(source, function(exists) {
			if(exists) {
				var quotes = new MarkovChain({ files: source });
				var seed = self.getLongestWord(text);
				console.log(seed);
				quotes.start(self.markovStart(seed)).end().process(callback);
			}
		});
	};
	
	this.message = function(from, to, text, message) {
		
		// Skip messages from bots
		if(from.indexOf("bot") > -1) {
			return false;
		}
		// Be a slave
		if(from == config.irc.owner && to == config.irc.name) {
			var parameters = text.split(" ");
			var action = this.bot[parameters[0]];
			if(typeof action == "function") {
				parameters.shift();
				console.log(parameters);
				action.apply(this.bot, parameters);
			}
			return true;
		}
		
		var mentioned = text.toLowerCase().indexOf(config.irc.name.toLowerCase()) > -1; // Respond to people
		var conversation = mentioned? false : (!/^[A-Za-z0-9\_\|]+:/.test(text) && this.amISpeakingWith(from,to)); // Respond to people you're talking to
		var chatty = mentioned || conversation? false : (Math.random() * config.chattiness < 1); // If you just want to talk
		
		var speak = mentioned || conversation || chatty;
		
		if(
			speak
		) {
		console.log("mentioned",mentioned);
		console.log("conversation",conversation);
		console.log("chatty",chatty);
			var self = this;
			this.getMarkov(
				config.quotesFolder + to + ".txt",
				text,
				function(err, s) {
					console.log(s);
					s = self.cleanOutput(s);
					self.sayWithDelay(to.indexOf("#") == 0? to : from, s, function() {
						if(!chatty) {
							self.iAmSpeakingWith(from, to);
						}
					});
				}
			);
			if(mentioned) {
				return;
			}
		}
		
		// Create word bank
		fs.appendFile(config.quotesFolder + to + '.txt', text + "\r\n", this.error);
	};
	
	this.init = function() {
		this.bot = new irc.Client(
			this.config.irc.server,
			this.config.irc.name,
			{
				channels: this.config.irc.channels,
				sasl: true,
				autoRejoin: true,
				userName: this.config.irc.name,
			   // password: lemmingPrefs.ircConfig.botAuthPassword
			}
		);
		var self = this;
		this.bot.addListener('error', this.error);
		this.bot.addListener('message', function(from,to,text,message) {
			self.message.call(self,from,to,text,message);
		});
	};
};

var config = require('./config.js');
console.log(config);
var bot = new MarkovIRC(config);
bot.init();