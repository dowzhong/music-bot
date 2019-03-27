require('dotenv').config()

const prefix = 'm!'
const youtubeRegex = /^http(s)?:\/\/www\.youtube\.com\/watch\?v=.*$/g

const Youtube = require('simple-youtube-api')
const youtube = new Youtube(process.env.GOOGLEKEY)
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

client.on('error', err => console.error(err.message))

client.on('message', async message => {

    if (message.content.bot || !message.content.toLowerCase().startsWith(prefix)) { return }

    const args = message.content.split(' ')
    const command = args.shift().toLowerCase().slice(prefix.length)

    if (command === 'skip') {
        const guildData = client.database.get(message.guild.id)
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

    if (command === 'stop') {
        const guildData = client.database.get(message.guild.id)
        if (!guildData.connection) {
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
            client.database.delete(message.guild.id)
            message.channel.send(`<:success:560328302523580416> Stopped playing music.`)
        }

    }

    if (command === 'queue') {
        const guildData = client.database.get(message.guild.id)
        if (!guildData) {
            message.channel.send('<:error:560328317505372170> You have no songs queued')
            return
        }

        const songs = guildData.playlist.map((song, i) => {
            return `${i === 0 ? `**Now Playing:** ${song.title} [${song.requestedBy.displayName}]\n` : `**${i}.** ${song.title} [${song.requestedBy.displayName}]\n`}`
        })

        const embed = new Discord.RichEmbed()
            .setColor(0xA787F1)
            .setAuthor(`Song Queue`, client.user.displayAvatarURL)
            .setDescription(songs)
            .setTimestamp()
        message.channel.send({ embed })
    }

    if (command === 'play') {

        if (!message.member.voiceChannel) {
            message.channel.send('<:error:560328317505372170> You must be in a voice channel first!')
            return
        }

        if (!message.member.voiceChannel.joinable) {
            message.channel.send('<:error:560328317505372170> I cannot join your voice channel. You might need to modify my permissions or join another channel.')
            return
        }

        let [youtubeURL] = args[0].match(youtubeRegex) || []

        if (!youtubeURL) {
            try {
                const [video] = await youtube.searchVideos(args.join(' '), 1)
                if (!video) {
                    message.channel.send('<:error:560328317505372170> No videos came up with that search term.')
                    return
                }
                youtubeURL = 'https://www.youtube.com/watch?v=' + video.id
            } catch (err) {
                message.channel.send('<:error:560328317505372170> There was an error searching that video.')
            }
        }
        //is a youtube link. Handle that link with ytdl-core        

        try {
            const { title, author: { name: channelName }, length_seconds: length } = await ytdl.getBasicInfo(youtubeURL, { filter: 'audioonly' })
            let guildData = client.database.get(message.guild.id)
            if (guildData) {
                guildData.playlist.push({
                    title,
                    channelName,
                    length,
                    requestedBy: message.member,
                    song: youtubeURL,
                    voiceChannel: message.member.voiceChannel
                })

                message.channel.send(`<:success:560328302523580416> Added **${title} - ${channelName}** (${parseSeconds(length)}) to playlist.`)
                return
            }

            guildData = {
                playing: false,
                voiceChannel: message.member.voiceChannel,
                playlist: [
                    {
                        title,
                        channelName,
                        length,
                        requestedBy: message.member,
                        song: youtubeURL,
                    }
                ]
            }

            client.database.set(message.guild.id, guildData)

            try {
                const connection = await message.member.voiceChannel.join()
                guildData.connection = connection

                async function play(playlistItem) {
                    if (!playlistItem) {
                        guildData.voiceChannel.leave()
                        client.database.delete(message.guild.id)
                        return
                    }
                    const dispatcher = connection.playOpusStream(await ytdlDiscord(playlistItem.song, { passes: 3 }))
                    message.channel.send(`<:note:560419093375877130> Now playing **${playlistItem.title} - ${playlistItem.channelName}** (${parseSeconds(playlistItem.length)})`)
                    dispatcher.on('end', reason => {
                        const { playlist } = guildData
                        if (reason !== 'skipped') { playlist.shift() }
                        if (reason !== 'stopped') { play(playlist[0]) }
                    })
                    dispatcher.on('error', console.error)
                }

                play(guildData.playlist[0])

            } catch (err) {
                console.error(err)
                message.channel.send('<:error:560328317505372170> Encountered an unexpected error while joining your voice channel.')
            }

        } catch (err) {
            message.channel.send('<:error:560328317505372170> There was an error loading that video.')
        }
    }
})

client.login(process.env.TOKEN)

function parseSeconds(seconds) {
    const minutes = Math.floor(seconds / 60) || '00'
    const remainingSeconds = seconds % 60 || '00'
    return `${minutes}min ${remainingSeconds}s`
}