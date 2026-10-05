import { chmod, glob, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";

import { loadConfig } from "./core/config.ts";
import { sortPackageJson } from "./sort.ts";

export interface CliOptions {
  check: boolean;
  quiet: boolean;
  stdin: boolean;
  ignore?: string[] | undefined;
  recursive?: boolean | undefined;
}

export const DEFAULT_PATTERNS = ["package.json"];
export const RECURSIVE_PATTERNS = ["**/package.json"];
export const DEFAULT_IGNORE = ["**/node_modules/**"];

export const sortStdin = async (options?: { check: boolean; quiet: boolean }): Promise<void> => {
  process.stdin.setEncoding("utf8");

  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const config = await loadConfig(process.cwd());
  const sorted = sortPackageJson(input, config);

  if (options?.check) {
    if (sorted !== input) {
      process.exitCode = 1;
    }
    return;
  }

  process.stdout.write(sorted);
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
    await writeFileAtomically(file, next);

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

const writeFileAtomically = async (file: string, contents: string): Promise<void> => {
  const target = await realpath(file);
  const mode = (await stat(target)).mode & 0o777;
  const temp = `${target}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;

  try {
    await writeFile(temp, contents, { mode });
    await chmod(temp, mode);
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
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
  options: {
    check: boolean;
    quiet: boolean;
    ignore?: string[] | undefined;
    recursive?: boolean | undefined;
  },
): Promise<void> => {
  const loaded = await loadConfig(process.cwd());
  const ignore = [...(options.ignore ?? loaded.ignore ?? DEFAULT_IGNORE)];
  const recursive = options.recursive ?? loaded.recursive ?? false;
  const resolvedPatterns =
    patterns.length === 0 ? (recursive ? RECURSIVE_PATTERNS : DEFAULT_PATTERNS) : patterns;

  const files = await collectFiles(resolvedPatterns, ignore);

  if (files.length === 0) {
    console.error("No matching files.");
    process.exitCode = 2;
    return;
  }

  const results = await Promise.all(files.map((file) => sortOneFile(file, loaded, options)));
  reportResults(results, options);
};
