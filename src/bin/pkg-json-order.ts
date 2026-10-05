#!/usr/bin/env node
import { glob, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { loadConfig, sortPackageJson } from "../index.ts";

const showHelp = (): void => {
  console.log(`Usage: pkg-json-order [options] [file/glob ...]

Sort package.json files with .pkg-json-order.{ts,js} config.
If file/glob is omitted, './package.json' is processed.

  -c, --check   Check if files are sorted
  -q, --quiet   Don't output success messages
  -h, --help    Display this help
  -i, --ignore  Glob patterns to ignore
  -v, --version Display the package version
  --stdin       Read package.json from stdin
`);
};

const parseCli = (): {
  options: { check: boolean; quiet: boolean; stdin: boolean; ignore: string[] };
  patterns: string[];
} => {
  const { values, positionals } = parseArgs({
    options: {
      check: { type: "boolean", short: "c", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      stdin: { type: "boolean", default: false },
      ignore: { type: "string", short: "i", multiple: true, default: ["node_modules/**"] },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });
  if (values.help) {
    showHelp();
    process.exit(0);
  }
  if (values.version) {
    console.log("pkg-json-order 0.1.0");
    process.exit(0);
  }
  return {
    options: {
      check: values.check ?? false,
      quiet: values.quiet ?? false,
      stdin: values.stdin ?? false,
      ignore: values.ignore ?? ["node_modules/**"],
    },
    patterns: positionals.length > 0 ? positionals : ["package.json"],
  };
};

const sortStdin = async (): Promise<void> => {
  let input = "";
  for await (const chunk of process.stdin) {
    input += String(chunk);
  }
  const config = await loadConfig(process.cwd());
  process.stdout.write(sortPackageJson(input, config));
};

const sortOneFile = async (
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

const sortFiles = async (
  patterns: string[],
  options: { check: boolean; quiet: boolean; ignore: string[] },
): Promise<void> => {
  const files: string[] = [];
  for await (const file of glob(patterns, { exclude: options.ignore })) {
    files.push(file);
  }
  if (files.length === 0) {
    console.error("No matching files.");
    process.exitCode = 2;
    return;
  }
  const config = await loadConfig(process.cwd());
  const results = await Promise.all(files.map((file) => sortOneFile(file, config, options)));
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

try {
  const { options, patterns } = parseCli();
  if (options.stdin) {
    await sortStdin();
  } else {
    await sortFiles(patterns, options);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
