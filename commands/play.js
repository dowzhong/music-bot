const youtubeRegex = /^http(s)?:\/\/www\.youtube\.com\/watch\?v=.*$/g

const Youtube = require('simple-youtube-api')
const youtube = new Youtube(process.env.GOOGLEKEY)
const ytdlDiscord = require('ytdl-core-discord')
const ytdl = require('ytdl-core')

const { parseSeconds } = require('../utils.js')


module.exports = {
    usage: 'play {search term | youtube url}',
    description: 'Plays a song given a youtube URL or search.',
    async run(message, args) {
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

        try {
            const { title, author: { name: channelName }, length_seconds: length } = await ytdl.getBasicInfo(youtubeURL, { filter: 'audioonly' })
            let guildData = message.client.database.get(message.guild.id)
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

            message.client.database.set(message.guild.id, guildData)

            try {
                const connection = await message.member.voiceChannel.join()
                guildData.connection = connection

                async function play(playlistItem) {
                    if (!playlistItem) {
                        guildData.voiceChannel.leave()
                        message.client.database.delete(message.guild.id)
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
}