import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'next-env.d.ts',
    'scripts/**',
    'public/**',
  ]),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react/no-unescaped-entities': 'off',
      // react-hooks v6（eslint-config-next 16）对「effect → async loader → setState」
      // 的挂载期取数模式一律报错（await 之后也拦），与全站统一的取数写法冲突；
      // 降级为 warning：现有代码保持不动，新增代码尽量用 await 边界/派生状态规避。
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);

export default eslintConfig;
