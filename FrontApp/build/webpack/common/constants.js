/**
 * Development mode
 *
 * @type {string}
 * @see https://webpack.js.org/configuration/mode/#root
 */
const DEVELOPMENT = "development";

/**
 * Production mode
 *
 * @type {string}
 * @see https://webpack.js.org/configuration/mode/#root
 */
const PRODUCTION = "production";

/**
 * Configuration target
 *
 * @type {string}
 * @see https://webpack.js.org/configuration/target/#target
 */
const CONFIG_TARGET = "web";

/**
 * Minimum number of parallel processes
 * Used in watch mode
 *
 * @type {number}
 */
const MIN_PARALLEL_PROCESS = 2;

/**
 * The percentage of memory reserved for other processes
 *
 * @type {number}
 */
const RESERVED_MEM_PERCENT = 0.2;

/**
 * Minimum memory required for the build (GB)
 *
 * @type {number}
 */
const MIN_PROD_BUILD_MEM = 4; // GB

/**
 * Minimum memory required for the watch or dev build (GB)
 *
 * @type {number}
 */
const MIN_DEV_BUILD_MEM = 3.5; // GB

/**
 * Maximum memory that can be reserved for the build (GB)
 *
 * @type {number}
 */
const MAX_BUILD_MEM = 12; // GB

/**
 * Maximum memory that can be used in watch mode (GB)
 *
 * @type {number}
 */
const MAX_WATCH_MEM = 7; // GB

module.exports = {
    DEVELOPMENT,
    PRODUCTION,
    CONFIG_TARGET,
    RESERVED_MEM_PERCENT,
    MIN_PARALLEL_PROCESS,
    MIN_PROD_BUILD_MEM,
    MIN_DEV_BUILD_MEM,
    MAX_BUILD_MEM,
    MAX_WATCH_MEM,
};
