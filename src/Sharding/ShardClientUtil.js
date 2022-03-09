const {Util} = require("discord.js");
const {ClusterIPC} = require("../IPC/ClusterIPC");
const {IPCEvents} = require("../Util/Constants");

module.exports.ShardClientUtil = class ShardClientUtil {
    constructor(client, ipcSocket) {
        this.client = client;
        this.ipcSocket = ipcSocket;
        this.clusterCount = Number(process.env.CLUSTER_CLUSTER_COUNT);
        this.shardCount = Number(process.env.CLUSTER_SHARD_COUNT);
        this.id = Number(process.env.CLUSTER_ID);
        this.ipc = new ClusterIPC(this.client, this.id, this.ipcSocket);
        this.shards = String(process.env.CLUSTER_SHARDS).split(',');
    }

    broadcastEval(script) {
        return this.ipc.broadcast(script);
    }

    masterEval(script) {
        return this.ipc.masterEval(script);
    }

    fetchClientValues(prop) {
        return this.ipc.broadcast(`this.${prop}`);
    }

    async fetchGuild(id) {
        const {success, d} = await this.send({op: IPCEvents.FETCHGUILD, d: id});
        if (!success) throw new Error('No guild with this id found!');
        return d;
    }

    async fetchUser(id) {
        const {success, d} = await this.send({op: IPCEvents.FETCHUSER, d: id});
        if (!success) throw new Error('No user with this id found!');
        return d;
    }

    async fetchChannel(id) {
        const {success, d} = await this.send({op: IPCEvents.FETCHCHANNEL, d: id});
        if (!success) throw new Error('No channel with this id found!');
        return d;
    }

    async restartAll() {
        await this.ipc.server.send({op: IPCEvents.RESTARTALL}, {receptive: false});
    }

    async restart(clusterID) {
        const {success, d} = await this.ipc.server.send({op: IPCEvents.RESTART, d: clusterID});
        if (!success) throw Util.makeError(d);
    }

    respawnAll() {
        return this.restartAll();
    }

    send(data, options) {
        if (typeof data === 'object' && data.op !== undefined) return this.ipc.server.send(data, options);
        return this.ipc.server.send({op: IPCEvents.MESSAGE, d: data}, options);
    }

    init() {
        return this.ipc.init();
    }
}