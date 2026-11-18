import { beforeEach } from "vitest";

// A tiny in-memory localStorage that behaves like the real one (Object.keys lists the stored keys).
const data: Record<string, string> = {};
const api = {
  getItem: (k: string) => (k in data ? data[k] : null),
  setItem: (k: string, v: string) => {
    data[k] = String(v);
  },
  removeItem: (k: string) => {
    delete data[k];
  },
  clear: () => {
    for (const k of Object.keys(data)) delete data[k];
  },
  key: (i: number) => Object.keys(data)[i] ?? null,
};
const localStorageStub = new Proxy(data, {
  get(target, prop: string) {
    if (prop === "length") return Object.keys(target).length;
    if (prop in api) return api[prop as keyof typeof api];
    return target[prop];
  },
});

Object.assign(globalThis, {
  localStorage: localStorageStub,
  window: new EventTarget(),
});

beforeEach(() => {
  api.clear();
});
