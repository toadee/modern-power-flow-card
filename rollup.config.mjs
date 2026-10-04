import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import url from '@rollup/plugin-url';

const plugins = [
  // Always inline scene artwork as a data URI so it ships inside the single JS file
  url({
    include: ['**/*.webp', '**/*.png'],
    limit: Infinity,
  }),
  nodeResolve({
    jsnext: true,
    main: true,
  }),
  // ...rest unchanged
];

const isWatch = process.env.ROLLUP_WATCH === 'true';

const plugins = [
  nodeResolve({
    jsnext: true,
    main: true,
  }),
  commonjs(),
  typescript({
    include: ['**/*.ts', '**/*.tsx'],
    clean: true,
  }),
  json(),
  babel({
    exclude: 'node_modules/**',
    babelHelpers: 'bundled',
    compact: true,
    extensions: ['.js', '.ts'],
    presets: [
      [
        '@babel/env',
        {
          modules: false,
          targets: '> 2.5%, not dead',
        },
      ],
    ],
    plugins: [
      [
        '@babel/plugin-proposal-decorators',
        {
          legacy: true,
        },
      ],
      ['@babel/plugin-proposal-class-properties'],
      ['@babel/plugin-transform-template-literals'],
    ],
  }),
  // Only minify in non-watch (build) mode for better dev experience
  !isWatch && terser(),
].filter(Boolean);

export default {
  input: ['./src/index.ts'],
  output: {
    file: 'dist/solar-powerflow-card.js',
    format: 'esm',
    name: 'SolarkPowerFlowCard',
    inlineDynamicImports: true,
    sourcemap: true,
  },
  watch: {
    clearScreen: false,
  },
  plugins: [...plugins],
  onwarn: function (warning, handler) {
    if (warning.code === 'THIS_IS_UNDEFINED') {
      return;
    }

    // console.warn everything else
    handler(warning);
  },
};
