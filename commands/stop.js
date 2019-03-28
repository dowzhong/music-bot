module.exports = {
    usage: 'stop',
    description: 'Stops playing music.',
    async run(message, args) {
        const guildData = message.client.database.get(message.guild.id)
        if (!guildData) {
            message.channel.send('<:error:560328317505372170> I\'m not playing anything right now.')
            return
        }

        if (message.member.hasPermission('ADMINISTRATOR') || guildData.voiceChannel.members.size < 5) {
            stop()
            return
        }

        const requiredVotes = Math.round(guildData.voiceChannel.members.size / 2)
        const askForVote = await message.channel.send(`**VOTE:** Stop playing music? Required votes: ${requiredVotes}`)
        askForVote.react('👍')

        const vote = askForVote.createReactionCollector((reaction, user) => reaction.emoji.name === '👍' && !user.bot, { max: requiredVotes, time: 15000 })
        vote.on('end', votes => {
            if (votes.size < requiredVotes) {
                message.channel.send('👎 Not enough people voted. Music playing will not be stopped.')
                return
            }
            stop()
        })

        function stop() {
            guildData.connection.dispatcher.end('stopped')
            guildData.voiceChannel.leave()
            message.client.database.delete(message.guild.id)
            message.channel.send(`<:success:560328302523580416> Stopped playing music.`)
        }
    }
}