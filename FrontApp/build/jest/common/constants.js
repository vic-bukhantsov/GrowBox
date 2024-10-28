/**
 * Maximum memory that can be used for a one worker (GB)
 *
 * @type {number}
 */
const WORKER_MEM = 2; // GB

/**
 * The percentage of memory reserved for other processes
 *
 * @type {number}
 */
const RESERVED_MEM_PERCENT = 0.2;

module.exports = {
    RESERVED_MEM_PERCENT,
    WORKER_MEM,
};
