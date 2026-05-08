// NOTE: uglify-js is pinned to 2.8.29 on purpose.
//
// We use uglify-js 2.x's low-level AST_* constructors (AST_Toplevel, AST_Call,
// AST_Function, …) to build PAC scripts in src/conditions.ts, src/profiles.ts
// and src/pac_generator.ts. The 3.x line dropped the public AST_* API
// entirely — it now only exposes minify().
//
// Migrating to terser (the spiritual successor of uglify-es that still keeps
// AST classes) is tracked as its own upgrade milestone; see the top-level
// dependency upgrade plan. Until then keep uglify-js == 2.8.29 and do not
// upgrade to ^3.x without also rewriting the PAC generator.
require("uglify-js-real");
module.exports = UglifyJS;
