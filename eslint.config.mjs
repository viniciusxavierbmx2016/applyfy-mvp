import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    settings: {
      // Pin to a literal version (not "detect") because eslint-plugin-react's
      // detection helper uses an ESLint 9 context API that's broken in ESLint 10.
      react: { version: "19.0.0" },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      // eslint-plugin-react@7.x is incompatible with ESLint 10's context API
      // for prop-type detection rules. Disable until eslint-config-next bumps.
      "react/display-name": "off",
      "react/prop-types": "off",
      // react-hooks v7 added strict rules that flag widely-used patterns.
      // Demoted to warnings so lint surfaces them without blocking.
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      // set-state-in-effect is React 19 guidance to migrate to Server
      // Components / Suspense data fetching. Our current pattern (fetch +
      // setState in useEffect) is correct and functional. Refactoring 40+
      // components would carry real risk for no runtime benefit.
      "react-hooks/set-state-in-effect": "off",
      // Single false positive in producer-tour driver.js CSS import; the
      // page-custom-font rule is meant for <Head> font links, not CSS modules.
      "@next/next/no-page-custom-font": "off",
    },
  },
  {
    ignores: [".next/", "node_modules/", "public/"],
  },
];

export default eslintConfig;
