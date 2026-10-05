import type { PkgJsonOrderConfig } from "./config.ts";
import {
  detectIndent,
  detectNewline,
  isObject,
  sortKeys,
  type FieldSorter,
  type JsonObject,
} from "./primitives.ts";

const applyFieldSorters = (
  sorted: JsonObject,
  root: JsonObject,
  sorters: Record<string, FieldSorter>,
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

const orderRootKeys = (root: JsonObject, order: readonly string[]): JsonObject => {
  const known = order.filter((field) => field in root);
  const extra = Object.keys(root)
    .filter((field) => !order.includes(field))
    .toSorted();

  const underscore = extra.filter((field) => field.startsWith("_"));
  const rest = extra.filter((field) => !field.startsWith("_"));

  return sortKeys(root, [...known, ...rest, ...underscore]);
};

const sortObject = (root: JsonObject, config: Required<PkgJsonOrderConfig>): JsonObject => {
  const ordered = orderRootKeys(root, config.fields);
  return applyFieldSorters(ordered, root, config.sorters);
};

const sortParsed = (value: unknown, config: Required<PkgJsonOrderConfig>): unknown =>
  isObject(value) ? sortObject(value, config) : value;

export function sortWithResolved<T extends JsonObject>(
  value: T,
  config: Required<PkgJsonOrderConfig>,
): T;
export function sortWithResolved(value: string, config: Required<PkgJsonOrderConfig>): string;
export function sortWithResolved(value: unknown, config: Required<PkgJsonOrderConfig>): unknown {
  if (typeof value === "string") {
    const indent = detectIndent(value);
    const newline = detectNewline(value);
    const trailingNewline = value.endsWith("\n") ? "\n" : "";

    const parsed: unknown = JSON.parse(value);
    const sorted = sortParsed(parsed, config);
    const text = JSON.stringify(sorted, null, indent) + trailingNewline;

    return newline === "\r\n" ? text.replaceAll("\n", "\r\n") : text;
  }

  return sortParsed(value, config);
}
