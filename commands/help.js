const { RichEmbed } = require('discord.js')

module.exports = {
    usage: 'queue {search|youtube URL}',
    description: 'Shows current playlist.',
    exclude: true,
    async run(message, args) {
        const helpMessage = message.client.commands.map(command => {
            const { usage, description, exclude } = require(`./${command}.js`)
            if (exclude) { return false }
            return `**${usage}**: ${description}`
        }).filter(Boolean).join('\n')
        const embed = new RichEmbed()
            .setAuthor('Here are the commands you an use:', message.client.user.displayAvatarURL)
            .setDescription(helpMessage)
            .setTimestamp()
            .setColor(0xA787F1)
        await message.channel.send({ embed })
    }
}