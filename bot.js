require('dotenv').config()

const fs = require('fs')

const prefix = 'm!'

const Discord = require('discord.js')
const client = new Discord.Client()

const commands = fs.readdirSync('./commands').filter(file => file.endsWith('.js')).map(file => file.slice(0, -3))

client.database = new Map()

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`)
    console.log(await client.generateInvite())
})

client.on('error', err => console.error(err.message))

client.on('message', async message => {

    if (message.content.bot || !message.content.toLowerCase().startsWith(prefix)) { return }

    const args = message.content.split(' ')
    const command = args.shift().toLowerCase().slice(prefix.length)

    if (commands.includes(command)) {
        require(`./commands/${command}.js`).run(message, args)
    }

})

client.login(process.env.TOKEN)