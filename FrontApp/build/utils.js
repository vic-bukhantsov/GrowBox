const path = require("path");
const os = require("node:os");

const { RESERVED_MEM_PERCENT } = require("./webpack/common/constants");

/**
 * Checks if the system is Unix-like
 *
 * @returns {boolean}
 */
const isUnix = () => process.platform !== "win32";

/**
 * Checks if the system is Windows-like
 *
 * @returns {boolean}
 */
const isWindows = () => process.platform === "win32";

/**
 * Get parameters from the process
 *
 * @returns {{}}
 */
const getParamsFromProcess = () =>
    process.argv.slice(2).reduce((prev, current) => {
        const pairs = current.split("=");
        const key = pairs[0].replace("--", "");

        prev[key] = pairs[1]?.trim() ?? true;

        if (typeof prev[key] === "string" && prev[key].includes(",")) {
            prev[key] = pairs[1].split(",").map((item) => item.trim());
        }

        return prev;
    }, {});

/**
 * Wrapper for obtaining an absolute path and converting it to a Unix-like format
 *
 * @param args
 * @returns {string}
 */
const resolve = (...args) => {
    const newPath = path.resolve(process.cwd(), ...args);

    if (isWindows()) {
        return newPath.replaceAll("\\", "/");
    }

    return newPath;
};

/**
 * Get total mem
 *
 * @returns {number}
 */
const getTotalMem = () => Math.floor(os.totalmem() / Math.pow(1024, 3));

/**
 * Get free mem
 *
 * @returns {number}
 */
const getFreeMem = () => Math.floor(os.freemem() / Math.pow(1024, 3));

/**
 * Get the available memory for the build
 *
 * @returns {number}
 */
const getAvailableMem = () => {
    const params = getParamsFromProcess();
    const hasMaxMemory = params.hasOwnProperty("max-memory");
    const maxMemory = hasMaxMemory ? +params["max-memory"] : null;
    const freeMemGB = getFreeMem();

    if (hasMaxMemory) {
        if (!Number.isFinite(maxMemory)) {
            throw new Error("max-memory must be a number");
        }

        if (maxMemory < freeMemGB) {
            return maxMemory;
        }
    }

    return freeMemGB;
};

/**
 * Get the reserved memory from the total amount of free memory
 *
 * @returns {number}
 */
const getReservedMem = () => {
    const maxMemory = +(getParamsFromProcess()["max-memory"] ?? getAvailableMem());

    if (!Number.isFinite(maxMemory)) {
        throw new Error("max-memory must be a number");
    }

    return maxMemory;
};

const getReservedPercentMem = () => {
    const reservedPercentMem = +(getParamsFromProcess()["reserved-percent-memory"] ?? RESERVED_MEM_PERCENT);

    if (!Number.isFinite(reservedPercentMem)) {
        throw new Error("reserved-percent-memory must be a number");
    }

    return reservedPercentMem;
};

module.exports = {
    isUnix,
    isWindows,
    getParamsFromProcess,
    resolve,
    getTotalMem,
    getFreeMem,
    getAvailableMem,
    getReservedMem,
    getReservedPercentMem,
};
