require('dotenv').config()

const fs = require('fs')

const decache = require('decache')

const prefix = 'm!'

const Discord = require('discord.js')
const client = new Discord.Client()

client.commands = fs.readdirSync('./commands').filter(file => file.endsWith('.js')).map(file => file.slice(0, -3))
client.database = new Map()

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`)
    console.log(await client.generateInvite())
    client.user.setActivity('m!help', { type: 'LISTENING' })
})

client.on('resume', replayed => client.user.setActivity('m!help', { type: 'LISTENING' }))

client.on('error', err => console.error(err.message))

client.on('message', async message => {

    if (message.content.bot || !message.content.toLowerCase().startsWith(prefix)) { return }

    const args = message.content.split(' ')
    const command = args.shift().toLowerCase().slice(prefix.length)

    if (client.commands.includes(command)) {
        try {
            require(`./commands/${command}.js`).run(message, args)
            decache(`./commands/${command}.js`)
        } catch (err) {
            console.error(err)
            message.channel.send('<:error:560328317505372170> An unexpected error occured when running that command.')
        }
    }

})

client.login(process.env.TOKEN)