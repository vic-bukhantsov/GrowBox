const os = require("node:os");

const { getParamsFromProcess, getAvailableMem, getReservedMem, getReservedPercentMem } = require("../../utils");
const { WORKER_MEM, RESERVED_MEM_PERCENT } = require("./constants");

/**
 * Get the amount of memory per worker
 *
 * @returns {number}
 */
const getPerWorkerMem = () => WORKER_MEM;

/**
 * Getting parameters from the command line that are passed to the NPM script
 */
const getParams = (refresh = false) => {
    if (global.JEST_PARAMS !== undefined && !refresh) {
        return global.JEST_PARAMS;
    }

    global.JEST_PARAMS = getParamsFromProcess();

    return global.JEST_PARAMS;
};

/**
 * Get the number of parallel processes
 * Depending on the amount of free memory and the number of cores
 *
 * @returns {number}
 */
const getAvailableWorkers = () => {
    const availableMem = getAvailableMem() - getReservedMem() * (getReservedPercentMem() * RESERVED_MEM_PERCENT);
    const hasMaxWorkers = getParams().hasOwnProperty("max-workers") || getParams().hasOwnProperty("maxWorkers");
    const maxWorkers = hasMaxWorkers ? +(getParams()["max-workers"] || getParams()["maxWorkers"]) : null;
    const cpusMax = os.cpus().length - 1;
    const workers = Math.floor(availableMem / getPerWorkerMem());

    if (hasMaxWorkers && !Number.isFinite(maxWorkers)) {
        throw new Error("max-workers must be a number");
    }

    if (hasMaxWorkers) {
        return maxWorkers > workers ? (workers > cpusMax ? cpusMax : Math.max(workers, 1)) : Math.max(maxWorkers, 1);
    }

    return workers > cpusMax ? cpusMax : Math.max(workers, 1);
};

module.exports = {
    getPerWorkerMem,
    getAvailableWorkers,
    getParams,
};
