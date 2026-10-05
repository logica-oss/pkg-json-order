import { glob, readFile, writeFile } from "node:fs/promises";

import { loadConfig } from "./core/config.ts";
import { sortPackageJson } from "./sort.ts";

export interface CliOptions {
  check: boolean;
  quiet: boolean;
  stdin: boolean;
  ignore: string[];
  recursive: boolean;
}

export const DEFAULT_PATTERNS = ["package.json"];
export const RECURSIVE_PATTERNS = ["**/package.json"];
export const DEFAULT_IGNORE = ["node_modules/**"];

export const sortStdin = async (): Promise<void> => {
  let input = "";
  for await (const chunk of process.stdin) {
    input += String(chunk);
  }
  const config = await loadConfig(process.cwd());
  process.stdout.write(sortPackageJson(input, config));
};

export const sortOneFile = async (
  file: string,
  config: Awaited<ReturnType<typeof loadConfig>>,
  options: { check: boolean; quiet: boolean },
): Promise<"sorted" | "changed" | "failed"> => {
  try {
    const original = await readFile(file, "utf8");
    const next = sortPackageJson(original, config);
    if (next === original) {
      return "sorted";
    }
    if (options.check) {
      if (!options.quiet) {
        console.log(file);
      }
      return "changed";
    }
    await writeFile(file, next);
    if (!options.quiet) {
      console.log(`${file} is sorted!`);
    }
    return "changed";
  } catch (error) {
    console.error(`Error on: ${file}`);
    console.error(error instanceof Error ? error.message : String(error));
    return "failed";
  }
};

export const collectFiles = async (patterns: string[], ignore: string[]): Promise<string[]> => {
  const files: string[] = [];
  for await (const file of glob(patterns, { exclude: ignore })) {
    files.push(file);
  }
  return files;
};

export const reportResults = (
  results: Array<"sorted" | "changed" | "failed">,
  options: { check: boolean; quiet: boolean },
): void => {
  const changed = results.filter((result) => result === "changed").length;
  const failed = results.filter((result) => result === "failed").length;
  const sorted = results.filter((result) => result === "sorted").length;
  if (options.check && changed > 0) {
    process.exitCode = 1;
  }
  if (failed > 0) {
    process.exitCode = 2;
  }
  if (!options.quiet) {
    if (options.check && changed > 0) {
      console.log(`${changed} ${changed === 1 ? "file was" : "files were"} not sorted.`);
    } else if (!options.check && changed > 0) {
      console.log(`${changed} ${changed === 1 ? "file" : "files"} successfully sorted.`);
    }
    if (sorted > 0) {
      console.log(`${sorted} ${sorted === 1 ? "file was" : "files were"} already sorted.`);
    }
  }
};

export const sortFiles = async (
  patterns: string[],
  options: { check: boolean; quiet: boolean; ignore?: string[]; recursive?: boolean },
): Promise<void> => {
  const loaded = await loadConfig(process.cwd());
  const ignore = [...(options.ignore ?? loaded.ignore ?? DEFAULT_IGNORE)];
  const recursive = options.recursive ?? loaded.recursive ?? false;
  const resolvedPatterns =
    patterns.length === 0 || (patterns.length === 1 && patterns[0] === "package.json")
      ? recursive
        ? RECURSIVE_PATTERNS
        : DEFAULT_PATTERNS
      : patterns;
  const files = await collectFiles(resolvedPatterns, ignore);
  if (files.length === 0) {
    console.error("No matching files.");
    process.exitCode = 2;
    return;
  }
  const results = await Promise.all(files.map((file) => sortOneFile(file, loaded, options)));
  reportResults(results, options);
};
