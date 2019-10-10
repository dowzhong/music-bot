module.exports = {
    usage: 'skip {song number?}',
    description: 'Skips a song. Don\'t provide a number to skip the currently playing song.',
    async run(message, args) {
        const guildData = message.client.database.get(message.guild.id);
        if (!guildData) {
            message.channel.send('<:error:560328317505372170> You have no songs to skip.');
            return;
        }
        
        const songToSkip = parseInt(args[0]) || 0;

        if (message.member.hasPermission('ADMINISTRATOR') || guildData.voiceChannel.members.size < 5) {
            skip();
            return;
        }

        const requiredVotes = Math.round(guildData.voiceChannel.members.size / 2) - 1;
        const askForVote = await message.channel.send(`<:ballot:560656726572007444> Skip \`${guildData.playlist[songToSkip].title}\`? Click on the reaction to vote. Required votes: ${requiredVotes}`);
        askForVote.react(message.client.emojis.get('560658869777334282'));

        const vote = askForVote.createReactionCollector((reaction, user) => reaction.emoji.id === '560658869777334282' && !user.bot, { max: requiredVotes, time: 60000 });
        vote.on('end', votes => {
            askForVote.delete();
            if (votes.size < requiredVotes) {
                message.channel.send('<:negativevote:560659609887440896> Not enough people voted. Song will not be skipped.');
                return;
            }
            skip();
        })

        function skip() {
            const [deleted] = guildData.playlist.splice(songToSkip, 1);
            message.channel.send(`<:success:560328302523580416> Skipped \`${deleted.title} - ${deleted.channelName}\`.`);

            if (songToSkip === 0) { guildData.connection.dispatcher.end('skipped'); }
        }
    }
}