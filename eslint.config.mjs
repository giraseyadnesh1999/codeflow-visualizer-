import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  { ignores: ['.next/**', '.next-dev/**', 'out/**', 'node_modules/**', 'public/sw.js', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/lib/interpreter/**/*.ts'],
    rules: {
      // The evaluator walks acorn's untyped ESTree nodes; `any` there is deliberate.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default config
