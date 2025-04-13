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
  {
    ignores: ['**/*.js','website/Scripts/typings/**/*.ts','packages/**/*.ts','website/js/**/*.ts','eslint.config.mjs']
  },
  { files: ["website/ngApp/**/*.ts"] },
  { files: ["website/ngApp/**/*.ts"], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  {
    rules: {
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-explicit-any": "off"
    }
  }
]);