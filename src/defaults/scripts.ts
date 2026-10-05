import { isObject, sortKeys, type FieldSorter } from "../core/primitives.ts";

const DEFAULT_SCRIPTS = new Set([
  "install",
  "pack",
  "prepare",
  "publish",
  "restart",
  "shrinkwrap",
  "start",
  "stop",
  "test",
  "uninstall",
  "version",
]);

const groupScriptNames = (keys: string[], prefix = ""): string[] => {
  const groups = new Map<string, string[]>();
  for (const key of keys) {
    const rest = prefix === "" ? key : key.slice(prefix.length + 1);
    const index = rest.indexOf(":");
    const group = index > 0 ? key.slice(0, key.length - rest.length + index) : key;
    const existing = groups.get(group);
    if (existing === undefined) {
      groups.set(group, [key]);
    } else {
      existing.push(key);
    }
  }
  return [...groups.keys()].toSorted().flatMap((group) => {
    const children = groups.get(group) ?? [];
    const nested = children.filter((key) => key !== group && key.startsWith(`${group}:`));
    if (children.length > 1 && nested.length > 0) {
      const direct = children.filter((key) => !nested.includes(key)).toSorted();
      direct.push(...groupScriptNames(nested, group));
      return direct;
    }
    return children.toSorted();
  });
};

export const sortScripts: FieldSorter = (value, _root) => {
  if (!isObject(value)) {
    return value;
  }
  const names = Object.keys(value);
  const prefixable = new Set<string>();
  const bare = names.map((name) => {
    const omitted = name.replace(/^(?:pre|post)/, "");
    if (DEFAULT_SCRIPTS.has(omitted) || names.includes(omitted)) {
      prefixable.add(omitted);
      return omitted;
    }
    return name;
  });
  const ordered = groupScriptNames([...new Set(bare)]).flatMap((key) =>
    prefixable.has(key) ? [`pre${key}`, key, `post${key}`] : [key],
  );
  return sortKeys(
    value,
    ordered.filter((key) => names.includes(key)),
  );
};
