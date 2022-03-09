const { ShardingManager } = require("..");
const { ShardClientUtil } = require("../Sharding/ShardClientUtil");
const { IPCEvents } = require("../Util/Constants");
const Util = require("../Util/Util");

module.exports.BaseCluster = class BaseCluster {
	/**
	 * Init BaseCluster
	 * @param {ShardingManager} manager
	 */
	constructor(manager) {
		const env = process.env;
		const shards = env.CLUSTER_SHARDS.split(',').map(Number);
		const clientConfig = Util.mergeDefault(manager.clientOptions, {
			shards,
			shardCount: Number(env.CLUSTER_SHARD_COUNT)
		});
		this.client = new manager.client(clientConfig);
		const client = this.client;
		client.shard = new ShardClientUtil(client, manager.ipcSocket);
		this.id = Number(env.CLUSTER_ID);
	}

	async init() {
		const shardUtil = this.client.shard;
		await shardUtil.init();
		this.client.once('ready', () => { void shardUtil.send({ op: IPCEvents.READY, d: this.id }, { receptive: false }); });
		this.client.on('shardReady', id => { void shardUtil.send({ op: IPCEvents.SHARDREADY, d: { id: this.id, shardID: id } }, { receptive: false }); });
		this.client.on('shardReconnecting', id => { void shardUtil.send({ op: IPCEvents.SHARDRECONNECT, d: { id: this.id, shardID: id } }, { receptive: false }); });
		this.client.on('shardResume', (id, replayed) => { void shardUtil.send({ op: IPCEvents.SHARDRESUME, d: { id: this.id, shardID: id, replayed } }, { receptive: false }); });
		this.client.on('shardDisconnect', ({ code, reason, wasClean }, id) => { void shardUtil.send({ op: IPCEvents.SHARDDISCONNECT, d: { id: this.id, shardID: id, closeEvent: { code, reason, wasClean } } }, { receptive: false }); });
		await this.launch();
	}

	async launch() {
		return void 0;
	}
}