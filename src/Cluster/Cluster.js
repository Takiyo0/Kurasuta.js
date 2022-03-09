const cluster = require("cluster");
const {IPCEvents} = require("../Util/Constants");
const {IPCResult, IPCError} = require("../Sharding/ShardClientUtil");
const {Util: DjsUtil} = require("discord.js");
const Util = require("../Util/Util");
const {EventEmitter} = require("events");

module.exports.Cluster = class Cluster extends EventEmitter {
    constructor(options) {
        super();
        this.ready = false;
        this.id = options.id;
        this.shards = options.shards || [];
        this.manager = options.manager;
        this.worker = undefined;
        this._exitListenerFunction = this._exitListener.bind(this);

        this.once("ready", () => this.ready = true);
    }

    async eval(script) {
        script = typeof script === "function" ? `(${script})(this)` : script;
        const {success, d} = await this.manager.ipc.server.sendTo(`Cluster ${this.id}`, {
            op: IPCEvents.EVAL,
            d: script
        });
        if (!success) throw DjsUtil.makeError(d);
        return d;
    }

    async fetchClientValue(prop) {
        const {success, d} = await this.manager.ipc.server.sendTo(`Cluster ${this.id}`, {
            op: IPCEvents.EVAL,
            d: `this.${prop}`
        });
        if (!success) throw DjsUtil.makeError(d);
        return d;
    }

    kill() {
        if (this.worker) {
            this.manager.emit('debug', `Killing Cluster ${this.id}`);
            this.worker.removeListener('exit', this._exitListenerFunction);
            this.worker.kill();
        }
    }

    async respawn(delay = 500) {
        this.kill();
        if (delay) await Util.sleep(delay);
        await this.spawn();
    }

    send(data) {
        return this.manager.ipc.node.sendTo(`Cluster ${this.id}`, data);
    }

    async spawn() {
        this.worker = cluster.fork({
            CLUSTER_SHARDS: this.shards.join(','),
            CLUSTER_ID: this.id.toString(),
            CLUSTER_SHARD_COUNT: this.manager.shardCount.toString(),
            CLUSTER_CLUSTER_COUNT: this.manager.clusterCount.toString(), ...process.env
        });
        this.worker.once('exit', this._exitListenerFunction);
        this.manager.emit('debug', `Worker spawned with id ${this.worker.id}`);
        this.manager.emit('spawn', this);

        await this._waitReady(this.shards.length);
        await Util.sleep(5000);
    }

    _exitListener(code, signal) {
        this.ready = false;
        this.worker = undefined;

        this.manager.emit('debug', `Worker exited with code ${code} and signal ${signal}${this.manager.respawn ? ', restarting...' : ''}`);
        if (this.manager.respawn) return this.respawn();
    }

    _waitReady(shardCount) {
        return new Promise((resolve, reject) => {
            this.once('ready', resolve);
            setTimeout(() => reject(new Error(`Cluster ${this.id} took too long to get ready`)), (this.manager.timeout * shardCount) * (this.manager.guildsPerShard / 1000));
        });
    }
}