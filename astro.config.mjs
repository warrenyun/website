// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
	// set this to the real domain to get canonical/og urls in BaseHead
	// site: 'https://…',
	compressHTML: true,
	adapter: vercel(),
	markdown: {
		shikiConfig: { theme: 'gruvbox-dark-medium' },
	},
});
