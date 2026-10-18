import { describe, expect, it } from "vitest";

import { keepOrder, sortPackageJson } from "../src/index.ts";

describe("sortPackageJson", () => {
  it("orders top-level fields by default order", () => {
    const sorted = sortPackageJson({
      version: "1.0.0",
      name: "example",
      description: "demo",
    });
    expect(Object.keys(sorted)).toEqual(["name", "version", "description"]);
  });

  it("sorts dependency values alphabetically", () => {
    const sorted = sortPackageJson({
      name: "example",
      dependencies: { zod: "^1", axios: "^2" },
    });
    expect(Object.keys(sorted.dependencies ?? {})).toEqual(["axios", "zod"]);
  });

  it("keeps unknown fields after known ones and underscore fields last", () => {
    const sorted = sortPackageJson({
      _private: true,
      custom: true,
      name: "example",
    });
    expect(Object.keys(sorted)).toEqual(["name", "custom", "_private"]);
  });

  it("preserves indent and trailing newline for string input", () => {
    const input = `{\n    "version": "1.0.0",\n    "name": "example"\n}\n`;
    expect(sortPackageJson(input)).toBe(`{\n    "name": "example",\n    "version": "1.0.0"\n}\n`);
  });

  it("applies configured field order before defaults", () => {
    const sorted = sortPackageJson(
      { version: "1.0.0", name: "example", custom: true },
      { fields: ["custom", "name"] },
    );
    expect(Object.keys(sorted)).toEqual(["custom", "name", "version"]);
  });

  it("applies configured per-field sorter", () => {
    const sorted = sortPackageJson(
      { name: "example", custom: { b: 1, a: 2 } },
      {
        fields: ["name", "custom"],
        sorters: {
          custom: (value) => {
            if (typeof value !== "object" || value === null || Array.isArray(value)) {
              return value;
            }
            return Object.fromEntries(
              Object.entries(value).toSorted(([a], [b]) => (a < b ? 1 : -1)),
            );
          },
        },
      },
    );
    const custom = sorted["custom"];
    expect(typeof custom === "object" && custom !== null ? Object.keys(custom) : []).toEqual([
      "b",
      "a",
    ]);
  });

  it("keeps scripts and betterScripts order by default", () => {
    const sorted = sortPackageJson({
      name: "example",
      scripts: { test: "vitest", pretest: "lint", build: "tsc" },
      betterScripts: { lint: "eslint", prelint: "echo", build: "tsc" },
    });
    expect(Object.keys(sorted.scripts ?? {})).toEqual(["test", "pretest", "build"]);
    expect(Object.keys(sorted.betterScripts ?? {})).toEqual(["lint", "prelint", "build"]);
  });

  it("exposes keepOrder sorter that preserves existing order", () => {
    const sorted = sortPackageJson(
      { name: "example", custom: { b: 1, a: 2 } },
      { fields: ["name", "custom"], sorters: { custom: keepOrder } },
    );
    expect(Object.keys(sorted["custom"] as Record<string, unknown>)).toEqual(["b", "a"]);
  });

  it("preserves export condition order while sorting subpaths", () => {
    const sorted = sortPackageJson({
      name: "example",
      exports: {
        "./zebra": "./zebra.js",
        "./apple": "./apple.js",
        node: "./node.js",
        import: "./import.js",
        default: "./default.js",
      },
    });
    expect(Object.keys(sorted.exports ?? {})).toEqual([
      "./apple",
      "./zebra",
      "node",
      "import",
      "default",
    ]);
  });
});
