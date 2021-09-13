const {
    parentPort,
    workerData
} = require('worker_threads');

const ytSearch = require('yt-search');

ytSearch(workerData, function (err, results) {
    if (err) {
        throw err;
    }

    parentPort.postMessage(results.videos.map(video => {
        const { duration, ...others } = video;
        return others;
    }));
});