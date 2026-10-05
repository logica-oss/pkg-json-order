import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectFiles } from "../src/cli.ts";

let dir = "";
let previousCwd = "";

beforeEach(() => {
  previousCwd = process.cwd();
  dir = mkdtempSync(path.join(tmpdir(), "pkg-json-order-cli-"));
  mkdirSync(path.join(dir, "node_modules", "root-dep"), { recursive: true });
  mkdirSync(path.join(dir, "packages", "app"), { recursive: true });
  mkdirSync(path.join(dir, "packages", "app", "node_modules", "dep"), { recursive: true });
  writeFileSync(path.join(dir, "package.json"), "{}");
  writeFileSync(path.join(dir, "node_modules", "root-dep", "package.json"), "{}");
  writeFileSync(path.join(dir, "packages", "app", "package.json"), "{}");
  writeFileSync(path.join(dir, "packages", "app", "node_modules", "dep", "package.json"), "{}");
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(previousCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("collectFiles", () => {
  it("skips manifests beneath nested node_modules", async () => {
    const files = await collectFiles(["**/package.json"], ["**/node_modules/**"]);
    expect(files.some((file) => file.includes("node_modules"))).toBe(false);
    expect(files.toSorted()).toEqual([
      "package.json",
      path.join("packages", "app", "package.json"),
    ]);
  });
});
