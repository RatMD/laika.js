import path from "node:path";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const input = "src/index.ts";
const outDir = "dist";

export default [
    {
        input,
        output: [
            {
                name: 'Laika',
                file: path.join(outDir, "laika.mjs"),
                format: "esm",
                sourcemap: true,
                globals: {
                    vue: 'Vue'
                }
            },
            {
                name: 'Laika',
                file: path.join(outDir, "laika.cjs"),
                format: "cjs",
                sourcemap: true,
                exports: "named",
                globals: {
                    vue: 'Vue'
                }
            },
            {
                name: 'Laika',
                file: path.join(outDir, "laika.js"),
                format: "umd",
                sourcemap: true,
                globals: {
                    vue: 'Vue'
                }
            },
        ],
        plugins: [
            resolve({ preferBuiltins: true }),
            commonjs(),
            typescript({
                tsconfig: "./tsconfig.build.json",
            }),
            terser()
        ],
        external: ["vue"],
    },
    {
        input: "src/vite/index.ts",
        output: [
            { file: path.join(outDir, "vite.mjs"), format: "esm", sourcemap: true },
        ],
        plugins: [
            resolve({ preferBuiltins: true }),
            commonjs(),
            typescript({
                tsconfig: "./tsconfig.build.json",
            }),
            terser()
        ],
        external: ["vite", "node:fs", "node:path", "node:url", "vue"],
    },
    {
        input,
        output: [{ file: path.join(outDir, "laika.d.ts"), format: "es" }],
        plugins: [dts({ tsconfig: 'tsconfig.types.json' })],
        external: ["vue"],
    }
];
