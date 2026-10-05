import {
  isObject,
  onArrayValue,
  onObjectValue,
  sortKeys,
  sortKeysBy,
  type FieldSorter,
} from "../core/primitives.ts";

export const PERSON_ORDER = ["name", "email", "url"];

export const TYPE_URL_ORDER = ["type", "url"];

export const GIT_HOOKS = [
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

export const sortPersonList = onArrayValue((items) =>
  items.map((item) => (isObject(item) ? sortKeys(item, PERSON_ORDER) : item)),
);

export const sortByCompare = (compare: (a: string, b: string) => number) =>
  onObjectValue((value) => sortKeysBy(value, compare));

export const alphabetical: FieldSorter = onObjectValue((value) => sortKeys(value));

export const localeAware: FieldSorter = onObjectValue((value) =>
  sortKeysBy(value, (a, b) => a.localeCompare(b, "en")),
);

export const bySubOrder =
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
