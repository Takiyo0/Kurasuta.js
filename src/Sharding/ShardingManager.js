const {Client, ClientOptions, GatewayIntentBits} = require("discord.js");
const {MasterIPC} = require("../IPC/MasterIPC");
const {Cluster} = require("../Cluster/Cluster");
const {http, SharderEvents} = require("../Util/Constants");
const {EventEmitter} = require("events");
const {cpus} = require("os");
const cluster = require("cluster");
const Util = require("../Util/Util");
const fetch = require("node-fetch");

module.exports.ShardingManager = class ShardingManager extends EventEmitter {
    /**
     * Sharding manager
     * @param {string} path
     * @param options
     */
    constructor(path, options) {
        super();
        this.clusterCount = Number(options.clusterCount ?? cpus().length);
        this.guildsPerShard = Number(options.guildsPerShard ?? 1000);
        this.clientOptions = options.clientOptions ?? {intents: GatewayIntentBits.Guilds}
        this.development = options.development ?? false;
        this.shardCount = options.shardCount ? Number(options.shardCount) : 'auto';
        this.client = options.client ?? Client;
        this.respawn = options.respawn ?? true;
        this.ipcSocket = options.ipcSocket ?? 9999;
        this.retry = options.retry ?? true;
        this.timeout = Number(options.timeout ?? 30000);
        this.token = options.token;
        this.nodeArgs = options.nodeArgs;
        this.ipc = new MasterIPC(this);
        this.clusters = new Map();
        this.path = path;

        this.ipc.on('debug', msg => this._debug(`[IPC] ${msg}`));
        this.ipc.on('error', err => this.emit(SharderEvents.ERROR, err));

        if (!this.path) throw new Error('You need to supply a Path!');
    }


    async spawn() {
        if (cluster.isPrimary) {
            if (this.shardCount === 'auto') {
                this._debug('Fetching Session Endpoint');
                const {shards: recommendShards} = await this._fetchSessionEndpoint();

                this.shardCount = Util.calcShards(recommendShards, this.guildsPerShard);
                this._debug(`Using recommend shard count of ${this.shardCount} shards with ${this.guildsPerShard} guilds per shard`);
            }

            this._debug(`Starting ${this.shardCount} Shards in ${this.clusterCount} Clusters!`);

            if (this.shardCount < this.clusterCount) {
                this.clusterCount = this.shardCount;
            }

            const shardArray = [...Array(this.shardCount).keys()];
            const shardTuple = Util.chunk(shardArray, this.clusterCount);
            const failed = [];

            if (this.nodeArgs) cluster.setupPrimary({execArgv: this.nodeArgs});

            for (let index = 0; index < this.clusterCount; index++) {
                const shards = shardTuple.shift();

                const cluster = new Cluster({id: index, shards, manager: this});

                this.clusters.set(index, cluster);

                try {
                    await cluster.spawn();
                } catch {
                    this._debug(`Cluster ${cluster.id} failed to start`);
                    this.emit(SharderEvents.ERROR, new Error(`Cluster ${cluster.id} failed to start`));
                    if (this.retry) {
                        this._debug(`Requeuing Cluster ${cluster.id} to be spawned`);
                        failed.push(cluster);
                    }
                }
            }

            if (this.retry) await this.retryFailed(failed);
        } else {
            return Util.startCluster(this);
        }
    }

    async restartAll() {
        this._debug('Restarting all Clusters!');

        for (const cluster of this.clusters.values()) {
            await cluster.respawn();
        }
    }

    async restart(clusterID) {
        const cluster = this.clusters.get(clusterID);
        if (!cluster) throw new Error('No Cluster with that ID found.');

        this._debug(`Restarting Cluster ${clusterID}`);

        await cluster.respawn();
    }

    fetchClientValues(prop) {
        return this.ipc.broadcast(`this.${prop}`);
    }

    eval(script) {
        return new Promise((resolve, reject) => {
            try {
                // tslint:disable-next-line:no-eval
                return resolve(eval(script));
            } catch (error) {
                reject(error);
            }
        });
    }

    on(event, listener) {
        return super.on(event, listener);
    }

    once(event, listener) {
        return super.once(event, listener);
    }

    async retryFailed(clusters) {
        const failed = [];

        for (const cluster of clusters) {
            try {
                this._debug(`Respawning Cluster ${cluster.id}`);
                await cluster.respawn();
            } catch {
                this._debug(`Cluster ${cluster.id} failed, requeuing...`);
                failed.push(cluster);
            }
        }

        if (failed.length) {
            this._debug(`${failed.length} Clusters still failed, retry...`);
            return this.retryFailed(failed);
        }
    }

    async _fetchSessionEndpoint() {
        if (!this.token) throw new Error('No token was provided!');
        const res = await fetch(`${http.api}/v${http.version}/gateway/bot`, {
            method: 'GET',
            headers: {authorization: `Bot ${this.token.replace(/^Bot\s*/i, '')}`}
        });
        if (res.ok) return res.json();
        throw new Error(`Invalid Session Endpoint response: ${res.status} ${res.statusText}`);
    }

    _debug(message) {
        this.emit(SharderEvents.DEBUG, message);
    }
}