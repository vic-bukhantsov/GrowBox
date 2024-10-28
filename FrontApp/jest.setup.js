const { Settings, DateTime } = require("luxon");

const { DATE_FORMAT_API } = require("common/settings");

const warn = global.console.warn;
global.console = {
    ...console,
    warn: (msg) => {
        const disableMsgs = [
            //"Non-function value encountered for default slot",
            // REMOVE THIS AFTER REFACTORING CONVERT WO 2 INVOICE
            "Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with `markRaw` or using `shallowRef` instead of `ref`.",
            // REMOVE THIS AFTER FLOWS TRANSFERRED TO VUE
            "Component is missing template or render function",
            "Failed to resolve component: router-link", //TODO: fix this warning after routing implementation
        ];

        if (disableMsgs.some((item) => msg?.indexOf(item) !== -1)) {
            return;
        }

        warn(msg, global.WRAPPER_COMPONENT, new Error().stack);
    },
};

global.TEST = true;
global.WRAPPER_COMPONENT = null;
global.REQUEST_MANAGER_TEST = true;
global.REQUEST_MANAGER_HIDE_ERROR_TEST = false;
global.UUID = "de9a4e94-d05c-4592-8202-95cedaf382fd";
global.UUID2 = "8bf9421b-ac86-41f5-82b8-f0a7f95dc9e5";
global.UUID3 = "38685759-0a91-4e80-9da0-c4e4d3b18abd";
global.UUID4 = "3a90485b-8b1a-4069-adf3-f61c41fbfd0f";
global.UUID5 = "f3ec7f2a-1e7c-4c34-9d8d-ee3044e8a95a";
global.UUID6 = "281ec17e-0838-443d-b00c-3d530366f943";
global.UUID7 = "65b4fb6b-0a2a-44e1-8030-c17dba9abfdf";
global.UUID8 = "e7a1ef12-1921-441f-8f58-8e775741c497";
global.UUID9 = "b3432eb8-ddbc-497a-9621-234153cec30a";
global.UUID10 = "90720970-ccc5-490e-b08f-7d74c5d54cf0";
global.UUID11 = "563562e0-ae0d-46cf-9f84-1f0a21feb60f";
global.UUID12 = "7866bbbf-2499-4af8-8b8c-aeb6d1357f8e";

module.exports = async () => {
    process.env.TZ = "UTC";
};

Settings.defaultZone = "UTC";
Settings.defaultLocale = "en-US";

const dateTime = DateTime.fromFormat("2023-10-08", DATE_FORMAT_API);

global.window.open = (url) => {
    return {
        focus: jest.fn(),
    };
};

global.addDataToBody = (data) => {
    for (const key in data) {
        if (data[key] === undefined) {
            continue;
        }

        const oldEl = document.getElementById(key);
        if (oldEl) {
            oldEl.remove();
        }

        const el = document.createElement("script");
        el.type = "application/json";
        el.id = key;
        el.innerHTML = JSON.stringify(data[key]);
        document.body.appendChild(el);
    }
};

global.FormData = class FormData {
    map = {};

    constructor() {}

    set(name, value) {
        this.map[name] = value;
    }

    append(name, value) {
        this.map[name] = value;
    }
};

global.IntersectionObserver = class IntersectionObserver {
    constructor() {}

    observe() {
        return null;
    }

    disconnect() {
        return null;
    }

    unobserve() {
        return null;
    }
};

global.DataTransfer = class DataTransfer {
    effectAllowed;
    map = new Map();

    constructor() {}

    setData(key, value) {
        this.map.set(key, value);
    }

    getData(key) {
        return this.map.get(key);
    }
};

global.localStorage = class Storage {
    effectAllowed;
    map = new Map();

    constructor() {}

    setItem(key, value) {
        this.map.set(key, value);
    }

    getItem(key) {
        return this.map.get(key);
    }

    clear() {
        this.map = [];
    }
};

global.Request = class Request {
    init = {};

    constructor(url, init) {
        this.url = url;
        this.init = init;
    }

    async json() {
        return this.init;
    }
};

global.Response = class Response {
    data = {};
    init = {};

    constructor(data, init) {
        this.data = data;
        this.init = init;
    }

    json() {
        return JSON.parse(this.data);
    }
};

global.caches = class CacheStorage {
    static map = new Map();

    static async open(key) {
        if (!global.caches.map.has(key)) {
            const cache = new (class Cache {
                map = new Map();

                getKey(key2) {
                    return Object(key2) === key2 ? JSON.stringify(key2) : key2;
                }

                async put(key2, value) {
                    this.map.set(this.getKey(key2), value);
                }

                async match(key2) {
                    return this.map.get(this.getKey(key2));
                }

                async delete(key2) {
                    this.map.delete(this.getKey(key2));
                }

                async keys() {
                    return Array.from(this.map.keys());
                }
            })();

            global.caches.map.set(key, cache);

            return cache;
        }

        return global.caches.map.get(key);
    }

    static async keys() {
        return Array.from(global.caches.map.keys());
    }

    static async delete(item) {
        global.caches.map.delete(item);
    }
};

jest.mock("uuid", () => ({
    v4: () => global.UUID,
}));

Object.defineProperty(global, "crypto", {
    value: {
        randomUUID: (arr) => global.UUID,
    },
});

Object.defineProperty(global.navigator, "sendBeacon", {
    value: jest.fn(),
});

Object.defineProperty(global.URL, "createObjectURL", {
    writable: true,
    value: jest.fn(),
});

jest.mock("common/settings", () => {
    const originalModule = jest.requireActual("common/settings");

    return {
        ...originalModule,
        DEFAULT_DEBOUNCE_WAIT_TIME: 10,
        DEFAULT_DEBOUNCE_WAIT_TIME_TEST: 15,
        DEFAULT_BACKGROUND_TASK_WAIT_TIME: 10,
        DEFAULT_BACKGROUND_TASK_WAIT_TIME_TEST: 15,
    };
});

beforeAll(() => {
    localStorage.clear();

    Object.defineProperty(DateTime, "now", {
        writable: true,
        value: () => dateTime,
    });
});

beforeEach(() => {
    Object.defineProperty(global, "crypto", {
        value: {
            randomUUID: (arr) => global.UUID,
        },
    });

    Object.defineProperty(DateTime, "now", {
        writable: true,
        value: () => dateTime,
    });
});

Object.defineProperty(window.document, "cookie", {
    writable: true,
    value: "fh2_csrf=value1; cookie2=value2",
});
Object.defineProperty(DateTime, "now", {
    writable: true,
    value: () => dateTime,
});
