import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";

// Build two files:
// 1. ble-livemap-card.js — tiny stable loader (never changes, handles cache-busting)
// 2. ble-livemap-core.js — all actual card code (changes with every update)

const sharedPlugins = [
  resolve(),
  commonjs(),
  json(),
  typescript(),
  terser({
    format: {
      comments: false,
    },
  }),
];

export default [
  // The loader — this is what HACS and panel_custom point to.
  // It dynamically imports ble-livemap-core.js with a timestamp to bust cache.
  {
    input: "src/loader.ts",
    output: {
      file: "dist/ble-livemap-card.js",
      format: "es",
      sourcemap: false,
    },
    plugins: sharedPlugins,
  },
  // The core — all actual card, panel, renderer code.
  {
    input: "src/ble-livemap-card.ts",
    output: {
      file: "dist/ble-livemap-core.js",
      format: "es",
      sourcemap: false,
    },
    plugins: [
      resolve(),
      commonjs(),
      json(),
      typescript(),
      terser({
        format: {
          comments: false,
        },
      }),
    ],
  },
];
