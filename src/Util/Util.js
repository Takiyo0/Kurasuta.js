// Copyright (c) 2017-2018 dirigeants. All rights reserved. MIT license.

const {Constructable} = require("discord.js");
const {promisify} = require("util");
const {ShardingManager, BaseCluster} = require("..");

const PRIMITIVE_TYPES = ['string', 'bigint', 'number', 'boolean'];

/**
 * Chunk
 * @param {number[]} entries
 * @param {number} chunkSize
 * @returns {*[]}
 */
function chunk(entries, chunkSize) {
    const result = [];
    const amount = Math.floor(entries.length / chunkSize);
    const mod = entries.length % chunkSize;

    for (let i = 0; i < chunkSize; i++) {
        result[i] = entries.splice(0, i < mod ? amount + 1 : amount);
    }

    return result;
}

/**
 * Deep clone
 * @param {any} source
 * @returns {{}|*[]|*}
 */
function deepClone(source) {
    // Check if it's a primitive (with exception of function and null, which is typeof object)
    if (source === null || isPrimitive(source)) return source;
    if (Array.isArray(source)) {
        const output = [];
        for (const value of source) output.push(deepClone(value));
        return output;
    }
    if (isObject(source)) {
        const output = {};
        for (const [key, value] of Object.entries(source)) output[key] = deepClone(value);
        return output;
    }
    if (source instanceof Map) {
        const output = new (source.constructor())();
        for (const [key, value] of source.entries()) output.set(key, deepClone(value));
        return output;
    }
    if (source instanceof Set) {
        const output = new (source.constructor())();
        for (const value of source.values()) output.add(deepClone(value));
        return output;
    }
    return source;
}

/**
 * IS primitive
 * @param {any} value
 * @returns {boolean}
 */
function isPrimitive(value) {
    return PRIMITIVE_TYPES.includes(typeof value);
}

/**
 * Merge default
 * @param {Record<string, any>} def
 * @param {Record<string, any>} given
 * @returns {{}|*[]|*}
 */
function mergeDefault(def, given) {
    if (!given) return deepClone(def);
    for (const key in def) {
        if (given[key] === undefined) given[key] = deepClone(def[key]);
        else if (isObject(given[key])) given[key] = mergeDefault(def[key], given[key]);
    }

    return given;
}

/**
 * Is object
 * @param {any} input
 * @returns {boolean}
 */
function isObject(input) {
    return input && input.constructor === Object;
}

/**
 * Sleep
 * @param {number} duration
 * @returns {Promise<unknown>}
 */
function sleep(duration) {
    return promisify(setTimeout)(duration);
}

/**
 * Calc shard
 * @param {number} shards
 * @param {number} guildsPerShard
 * @returns {number}
 */
function calcShards(shards, guildsPerShard) {
    return Math.ceil(shards * (1000 / guildsPerShard));
}


/**
 * Star cluster
 * @param {ShardingManager} manager
 * @returns {Promise<*>}
 */
async function startCluster(manager) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ClusterClassRequire = await import(manager.path);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ClusterClass = ClusterClassRequire.default ? ClusterClassRequire.default : ClusterClassRequire;
    const cluster = new ClusterClass(manager);
    return cluster.init();
}


module.exports.PRIMITIVE_TYPES = PRIMITIVE_TYPES;
module.exports.chunk = chunk;
module.exports.deepClone = deepClone;
module.exports.isPrimitive = isPrimitive;
module.exports.mergeDefault = mergeDefault;
module.exports.isObject = isObject;
module.exports.sleep = sleep;
module.exports.calcShards = calcShards;
module.exports.startCluster = startCluster;