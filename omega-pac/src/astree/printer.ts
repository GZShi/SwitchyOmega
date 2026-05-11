// ESTree-compatible portable printer backed by `astring`.
// Provides the `.print_to_string(options?)` method that the old uglify-js
// AST nodes exposed — every builder in `./builders.ts` attaches this.

import { generate, GENERATOR } from "astring";

// Merge custom node types with astring's default generators.
 
const CUSTOM_GENERATOR: Record<string, (node: any, state: any) => void> = {
  ...GENERATOR,
  RawCode(node: any, state: any) {
    state.write(node.code);
  },
};

function printToStr(
  this: any,
  options?: { beautify?: boolean; comments?: boolean },
): string {
  const indent = options?.beautify ? "    " : "";
  const code = generate(this, { indent, generator: CUSTOM_GENERATOR });
  if (!options?.beautify) {
    // "Compact" mode: astring has no true minifier.  Strip the per-line
    // indentation but keep newlines — user-supplied PAC scripts may
    // contain `//` comments that would eat the rest of the script if we
    // flattened to a single line.
    return code
      .replace(/^[ \t]+/gm, "")
      .replace(/[ \t]+/g, " ")
      .replace(/, +/g, ",")
      .trim();
  }
  return code;
}

/** Attach the standard `.print_to_string()` method to a plain ESTree node. */
export function withPrint<T extends Record<string, any>>(node: T): T {
  node.print_to_string = printToStr;
  return node;
}
