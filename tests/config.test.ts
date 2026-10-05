import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  defineConfig,
  loadConfig,
  resolveConfig,
  __test__ as configTest,
} from "../src/core/config.ts";
import { defaultFieldOrder, defaultFieldSorters } from "../src/defaults/index.ts";

const makeDir = (): string => mkdtempSync(path.join(tmpdir(), "pkg-json-order-config-"));

const customSorter = (): string => "custom";

describe("defineConfig", () => {
  it("returns the given config as-is", () => {
    const config = { fields: ["name"] };
    expect(defineConfig(config)).toBe(config);
  });
});

describe("resolveConfig", () => {
  it("uses defaults when fields and sorters are missing", () => {
    const resolved = resolveConfig(
      {},
      {
        fields: defaultFieldOrder,
        sorters: defaultFieldSorters,
        ignore: [],
        recursive: false,
      },
    );
    expect(resolved.fields).toEqual(defaultFieldOrder);
    expect(resolved.sorters).toEqual(defaultFieldSorters);
  });

  it("prepends configured fields before defaults", () => {
    const resolved = resolveConfig(
      { fields: ["custom"], sorters: { bin: customSorter } },
      {
        fields: defaultFieldOrder,
        sorters: defaultFieldSorters,
        ignore: [],
        recursive: false,
      },
    );
    expect(resolved.fields.slice(0, 1)).toEqual(["custom"]);
    expect(resolved.fields.slice(1)).toEqual(defaultFieldOrder);
    expect(resolved.sorters["bin"]).toBe(customSorter);
    expect(resolved.sorters["scripts"]).toBe(defaultFieldSorters["scripts"]);
  });
});

describe("findConfigPath", () => {
  it("prefers ts over js and returns undefined when absent", () => {
    const dir = makeDir();
    try {
      expect(configTest.findConfigPath(dir)).toBeUndefined();
      writeFileSync(path.join(dir, ".pkg-json-order.js"), "export default {}");
      expect(configTest.findConfigPath(dir)?.endsWith(".pkg-json-order.js")).toBe(true);
      writeFileSync(path.join(dir, ".pkg-json-order.ts"), "export default {}");
      expect(configTest.findConfigPath(dir)?.endsWith(".pkg-json-order.ts")).toBe(true);
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
