const youtubeRegex = /^http(s)?:\/\/www\.youtube\.com\/watch\?v=.*$/g

const ytSearch = require('yt-search')
const ytdlDiscord = require('ytdl-core-discord')
const ytdl = require('ytdl-core')

const { parseSeconds } = require('../utils.js')


module.exports = {
    usage: 'play {search term | youtube url}',
    description: 'Plays a song given a youtube URL or search.',
    async run(message, args) {

        if (!message.member.voiceChannel) {
            message.channel.send('<:error:560328317505372170> You must be in a voice channel first!');
            return;
        }

        if (!message.member.voiceChannel.joinable) {
            message.channel.send('<:error:560328317505372170> I cannot join your voice channel. You might need to modify my permissions or join another channel.');
            return;
        }

        if (!args.length) {
            message.channel.send('<:error:560328317505372170> Please specify either a search term or a Youtube URL.');
            return;
        }

        let [youtubeURL] = args[0].match(youtubeRegex) || [];

        await message.channel.send('<:searching:561046688547209217> Looking up the video...');

        if (!youtubeURL) {
            try {
                const [video] = await searchVideos(args.join(' '));
                if (!video) {
                    await message.channel.send('<:error:560328317505372170> No videos came up with that search term.');
                    return;
                }
                youtubeURL = video.url;
            } catch (err) {
                console.error(err);
                await message.channel.send('<:error:560328317505372170> There was an error searching that video.');
                return;
            }
        }

        try {
            const video = await ytdl.getBasicInfo(youtubeURL, { filter: 'audioonly' });
            const title = video.player_response.videoDetails.title;
            const length = video.player_response.videoDetails.lengthSeconds;
            const channelName = video.player_response.videoDetails.author.name;
            let guildData = message.client.database.get(message.guild.id);
            if (guildData) {
                guildData.playlist.push({
                    title,
                    channelName,
                    length,
                    requestedBy: message.member,
                    song: youtubeURL,
                    voiceChannel: message.member.voiceChannel
                });

                message.channel.send(`<:success:560328302523580416> Added \`${title} - ${channelName}\` (${parseSeconds(length)}) to playlist.`);
                return;
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
            };

            message.client.database.set(message.guild.id, guildData);

            try {
                const connection = await message.member.voiceChannel.join();
                guildData.connection = connection;

                async function play(playlistItem) {
                    if (!playlistItem) {
                        guildData.voiceChannel.leave();
                        message.client.database.delete(message.guild.id);
                        return;
                    }
                    const dispatcher = connection.playOpusStream(await ytdlDiscord(playlistItem.song, { highWaterMark: 10000000, quality: 'highestaudio' }), { passes: 3 });
                    playlistItem.startedPlaying = Date.now();
                    message.channel.send(`<:note:560419093375877130> Now playing \`${playlistItem.title} - ${playlistItem.channelName}\` (${parseSeconds(playlistItem.length)})`);
                    dispatcher.on('end', reason => {
                        const { playlist } = guildData;
                        if (reason !== 'skipped') { playlist.shift(); }
                        if (reason !== 'stopped') { play(playlist[0]); }
                    });
                    dispatcher.on('error', console.error);
                }

                play(guildData.playlist[0])

            } catch (err) {
                console.error(err);
                await message.channel.send('<:error:560328317505372170> Encountered an unexpected error while joining your voice channel.');
            }

        } catch (err) {
            console.error(err);
            await message.channel.send('<:error:560328317505372170> There was an error loading that video.');
        }
    }
}

function searchVideos(query) {
    return new Promise((resolve, reject) => {
        ytSearch(query, function (err, results) {
            if (err) {
                reject(err);
                return;
            }
            resolve(results.videos);
        });
    });
}
