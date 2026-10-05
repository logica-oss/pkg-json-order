import { existsSync } from "node:fs";
import path from "node:path";

import { createJiti } from "jiti";

import type { FieldSorter } from "./primitives.ts";

export interface PkgJsonOrderConfig {
  fields?: readonly string[];
  sorters?: Record<string, FieldSorter>;
  ignore?: readonly string[];
  recursive?: boolean;
}

export interface ResolvedDefaults {
  fields: readonly string[];
  sorters: Record<string, FieldSorter>;
  ignore: readonly string[];
  recursive: boolean;
}

export const defineConfig = (config: PkgJsonOrderConfig): PkgJsonOrderConfig => config;

export const resolveConfig = (
  config: PkgJsonOrderConfig,
  defaults: ResolvedDefaults,
): Required<PkgJsonOrderConfig> => ({
  fields:
    config.fields === undefined
      ? [...defaults.fields]
      : [...new Set([...config.fields, ...defaults.fields])],
  sorters: { ...defaults.sorters, ...config.sorters },
  ignore: config.ignore === undefined ? [...defaults.ignore] : [...config.ignore],
  recursive: config.recursive ?? defaults.recursive,
});

const CONFIG_NAMES = [".pkg-json-order.ts", ".pkg-json-order.js"] as const;

const isConfig = (value: unknown): value is PkgJsonOrderConfig =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const findConfigPath = (cwd: string): string | undefined =>
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

export const __test__ = { findConfigPath };
