// ESTree-compatible AST builder functions.
// Drop-in replacement for the uglify-js 2 `new U2.AST_*` constructors.
// Every returned node has `.print_to_string(options?)` attached.

import { withPrint } from "./printer";

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

export function str(value: string) {
  return withPrint({ type: "Literal" as const, value });
}
export function num(value: number) {
  return withPrint({ type: "Literal" as const, value });
}
export function bo(val: boolean) {
  return withPrint({ type: "Literal" as const, value: val });
}
export function re(value: RegExp) {
  return withPrint({
    type: "Literal" as const,
    value,
    regex: { pattern: value.source, flags: value.flags },
  });
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export function id(name: string) {
  return withPrint({ type: "Identifier" as const, name });
}
export function dot(object: any, property: string) {
  return withPrint({
    type: "MemberExpression" as const,
    computed: false,
    object,
    property: { type: "Identifier" as const, name: property },
  });
}
export function sub(object: any, property: any) {
  return withPrint({
    type: "MemberExpression" as const,
    computed: true,
    object,
    property,
  });
}
export function call(callee: any, args: any[]) {
  return withPrint({
    type: "CallExpression" as const,
    callee,
    arguments: args,
  });
}
export function newexp(callee: any, args: any[]) {
  return withPrint({ type: "NewExpression" as const, callee, arguments: args });
}
/** Operator: `===`, `!==`, `||`, `&&`, `+`, `-`, `<`, `>`, `<=`, `>=`, `==` etc. */
export function binary(left: any, operator: string, right: any) {
  const isLogical = operator === "||" || operator === "&&";
  return withPrint({
    type: (isLogical ? "LogicalExpression" : "BinaryExpression") as any,
    left,
    operator,
    right,
  });
}
export function unary(operator: string, argument: any) {
  return withPrint({
    type: "UnaryExpression" as const,
    operator,
    prefix: true,
    argument,
  });
}
export function cond(test: any, consequent: any, alternate: any) {
  return withPrint({
    type: "ConditionalExpression" as const,
    test,
    consequent,
    alternate,
  });
}
export function assign(left: any, operator: string, right: any) {
  return withPrint({
    type: "AssignmentExpression" as const,
    operator,
    left,
    right,
  });
}

// ---------------------------------------------------------------------------
// Object / collection literals
// ---------------------------------------------------------------------------

export function this_expr() {
  return withPrint({ type: "ThisExpression" as const });
}
export function obj(properties: any[]) {
  return withPrint({ type: "ObjectExpression" as const, properties });
}
export function prop(key: string | any, value: any) {
  const k =
    typeof key === "string" ? { type: "Literal" as const, value: key } : key;
  return withPrint({
    type: "Property" as const,
    kind: "init" as const,
    key: k,
    value,
    computed: false,
    method: false,
    shorthand: false,
  });
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export function func(params: any[], body: any) {
  return withPrint({
    type: "FunctionExpression" as const,
    params,
    body,
    id: null,
    generator: false,
    async: false,
  });
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export function directive(value: string) {
  return withPrint({
    type: "ExpressionStatement" as const,
    expression: { type: "Literal" as const, value },
    directive: value,
  });
}
export function expr(expression: any) {
  return withPrint({ type: "ExpressionStatement" as const, expression });
}
export function block(body: any[]) {
  return withPrint({ type: "BlockStatement" as const, body });
}
export function ret(argument: any) {
  return withPrint({ type: "ReturnStatement" as const, argument });
}
export function if_stmt(test: any, consequent: any, alternate?: any) {
  return withPrint({
    type: "IfStatement" as const,
    test,
    consequent,
    alternate: alternate ?? null,
  });
}
export function do_while(body: any, test: any) {
  return withPrint({ type: "DoWhileStatement" as const, body, test });
}
export function switch_stmt(discriminant: any, cases: any[]) {
  return withPrint({ type: "SwitchStatement" as const, discriminant, cases });
}
export function case_stmt(test: any, consequent: any[]) {
  return withPrint({ type: "SwitchCase" as const, test, consequent });
}
export function default_stmt(consequent: any[]) {
  return withPrint({ type: "SwitchCase" as const, test: null, consequent });
}

// ---------------------------------------------------------------------------
// Variable declaration
// ---------------------------------------------------------------------------

export function var_decl(declarations: any[]) {
  return withPrint({
    type: "VariableDeclaration" as const,
    kind: "var" as const,
    declarations,
  });
}
export function vardef(id: any, init?: any) {
  return withPrint({
    type: "VariableDeclarator" as const,
    id,
    init: init ?? null,
  });
}

// ---------------------------------------------------------------------------
// Top-level / program
// ---------------------------------------------------------------------------

export function toplevel(body: any[]) {
  return withPrint({
    type: "Program" as const,
    body,
    sourceType: "script" as const,
  });
}

// ---------------------------------------------------------------------------
// Custom node types
// ---------------------------------------------------------------------------

/** Raw JS code snippet injected verbatim into the output. */
export function raw(code: string) {
  return withPrint({ type: "RawCode" as const, code });
}
