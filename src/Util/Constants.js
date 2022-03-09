module.exports.http = {
    version: 8,
    api: 'https://discordapp.com/api'
};

module.exports.version = "1.0.0";

module.exports.IPCEvents = {
    '0': 'EVAL',
    '1': 'MESSAGE',
    '2': 'BROADCAST',
    '3': 'READY',
    '4': 'SHARDREADY',
    '5': 'SHARDRECONNECT',
    '6': 'SHARDRESUME',
    '7': 'SHARDDISCONNECT',
    '8': 'MASTEREVAL',
    '9': 'RESTARTALL',
    '10': 'RESTART',
    '11': 'FETCHUSER',
    '12': 'FETCHCHANNEL',
    '13': 'FETCHGUILD',
    EVAL: 0,
    MESSAGE: 1,
    BROADCAST: 2,
    READY: 3,
    SHARDREADY: 4,
    SHARDRECONNECT: 5,
    SHARDRESUME: 6,
    SHARDDISCONNECT: 7,
    MASTEREVAL: 8,
    RESTARTALL: 9,
    RESTART: 10,
    FETCHUSER: 11,
    FETCHCHANNEL: 12,
    FETCHGUILD: 13
}

module.exports.SharderEvents = {
    DEBUG: 'debug',
    MESSAGE: 'message',
    READY: 'ready',
    SPAWN: 'spawn',
    SHARD_READY: 'shardReady',
    SHARD_RECONNECT: 'shardReconnect',
    SHARD_RESUME: 'shardResume',
    SHARD_DISCONNECT: 'shardDisconnect',
    ERROR: 'error'
}