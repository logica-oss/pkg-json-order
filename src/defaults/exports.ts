import { isObject, type FieldSorter } from "../core/primitives.ts";

export const sortExports: FieldSorter = (value) => {
  if (!isObject(value)) {
    return value;
  }

  const paths = Object.keys(value)
    .filter((key) => key.startsWith("."))
    .toSorted();
  const conditions = Object.keys(value).filter((key) => !key.startsWith("."));
  const rest = conditions.filter((key) => key !== "default").toSorted();
  const ordered = [...paths, ...rest, ...(conditions.includes("default") ? ["default"] : [])];

  return Object.fromEntries(ordered.map((key) => [key, sortExports(value[key], value)]));
};
