const { resolve, getTotalMem, getFreeMem } = require("./build/utils");
const { getAvailableWorkers, getPerWorkerMem } = require("./build/jest/common/utils");

const maxWorkers = getAvailableWorkers();

/**
 * Available params
 * --max-workers=<number> | --maxWorkers=<number>
 * The maximum number of workers that can be started. By default, the number of processor threads - 1
 *
 * --max-memory=<number>
 * Specifies how much memory can be used at most. By default, all available system memory is used
 *
 * --reserved-percent-memory=<number>
 * Specifies how much memory to reserve for other processes. By default, 0.2
 * This means if you have 16GB of memory and you specify 0.1, then 1.6GB of memory will be reserved for other processes,
 * and free memory for node.js will be the remaining 14.4GB.
 * The reserved-percent-memory will be used from the system memory value or from max-memory.
 */

module.exports = {
    workerIdleMemoryLimit: `${getPerWorkerMem()}GB`,
    maxWorkers: maxWorkers,
    maxConcurrency: maxWorkers,
    slowTestThreshold: 2,
    transformIgnorePatterns: ["/node_modules/", "/dist/"],
    moduleDirectories: ["node_modules", __dirname],
    setupFilesAfterEnv: [resolve("jest.setup.js")],
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
        customExportConditions: ["node", "node-addons"],
    },
    moduleNameMapper: { "\\.(css|less|scss)$": resolve("__mocks__/styleMock.js") },
    transform: {
        "^.+\\.vue$": ["@vue/vue3-jest"],
        "^.+\\.ts(x|)?$": [
            "@swc/jest",
            {
                jsc: {
                    parser: {
                        syntax: "typescript",
                        jsx: false,
                        dynamicImport: true,
                        exportDefaultFrom: true,
                        decorators: true,
                        decoratorsBeforeExport: true,
                    },
                    target: "es2021",
                },
                module: {
                    type: "es6",
                    ignoreDynamic: true,
                },
            },
        ],
    },
    testMatch: ["**/?(*.)+(spec|test).(ts|tsx)"],
    moduleFileExtensions: ["vue", "js", "json", "ts", "tsx", "node"],
};
