function parseSeconds(seconds) {
    const minutes = Math.floor(seconds / 60) || '00'
    const remainingSeconds = seconds % 60 || '00'
    return `${minutes}min ${remainingSeconds}s`
}

module.exports = { parseSeconds }