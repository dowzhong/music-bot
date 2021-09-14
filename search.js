const {
    parentPort,
    workerData,
    threadId
} = require('worker_threads');

const ytSearch = require('yt-search');

parentPort.on('message', query => {
    setImmediate(() => {
        ytSearch(query, function (err, results) {
            if (err) {
                throw { query, err };
            }

            parentPort.postMessage({
                query,
                videos: results.videos.map(video => {
                    const { duration, ...others } = video;
                    return others;
                })
            });
        });
    });
});