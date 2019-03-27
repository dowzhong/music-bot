require('dotenv').config()

const prefix = 'm!'
const youtubeRegex = /^http(s)?:\/\/www\.youtube\.com\/watch\?v=.*$/g

const youtube = require('youtube-search')
const ytdlDiscord = require('ytdl-core-discord')
const ytdl = require('ytdl-core')

const youtubeOptions = {
    maxResults: 1,
    key: process.env.GOOGLEKEY
}

const Discord = require('discord.js')
const client = new Discord.Client()

client.database = new Map()

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`)
    console.log(await client.generateInvite())
})

client.on('message', async message => {

    if (message.content.bot || !message.content.toLowerCase().startsWith(prefix)) { return }

    const args = message.content.split(' ')
    const command = args.shift().toLowerCase().slice(prefix.length)

    if (command === 'play') {

        if (!message.member.voiceChannel) {
            message.channel.send('❌ You must be in a voice channel first!')
            return
        }

        if (!message.member.voiceChannel.joinable) {
            message.channel.send('❌ I cannot join your voice channel. You might need to modify my permissions or join another channel.')
            return
        }

        const youtubeLink = args[0].match(youtubeRegex)
        if (youtubeLink) {
            //is a youtube link. Handle that link with ytdl-core
            try {
                const { title, author: { name: channelName }, length_seconds: length } = await ytdl.getBasicInfo(youtubeLink[0], { filter: 'audioonly' })
                const guildPlaylist = client.database.get(message.guild.id)

                if (guildPlaylist) {
                    guildPlaylist.playlist.push({
                        title,
                        channelName,
                        length,
                        requestedBy: message.member,
                        song: youtubeLink[0]
                    })

                    message.channel.send(`✔ Added **${title} - ${channelName} (${parseSeconds(length)})** to playlist.`)
                    return
                }

                client.database.set(message.guild.id, {
                    playing: false,
                    playlist: [
                        {
                            title,
                            channelName,
                            length,
                            requestedBy: message.member,
                            song: youtubeLink[0]
                        }
                    ]
                })

                try {
                    const connection = await message.member.voiceChannel.join()


                    async function play(playlistItem) {
                        const dispatcher = connection.playOpusStream(await ytdlDiscord(playlistItem.song, { passes: 3 }))
                        message.channel.send(`✔ Started playing **${playlistItem.title} - ${playlistItem.channelName} (${parseSeconds(playlistItem.length)})**`)
                        dispatcher.on('end', reason => {
                            const { playlist } = client.database.get(message.guild.id)
                            playlist.shift()
                            play(playlist[0])
                        })
                    }

                    play(client.database.get(message.guild.id).playlist[0])

                } catch (err) {
                    console.error(err)
                    message.channel.send('❌ Encountered an unexpected error while joining your voice channel.')
                }

            } catch (err) {
                message.channel.send('❌ There was an error loading that video.')
            }
        }

    //     //input is a search term.
    //     youtube(
    //         'music', youtubeOptions, function (err, results) {
    //             if (err) return console.log(err)
    //             console.log(results)
    //         })
    // }

})

function parseSeconds(seconds) {
    const minutes = Math.floor(seconds / 60) || '00'
    const remainingSeconds = seconds % 60 || '00'
    return `${minutes} min ${remainingSeconds}s`
}

client.login(process.env.TOKEN)