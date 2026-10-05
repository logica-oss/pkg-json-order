import { describe, expect, it } from "vitest";

import { sortPackageJson } from "../src/index.ts";

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

  it("sorts scripts with pre/post grouping", () => {
    const sorted = sortPackageJson({
      name: "example",
      scripts: { test: "vitest", pretest: "lint", build: "tsc" },
    });
    expect(Object.keys(sorted.scripts ?? {})).toEqual(["build", "pretest", "test"]);
  });
});
