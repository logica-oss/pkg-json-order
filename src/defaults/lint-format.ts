import {
  isObject,
  onArrayValue,
  overField,
  sortKeys,
  type FieldSorter,
} from "../core/primitives.ts";
import { alphabetical, sortByCompare } from "./helpers.ts";

export const sortEslintConfig: FieldSorter = (value, root) => {
  if (!isObject(value)) {
    return value;
  }
  const base = [
    "files",
    "excludedFiles",
    "env",
    "parser",
    "parserOptions",
    "settings",
    "plugins",
    "extends",
    "rules",
    "overrides",
    "globals",
    "processor",
    "noInlineConfig",
    "reportUnusedDisableDirectives",
  ];
  let sorted = sortKeys(value, base);
  sorted = overField("env", alphabetical)(sorted, root);
  sorted = overField("globals", alphabetical)(sorted, root);
  sorted = overField(
    "overrides",
    onArrayValue((items) => items.map((item) => sortEslintConfig(item, root))),
  )(sorted, root);
  sorted = overField("parserOptions", alphabetical)(sorted, root);
  sorted = overField(
    "rules",
    sortByCompare(
      (a, b) => a.split("/").length - b.split("/").length || (a < b ? -1 : a > b ? 1 : 0),
    ),
  )(sorted, root);
  sorted = overField("settings", alphabetical)(sorted, root);
  return sorted;
};

export const sortPrettierConfig: FieldSorter = (value, root) => {
  if (!isObject(value)) {
    return value;
  }
  const rest = Object.keys(value)
    .filter((key) => key !== "overrides")
    .toSorted();
  let sorted = sortKeys(value, [...rest, "overrides"]);
  sorted = overField(
    "overrides",
    onArrayValue((items) =>
      items.map((item) => {
        if (!isObject(item)) {
          return item;
        }
        const target = sortKeys(item);
        return overField("options", alphabetical)(target, root);
      }),
    ),
  )(sorted, root);
  return sorted;
};
