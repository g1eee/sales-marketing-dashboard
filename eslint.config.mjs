import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored/generated component registry (shadcn/reui) — not hand-authored
    // app code. Still type-checked by tsc; just not style/rules-of-hooks linted,
    // since base-ui's render patterns trip those rules.
    "components/ui/**",
    "components/reui/**",
    "components/examples/**",
    "hooks/use-mobile.ts",
    "hooks/use-file-upload.ts",
  ]),
]);

export default eslintConfig;
