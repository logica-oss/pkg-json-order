import { isObject, sortKeys, type JsonObject } from "./primitives.ts";

export interface PkgJsonOrderConfig {
  fields?: readonly string[];
  sorters?: Record<string, (value: unknown, root: JsonObject) => unknown>;
}

export const defineConfig = (config: PkgJsonOrderConfig): PkgJsonOrderConfig => config;

export const resolveConfig = (config: PkgJsonOrderConfig): Required<PkgJsonOrderConfig> => ({
  fields: config.fields ?? [],
  sorters: config.sorters ?? {},
});

export const mergeFieldOrder = (
  configured: readonly string[],
  fallback: readonly string[],
): string[] => {
  const seen = new Set<string>();
  return [...configured, ...fallback].filter((field) => {
    if (seen.has(field)) {
      return false;
    }
    seen.add(field);
    return true;
  });
};

export const applyFieldSorters = (
  sorted: JsonObject,
  root: JsonObject,
  sorters: Record<string, (value: unknown, root: JsonObject) => unknown>,
): JsonObject => {
  const result: JsonObject = { ...sorted };
  for (const [field, sorter] of Object.entries(sorters)) {
    if (result[field] === undefined) {
      continue;
    }
    result[field] = sorter(result[field], root);
  }
  return result;
};

export const orderRootKeys = (root: JsonObject, order: readonly string[]): JsonObject => {
  if (!isObject(root)) {
    return root;
  }
  const known = order.filter((field) => field in root);
  const extra = Object.keys(root)
    .filter((field) => !order.includes(field))
    .toSorted();
  const underscore = extra.filter((field) => field.startsWith("_"));
  const rest = extra.filter((field) => !field.startsWith("_"));
  return sortKeys(root, [...known, ...rest, ...underscore]);
};
