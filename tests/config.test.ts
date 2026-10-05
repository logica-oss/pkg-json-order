import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defineConfig, resolveConfig } from "../src/config.ts";
import { findConfigPath, loadConfig } from "../src/load-config.ts";

const makeDir = (): string => mkdtempSync(path.join(tmpdir(), "pkg-json-order-config-"));

describe("defineConfig", () => {
  it("returns the given config as-is", () => {
    const config = { fields: ["name"] };
    expect(defineConfig(config)).toBe(config);
  });
});

describe("resolveConfig", () => {
  it("fills missing fields with defaults", () => {
    expect(resolveConfig({})).toEqual({ fields: [], sorters: {} });
  });
});

describe("findConfigPath", () => {
  it("prefers js over ts and returns undefined when absent", () => {
    const dir = makeDir();
    try {
      expect(findConfigPath(dir)).toBeUndefined();
      writeFileSync(path.join(dir, ".pkg-json-order.ts"), "export default {}");
      expect(findConfigPath(dir)?.endsWith(".pkg-json-order.ts")).toBe(true);
      writeFileSync(path.join(dir, ".pkg-json-order.js"), "export default {}");
      expect(findConfigPath(dir)?.endsWith(".pkg-json-order.js")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadConfig", () => {
  it("returns empty config when no file exists", async () => {
    const dir = makeDir();
    try {
      await expect(loadConfig(dir)).resolves.toEqual({});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads default export from js config", async () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, ".pkg-json-order.js"), 'export default { fields: ["name"] }');
      await expect(loadConfig(dir)).resolves.toEqual({ fields: ["name"] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads default export from ts config", async () => {
    const dir = makeDir();
    try {
      writeFileSync(
        path.join(dir, ".pkg-json-order.ts"),
        'export default { fields: ["version"] };\n',
      );
      const config = await loadConfig(dir);
      expect(config).toEqual({ fields: ["version"] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects non-object default export", async () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, ".pkg-json-order.js"), "export default 42");
      await expect(loadConfig(dir)).rejects.toThrow("default export must be an object");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
