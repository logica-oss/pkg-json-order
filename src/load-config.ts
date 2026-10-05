import { existsSync } from "node:fs";
import path from "node:path";

import { createJiti } from "jiti";

import { type PkgJsonOrderConfig } from "./config.ts";

const CONFIG_NAMES = [".pkg-json-order.js", ".pkg-json-order.ts"] as const;

const isConfig = (value: unknown): value is PkgJsonOrderConfig =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const findConfigPath = (cwd: string): string | undefined =>
  CONFIG_NAMES.map((name) => path.join(cwd, name)).find((file) => existsSync(file));

export const loadConfig = async (cwd: string): Promise<PkgJsonOrderConfig> => {
  const configPath = findConfigPath(cwd);
  if (configPath === undefined) {
    return {};
  }
  const jiti = createJiti(import.meta.url);
  const loaded = await jiti.import(configPath, { default: true });
  if (!isConfig(loaded)) {
    throw new Error(
      `Invalid config in ${path.basename(configPath)}: default export must be an object`,
    );
  }
  return loaded;
};
