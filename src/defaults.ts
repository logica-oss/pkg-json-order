import { existsSync } from "node:fs";

import {
  isObject,
  onArrayValue,
  onObjectValue,
  overField,
  sortKeys,
  sortKeysBy,
  uniqAndSortStrings,
  uniqStrings,
  type JsonObject,
} from "./primitives.ts";

export type FieldSorter = (value: unknown, root: JsonObject) => unknown;

const sortByCompare = (compare: (a: string, b: string) => number) =>
  onObjectValue((value) => sortKeysBy(value, compare));

const alphabetical: FieldSorter = onObjectValue((value) => sortKeys(value));
const localeAware: FieldSorter = onObjectValue((value) =>
  sortKeysBy(value, (a, b) => a.localeCompare(b, "en")),
);

const bySubOrder =
  (order: readonly string[], deep = false): FieldSorter =>
  (value, _root) => {
    if (!isObject(value)) {
      return value;
    }
    const sorted = sortKeys(value, order);
    if (!deep) {
      return sorted;
    }
    return Object.fromEntries(
      Object.entries(sorted).map(([key, child]) => [
        key,
        isObject(child) ? sortKeys(child, order) : child,
      ]),
    );
  };

const GIT_HOOKS = [
  "applypatch-msg",
  "pre-applypatch",
  "post-applypatch",
  "pre-commit",
  "pre-merge-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-rebase",
  "post-checkout",
  "post-merge",
  "pre-push",
  "pre-receive",
  "update",
  "proc-receive",
  "post-receive",
  "post-update",
  "reference-transaction",
  "push-to-checkout",
  "pre-auto-gc",
  "post-rewrite",
  "sendemail-validate",
  "fsmonitor-watchman",
  "p4-changelist",
  "p4-prepare-changelist",
  "p4-post-changelist",
  "p4-pre-submit",
  "post-index-change",
];

const hasYarnOrPnpmMarker = (): boolean =>
  ["yarn.lock", ".yarn", ".yarnrc.yml", "pnpm-lock.yaml", "pnpm-workspace.yaml"].some((marker) =>
    existsSync(marker),
  );

const shouldUseLocaleCompare = (root: JsonObject): boolean => {
  if (typeof root["packageManager"] === "string") {
    return root["packageManager"].startsWith("npm@");
  }
  const devEngines = root["devEngines"];
  if (
    isObject(devEngines) &&
    isObject(devEngines["packageManager"]) &&
    typeof devEngines["packageManager"]["name"] === "string"
  ) {
    return devEngines["packageManager"]["name"] === "npm";
  }
  if (root["pnpm"] !== undefined) {
    return false;
  }
  const engines = root["engines"];
  if (isObject(engines) && typeof engines["npm"] === "string") {
    return true;
  }
  return !hasYarnOrPnpmMarker();
};

const sortDependencies: FieldSorter = (value, root) => {
  if (!isObject(value) || Object.keys(value).length < 2) {
    return value;
  }
  return (shouldUseLocaleCompare(root) ? localeAware : alphabetical)(value, root);
};

const sortWorkspaces: FieldSorter = (value, root) => {
  if (!isObject(value)) {
    return value;
  }
  const ordered = sortKeys(value, ["packages", "catalog"]);
  return overField("packages", uniqAndSortStrings)(
    overField("catalog", sortDependencies)(ordered, root),
    root,
  );
};

const sortExports: FieldSorter = (value) => {
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

const sortEslintConfig: FieldSorter = (value, root) => {
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

const sortPrettierConfig: FieldSorter = (value, root) => {
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
        const target = isObject(item) ? sortKeys(item) : item;
        return overField("options", alphabetical)(isObject(target) ? target : {}, root);
      }),
    ),
  )(sorted, root);
  return sorted;
};

const sortWireit: FieldSorter = (value, root) => {
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

const sortPnpm: FieldSorter = (value, root) => {
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

const sortScripts: FieldSorter = (value, _root) => {
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

export const defaultFieldSorters: Record<string, FieldSorter> = {
  categories: uniqStrings,
  keywords: uniqStrings,
  bugs: bySubOrder(["url", "email"]),
  repository: bySubOrder(["type", "url"]),
  funding: bySubOrder(["type", "url"]),
  license: bySubOrder(["type", "url"]),
  author: bySubOrder(["name", "email", "url"]),
  maintainers: onArrayValue((items) =>
    items.map((item) => (isObject(item) ? sortKeys(item, ["name", "email", "url"]) : item)),
  ),
  contributors: onArrayValue((items) =>
    items.map((item) => (isObject(item) ? sortKeys(item, ["name", "email", "url"]) : item)),
  ),
  exports: sortExports,
  bin: alphabetical,
  directories: bySubOrder(["lib", "bin", "man", "doc", "example", "test"]),
  files: uniqStrings,
  workspaces: sortWorkspaces,
  binary: bySubOrder(["module_name", "module_path", "remote_path", "package_name", "host"]),
  scripts: sortScripts,
  betterScripts: sortScripts,
  wireit: sortWireit,
  contributes: alphabetical,
  activationEvents: uniqStrings,
  husky: (value, root) =>
    isObject(value) ? overField("hooks", bySubOrder(GIT_HOOKS))(value, root) : value,
  "simple-git-hooks": bySubOrder(GIT_HOOKS),
  commitlint: alphabetical,
  config: alphabetical,
  nodemonConfig: alphabetical,
  browserify: alphabetical,
  babel: alphabetical,
  xo: alphabetical,
  prettier: sortPrettierConfig,
  eslintConfig: sortEslintConfig,
  npmpkgjsonlint: alphabetical,
  npmPackageJsonLintConfig: alphabetical,
  npmpackagejsonlint: alphabetical,
  release: alphabetical,
  remarkConfig: alphabetical,
  ava: alphabetical,
  jest: alphabetical,
  "jest-junit": alphabetical,
  "jest-stare": alphabetical,
  mocha: alphabetical,
  nyc: alphabetical,
  c8: alphabetical,
  tap: alphabetical,
  oclif: bySubOrder([], true),
  resolutions: alphabetical,
  overrides: sortDependencies,
  dependencies: sortDependencies,
  devDependencies: sortDependencies,
  dependenciesMeta: bySubOrder([], true),
  peerDependencies: sortDependencies,
  peerDependenciesMeta: bySubOrder([], true),
  optionalDependencies: sortDependencies,
  bundledDependencies: uniqAndSortStrings,
  bundleDependencies: uniqAndSortStrings,
  extensionPack: uniqAndSortStrings,
  extensionDependencies: uniqAndSortStrings,
  engines: alphabetical,
  engineStrict: alphabetical,
  devEngines: (value, root) =>
    isObject(value)
      ? overField("packageManager", bySubOrder(["name", "version", "onFail"]))(value, root)
      : value,
  volta: bySubOrder(["node", "npm", "yarn"]),
  preferGlobal: alphabetical,
  publishConfig: alphabetical,
  badges: onArrayValue((items) =>
    items.map((item) => (isObject(item) ? sortKeys(item, ["description", "url", "href"]) : item)),
  ),
  galleryBanner: alphabetical,
  pnpm: sortPnpm,
};

export const defaultFieldOrder: readonly string[] = [
  "$schema",
  "name",
  "displayName",
  "version",
  "stableVersion",
  "private",
  "description",
  "categories",
  "keywords",
  "homepage",
  "bugs",
  "repository",
  "funding",
  "license",
  "qna",
  "author",
  "maintainers",
  "contributors",
  "publisher",
  "sideEffects",
  "type",
  "imports",
  "exports",
  "main",
  "svelte",
  "umd:main",
  "jsdelivr",
  "unpkg",
  "module",
  "source",
  "jsnext:main",
  "browser",
  "react-native",
  "types",
  "typesVersions",
  "typings",
  "style",
  "example",
  "examplestyle",
  "assets",
  "bin",
  "man",
  "directories",
  "files",
  "workspaces",
  "binary",
  "scripts",
  "betterScripts",
  "wireit",
  "l10n",
  "contributes",
  "activationEvents",
  "husky",
  "simple-git-hooks",
  "pre-commit",
  "commitlint",
  "lint-staged",
  "nano-staged",
  "config",
  "nodemonConfig",
  "browserify",
  "babel",
  "browserslist",
  "xo",
  "prettier",
  "eslintConfig",
  "eslintIgnore",
  "npmpkgjsonlint",
  "npmPackageJsonLintConfig",
  "npmpackagejsonlint",
  "release",
  "remarkConfig",
  "stylelint",
  "ava",
  "jest",
  "jest-junit",
  "jest-stare",
  "mocha",
  "nyc",
  "c8",
  "tap",
  "oclif",
  "resolutions",
  "overrides",
  "dependencies",
  "devDependencies",
  "dependenciesMeta",
  "peerDependencies",
  "peerDependenciesMeta",
  "optionalDependencies",
  "bundledDependencies",
  "bundleDependencies",
  "extensionPack",
  "extensionDependencies",
  "flat",
  "packageManager",
  "engines",
  "engineStrict",
  "devEngines",
  "volta",
  "languageName",
  "os",
  "cpu",
  "preferGlobal",
  "publishConfig",
  "icon",
  "badges",
  "galleryBanner",
  "preview",
  "markdown",
  "pnpm",
];
