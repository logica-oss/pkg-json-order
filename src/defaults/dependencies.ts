import { existsSync } from "node:fs";

import {
  isObject,
  overField,
  sortKeys,
  uniqAndSortStrings,
  type FieldSorter,
  type JsonObject,
} from "../core/primitives.ts";
import { alphabetical, localeAware } from "./helpers.ts";

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

export const sortDependencies: FieldSorter = (value, root) => {
  if (!isObject(value) || Object.keys(value).length < 2) {
    return value;
  }

  return (shouldUseLocaleCompare(root) ? localeAware : alphabetical)(value, root);
};

export const sortWorkspaces: FieldSorter = (value, root) => {
  if (!isObject(value)) {
    return value;
  }

  const ordered = sortKeys(value, ["packages", "catalog"]);

  return overField("packages", uniqAndSortStrings)(
    overField("catalog", sortDependencies)(ordered, root),
    root,
  );
};
