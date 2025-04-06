import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";


export default defineConfig([
  {
    languageOptions: {
      globals: {
        //"$": "writable",
        "$": "readonly",
        "_": "readonly",
        "moment": "readonly"
      }
    }
  },
  { files: ["website/ngApp/**/*.ts"] },
  //{ files: ["**/*.js"], languageOptions: { sourceType: "script" } },
  { files: ["website/ngApp/**/*.ts"], languageOptions: { globals: globals.browser } },
  //{ files: ["website/ngApp/**/*.ts"], plugins: { js }, extends: ["js/recommended"] },
  tseslint.configs.recommended,
  {
    rules: {
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    ignores: ['**/*.js','website/Scripts/typings/**/*.ts','packages/**/*.ts','website/js/**/*.ts']
  }
]);