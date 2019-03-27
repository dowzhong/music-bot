module.exports = {
    usage: 'skip {song number?}',
    description: 'Skips a song. Don\'t provide a number to skip the currently playing song.',
    async run(message, args) {
        const guildData = message.client.database.get(message.guild.id)
        if (!guildData) {
            message.channel.send('<:error:560328317505372170> You have no songs to skip.')
            return
        }

        if (message.member.hasPermission('ADMINISTRATOR') || guildData.voiceChannel.members.size < 5) {
            skip()
            return
        }

        const requiredVotes = Math.round(guildData.voiceChannel.members.size / 2)
        const askForVote = await message.channel.send(`**VOTE:** Skip current song? Required votes: ${requiredVotes}`)
        askForVote.react('👍')

        const vote = askForVote.createReactionCollector((reaction, user) => reaction.emoji.name === '👍' && !user.bot, { max: requiredVotes, time: 15000 })
        vote.on('end', votes => {
            if (votes.size < requiredVotes) {
                message.channel.send('👎 Not enough people voted. Song will not be skipped.')
                return
            }
            skip()
        })

        function skip() {
            const songToSkip = parseInt(args[0]) || 0

            const [deleted] = guildData.playlist.splice(songToSkip, 1)
            message.channel.send(`<:success:560328302523580416> Skipped **${deleted.title} - ${deleted.channelName}**.`)

            if (songToSkip === 0) { guildData.connection.dispatcher.end('skipped') }
        }
    }
}