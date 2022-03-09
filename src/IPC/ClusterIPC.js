const {EventEmitter} = require("events");
const {Client: VezaClient} = require("veza");
const {Util} = require("discord.js");
const {IPCEvents} = require("../Util/Constants");

module.exports.ClusterIPC = class ClusterIPC extends EventEmitter {
    constructor(discordClient, id, socket) {
        super();
        this.client = discordClient;
        this.id = id;
        this.socket = socket;
        this.node = new VezaClient(`Cluster ${this.id}`)
            .on('error', error => this.emit('error', error))
            .on('disconnect', client => this.emit('warn', `[IPC] Disconnected from ${client.name}`))
            .on('ready', client => this.emit('debug', `[IPC] Connected to: ${client.name}`))
            .on('message', this._message.bind(this));
    }

    async broadcast(script) {
        script = typeof script === 'function' ? `(${script})(this)` : script;
        const {success, d} = await this.server.send({op: IPCEvents.BROADCAST, d: script});
        if (!success) throw Util.makeError(d);
        return d;
    }

    async masterEval(script) {
        script = typeof script === 'function' ? `(${script})(this)` : script;
        const {success, d} = await this.server.send({op: IPCEvents.MASTEREVAL, d: script});
        if (!success) throw Util.makeError(d);
        return d;
    }

    async init() {
        this.clientSocket = await this.node.connectTo(String(this.socket));
    }

    get server() {
        return this.clientSocket;
    }

    _eval(script) {
        return (this.client)._eval(script);
    }

    async _message(message) {
        const {op, d} = message.data;
        if (op === IPCEvents.EVAL) {
            try {
                message.reply({success: true, d: await this._eval(d)});
            } catch (error) {
                if (!(error instanceof Error)) return;
                message.reply({success: false, d: {name: error.name, message: error.message, stack: error.stack}});
            }
        }
    }
}