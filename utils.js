function parseSeconds(seconds) {
    let minutes = Math.floor(seconds / 60) || '00'
    let remainingSeconds = seconds % 60 || '00'

    if (minutes.toString().length < 2) { minutes = '0' + minutes }
    if (remainingSeconds.toString().length < 2) { remainingSeconds = '0' + remainingSeconds }

    return `${minutes}:${remainingSeconds}`
}

module.exports = { parseSeconds }