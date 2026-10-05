import { resolveConfig, type PkgJsonOrderConfig, type ResolvedDefaults } from "./core/config.ts";
import { sortWithResolved } from "./core/sort.ts";
import { defaultFieldOrder, defaultFieldSorters } from "./defaults/index.ts";
import { isObject, type JsonObject } from "./core/primitives.ts";

const DEFAULTS: ResolvedDefaults = {
  fields: defaultFieldOrder,
  sorters: defaultFieldSorters,
  ignore: [],
  recursive: false,
};

export function sortPackageJson<T extends JsonObject>(value: T, options?: PkgJsonOrderConfig): T;
export function sortPackageJson(value: string, options?: PkgJsonOrderConfig): string;
export function sortPackageJson(value: unknown, options: PkgJsonOrderConfig = {}): unknown {
  const config = resolveConfig(options, DEFAULTS);
  if (typeof value === "string") {
    return sortWithResolved(value, config);
  }
  if (isObject(value)) {
    return sortWithResolved(value, config);
  }
  return value;
}
