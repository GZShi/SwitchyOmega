// Simple local-variable mangler for the PAC script AST.
// Scopes defined by FunctionExpression / FunctionDeclaration nodes.
// Walks top-down, assigns short names from a frequency-ordered pool,
// skips names already taken by enclosing scopes.

// Globals that must NOT be renamed (PAC sandbox entry and built-ins).
const GLOBALS = new Set([
  "FindProxyForURL",
  "isInNet",
  "isInNetEx",
  "Date",
  "String",
  "RegExp",
  "parseInt",
  "parseFloat",
  "isNaN",
  "Object",
  "Array",
  "Math",
  "JSON",
  "window",
  "globalThis",
  "console",
]);

const SHORT = "terni uoasc ldfpmh gbxywv qzjk".replace(/ /g, "");

/**
 * Rename local variables in all function scopes to short names.
 * Modifies the AST **in place**.
 */
export function mangle(ast: any): void {
  walkAndMangle(ast, {}, new Set());
}

function walkAndMangle(
  node: any,
  inherited: Record<string, string>,
  usedNames: Set<string>,
): Record<string, string> {
  if (!node || typeof node !== "object") return inherited;

  if (
    (node.type === "FunctionExpression" ||
      node.type === "FunctionDeclaration") &&
    Array.isArray(node.params)
  ) {
    const localNames: string[] = [];

    // Collect params
    for (const p of node.params) {
      if (p.type === "Identifier" && !GLOBALS.has(p.name)) {
        localNames.push(p.name);
      }
    }

    // Collect var declarations (skipping nested function scopes)
    collectVarNames(node.body, localNames);

    // Deduplicate
    const deduped = [...new Set(localNames)].sort();
    const renames: Record<string, string> = { ...inherited };
    const used = new Set(Object.values(renames));
    let idx = 0;

    for (const n of deduped) {
      if (!(n in renames)) {
        while (idx < SHORT.length && used.has(SHORT[idx])) idx++;
        renames[n] = idx < SHORT.length ? SHORT[idx++] : n;
        used.add(renames[n]);
      }
    }

    // Rename params themselves (Identifier nodes in the param list)
    for (const p of node.params) {
      if (p.type === "Identifier" && p.name in renames) {
        p.name = renames[p.name];
      }
    }

    // Replace identifiers in the function body
    replaceIdentifiers(node.body, renames);

    // Process nested functions
    walkChildFunctions(node.body, renames, new Set(Object.values(renames)));
    return renames;
  }

  return walkChildren(node, inherited, usedNames);
}

function walkChildren(
  node: any,
  inherited: Record<string, string>,
  usedNames: Set<string>,
): Record<string, string> {
  if (!node || typeof node !== "object") return inherited;
  let current = inherited;
  const used = new Set(usedNames);

  if (Array.isArray(node)) {
    for (const item of node) {
      current = walkAndMangle(item, current, used);
    }
    return current;
  }

  for (const key of Object.keys(node)) {
    if (key === "type" || key === "print_to_string") continue;
    const val = node[key];
    if (val && typeof val === "object") {
      current = walkAndMangle(val, current, used);
    }
  }
  return current;
}

function walkChildFunctions(
  node: any,
  inherited: Record<string, string>,
  usedNames: Set<string>,
): void {
  if (!node || typeof node !== "object") return;

  if (
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration"
  ) {
    walkAndMangle(node, inherited, usedNames);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walkChildFunctions(item, inherited, usedNames);
    }
    return;
  }

  for (const key of Object.keys(node)) {
    if (key === "type" || key === "print_to_string") continue;
    const val = node[key];
    if (val && typeof val === "object") {
      walkChildFunctions(val, inherited, usedNames);
    }
  }
}

function replaceIdentifiers(
  node: any,
  renames: Record<string, string>,
): void {
  if (!node || typeof node !== "object") return;

  if (node.type === "Identifier" && node.name in renames) {
    node.name = renames[node.name];
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      replaceIdentifiers(item, renames);
    }
    return;
  }

  for (const key of Object.keys(node)) {
    if (key === "type" || key === "print_to_string") continue;
    const val = node[key];
    if (val && typeof val === "object") {
      replaceIdentifiers(val, renames);
    }
  }
}

function collectVarNames(node: any, out: string[]): void {
  if (!node || typeof node !== "object") return;

  if (
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration"
  ) {
    return;
  }

  if (node.type === "VariableDeclarator" && node.id?.type === "Identifier") {
    out.push(node.id.name);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectVarNames(item, out);
    }
    return;
  }

  for (const key of Object.keys(node)) {
    if (key === "type" || key === "print_to_string") continue;
    const val = node[key];
    if (val && typeof val === "object") {
      collectVarNames(val, out);
    }
  }
}
