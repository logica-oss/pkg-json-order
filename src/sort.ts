import {
  applyFieldSorters,
  mergeFieldOrder,
  orderRootKeys,
  resolveConfig,
  type PkgJsonOrderConfig,
} from "./config.ts";
import { defaultFieldOrder, defaultFieldSorters } from "./defaults.ts";
import { detectIndent, detectNewline, isObject, type JsonObject } from "./primitives.ts";

export interface SortOptions extends PkgJsonOrderConfig {}

const sortObject = (root: JsonObject, config: Required<PkgJsonOrderConfig>): JsonObject => {
  const order = mergeFieldOrder(config.fields, defaultFieldOrder);
  const sorters = { ...defaultFieldSorters, ...config.sorters };
  const ordered = orderRootKeys(root, order);
  return applyFieldSorters(ordered, root, sorters);
};

const sortParsed = (value: unknown, config: Required<PkgJsonOrderConfig>): unknown =>
  isObject(value) ? sortObject(value, config) : value;

export function sortPackageJson<T extends JsonObject>(value: T, options?: SortOptions): T;
export function sortPackageJson(value: string, options?: SortOptions): string;
export function sortPackageJson(value: unknown, options: SortOptions = {}): unknown {
  const config = resolveConfig(options);
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
