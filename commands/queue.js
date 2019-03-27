const { RichEmbed } = require('discord.js')

module.exports = {
    run(message, args) {
        const guildData = message.client.database.get(message.guild.id)
        if (!guildData) {
            message.channel.send('<:error:560328317505372170> You have no songs queued')
            return
        }

        const songs = guildData.playlist.map((song, i) => {
            return `${i === 0 ? `**Now Playing:** ${song.title} [${song.requestedBy.displayName}]\n` : `**${i}.** ${song.title} [${song.requestedBy.displayName}]\n`}`
        })

        const embed = new RichEmbed()
            .setColor(0xA787F1)
            .setAuthor(`Song Queue`, message.client.user.displayAvatarURL)
            .setDescription(songs)
            .setTimestamp()
        message.channel.send({ embed })
    }
}