import js from '@eslint/js';

export default [
	js.configs.recommended,
	{
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				AbortController: 'readonly',
				console: 'readonly',
				fetch: 'readonly',
				process: 'readonly',
				React: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly'
			}
		},
		rules: {
			'no-unused-vars': 'off',
			'no-undef': 'off'
		}
	}
];
