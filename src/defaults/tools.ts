import {
  isObject,
  onArrayValue,
  overField,
  sortKeys,
  type FieldSorter,
} from "../core/primitives.ts";
import { alphabetical } from "./helpers.ts";

export const sortWireit: FieldSorter = (value, root) => {
  if (!isObject(value)) {
    return value;
  }
  const names = Object.keys(value).toSorted();
  const entries: Array<[string, unknown]> = [];
  for (const name of names) {
    const script = value[name];
    if (!isObject(script)) {
      entries.push([name, script]);
      continue;
    }
    let sorted = sortKeys(script, ["command", "dependencies", "files", "output"]);
    sorted = overField(
      "dependencies",
      onArrayValue((deps) =>
        deps.map((dep) => (isObject(dep) ? sortKeys(dep, ["script", "cascade"]) : dep)),
      ),
    )(sorted, root);
    entries.push([name, sorted]);
  }
  return Object.fromEntries(entries);
};

export const sortPnpm: FieldSorter = (value, root) => {
  if (!isObject(value)) {
    return value;
  }
  const base = [
    "peerDependencyRules",
    "neverBuiltDependencies",
    "onlyBuiltDependencies",
    "onlyBuiltDependenciesFile",
    "allowedDeprecatedVersions",
    "allowNonAppliedPatches",
    "updateConfig",
    "auditConfig",
    "requiredScripts",
    "supportedArchitectures",
    "overrides",
    "patchedDependencies",
    "packageExtensions",
  ];
  const sorted = sortKeys(value, base);
  return overField("overrides", alphabetical)(sorted, root);
};
