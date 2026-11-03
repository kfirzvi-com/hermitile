import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import boundaries from 'eslint-plugin-boundaries';

/**
 * The dependency rule is enforced here rather than by convention:
 *
 *   domain          → nothing
 *   application     → domain
 *   presentation    → domain, application
 *   composition     → anything (extension.ts)
 *
 * `vscode` may only be imported by the host presentation layer and by the
 * composition root, which is what keeps the layout logic testable in Vitest.
 */
export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    {
        files: ['**/*.ts'],
        plugins: {
            '@typescript-eslint': typescriptEslint,
            boundaries,
        },
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        settings: {
            // Without a TS-aware resolver, extensionless imports fail to
            // resolve and boundaries/element-types silently skips them — the
            // rule appears to pass while enforcing nothing.
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: ['tsconfig.host.json'],
                },
            },
            'boundaries/include': ['src/**/*.ts'],
            'boundaries/elements': [
                // The first pattern that matches wins: composition first.
                { type: 'composition', pattern: 'src/extension.ts', mode: 'file' },
                { type: 'domain', pattern: 'src/domain/**' },
                { type: 'application', pattern: 'src/application/**' },
                { type: 'presentation', pattern: 'src/presentation/**' },
            ],
        },
        rules: {
            'boundaries/element-types': [
                'error',
                {
                    default: 'disallow',
                    rules: [
                        { from: ['domain'], allow: ['domain'] },
                        { from: ['application'], allow: ['domain', 'application'] },
                        {
                            from: ['presentation'],
                            allow: ['domain', 'application', 'presentation'],
                        },
                        {
                            from: ['composition'],
                            allow: ['domain', 'application', 'presentation'],
                        },
                    ],
                },
            ],
            'boundaries/external': [
                'error',
                {
                    default: 'allow',
                    rules: [
                        {
                            from: ['domain', 'application'],
                            disallow: ['vscode'],
                            message:
                                'The ${file.type} tier must stay runnable outside VS Code. Depend on a port instead.',
                        },
                    ],
                },
            ],
            curly: 'warn',
            eqeqeq: 'warn',
            'no-throw-literal': 'warn',
            semi: 'warn',
        },
    },
    {
        files: ['**/*.test.ts'],
        rules: {
            // Tests legitimately reach across tiers to build fixtures.
            'boundaries/element-types': 'off',
        },
    },
];
