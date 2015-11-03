var config = {
	irc : {
		channels: ['#LowSociety'],
		server: 'irc.snoonet.org',
		name: 'LowSocietyTest',
		//password: 'password',
		owner : 'LowSociety'
	},
	attentionSpan : 10000, // Keep conversation going for [attentionSpan] milliseconds
	chattiness : 1000, // Randomly respond to one (1) out of [chattiness] messages
	quotesFolder : "./quotes/"
};
module.exports = config;