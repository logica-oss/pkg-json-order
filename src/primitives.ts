export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = Record<string, unknown>;

export const isObject = (value: unknown): value is JsonObject => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
};

const toEntries = (value: JsonObject, keys: readonly string[]): Array<[string, unknown]> =>
  keys.map((key) => [key, value[key]]);

export const sortKeys = (value: JsonObject, order?: readonly string[]): JsonObject => {
  const rank = order === undefined ? undefined : new Map(order.map((key, index) => [key, index]));
  const sorted = Object.keys(value).toSorted((a, b) => {
    if (rank !== undefined) {
      const ra = rank.get(a) ?? Number.POSITIVE_INFINITY;
      const rb = rank.get(b) ?? Number.POSITIVE_INFINITY;
      if (ra !== rb) {
        return ra - rb;
      }
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return Object.fromEntries(toEntries(value, sorted));
};

export const sortKeysBy = (
  value: JsonObject,
  compare: (a: string, b: string) => number,
): JsonObject => Object.fromEntries(toEntries(value, Object.keys(value).toSorted(compare)));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const sortStrings = (value: unknown): unknown => (isStringArray(value) ? value.toSorted() : value);

export const uniqStrings = (value: unknown): unknown =>
  isStringArray(value) ? [...new Set(value)] : value;

export const uniqAndSortStrings = (value: unknown): unknown => sortStrings(uniqStrings(value));

export const onObjectValue = (fn: (value: JsonObject, root: JsonObject) => unknown) => {
  return (value: unknown, root: JsonObject): unknown => (isObject(value) ? fn(value, root) : value);
};

export const onArrayValue = (fn: (value: unknown[]) => unknown) => {
  return (value: unknown): unknown => (Array.isArray(value) ? fn(value) : value);
};

export const overField = (field: string, sort: (value: unknown, root: JsonObject) => unknown) => {
  return (object: JsonObject, root: JsonObject): JsonObject => {
    if (object[field] === undefined) {
      return object;
    }
    return { ...object, [field]: sort(object[field], root) };
  };
};

export const detectIndent = (text: string): string => {
  let spaces = 0;
  let tabs = 0;
  let spaceWidth = 0;
  for (const line of text.split("\n")) {
    const match = /^( +|\t+)/.exec(line);
    if (match === null) {
      continue;
    }
    const indent = match[1] ?? "";
    if (indent[0] === "\t") {
      tabs += 1;
    } else {
      spaces += 1;
      if (spaceWidth === 0) {
        spaceWidth = indent.length;
      }
    }
  }
  if (tabs > spaces) {
    return "\t";
  }
  return spaceWidth > 0 ? " ".repeat(spaceWidth) : "  ";
};

export const detectNewline = (text: string): string => {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/(?<!\r)\n/g) ?? []).length;
  return crlf > lf ? "\r\n" : "\n";
};
