#!/usr/bin/env node
import { parseArgs } from "node:util";

import { DEFAULT_IGNORE, DEFAULT_PATTERNS, sortFiles, sortStdin } from "../cli.ts";

const showHelp = (): void => {
  console.log(`Usage: pkg-json-order [options] [file/glob ...]

Sort package.json files with .pkg-json-order.{ts,js} config.
If file/glob is omitted, './package.json' is processed.

  -c, --check   Check if files are sorted
  -q, --quiet   Don't output success messages
  -h, --help    Display this help
  -i, --ignore  Glob patterns to ignore
  -r, --recursive Search package.json files recursively
  --stdin       Read package.json from stdin
`);
};

const parseCli = (): {
  options: { check: boolean; quiet: boolean; stdin: boolean; ignore: string[]; recursive: boolean };
  patterns: string[];
} => {
  const { values, positionals } = parseArgs({
    options: {
      check: { type: "boolean", short: "c", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      stdin: { type: "boolean", default: false },
      ignore: { type: "string", short: "i", multiple: true, default: DEFAULT_IGNORE },
      recursive: { type: "boolean", short: "r", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });
  if (values.help) {
    showHelp();
    process.exit(0);
  }
  return {
    options: {
      check: values.check ?? false,
      quiet: values.quiet ?? false,
      stdin: values.stdin ?? false,
      ignore: values.ignore ?? DEFAULT_IGNORE,
      recursive: values.recursive ?? false,
    },
    patterns: positionals.length > 0 ? positionals : DEFAULT_PATTERNS,
  };
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
