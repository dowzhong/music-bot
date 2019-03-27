require('dotenv').config()
const Youtube = require('simple-youtube-api')
const youtube = new Youtube(process.env.GOOGLEKEY)


youtube.searchVideos('aaaaaaaaaaaaidiaij[[[[]]', 1)
    .then(results => {
        console.log(results);
    })
    .catch(console.log)