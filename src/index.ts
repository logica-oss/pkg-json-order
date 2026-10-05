export { defineConfig, type PkgJsonOrderConfig } from "./core/config.ts";
export {
  alphabetical,
  bySubOrder,
  defaultFieldOrder,
  defaultFieldSorters,
  localeAware,
  sortByCompare,
  sortDependencies,
  sortEslintConfig,
  sortExports,
  sortPersonList,
  sortPnpm,
  sortPrettierConfig,
  sortScripts,
  sortWireit,
  sortWorkspaces,
} from "./defaults/index.ts";
export { sortPackageJson } from "./sort.ts";
export type { FieldSorter, JsonObject, JsonValue } from "./core/primitives.ts";
