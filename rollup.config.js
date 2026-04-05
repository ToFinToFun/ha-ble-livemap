import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";

export default {
  input: "src/ble-livemap-card.ts",
  output: {
    file: "dist/ble-livemap.js",
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
};
