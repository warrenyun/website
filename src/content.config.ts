import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

// one markdown file per post in src/content/blog; the filename is the url slug
const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		description: z.string().optional(),
		// posts that live on another site: the list links straight there and no page is built here
		url: z.string().url().optional(),
		// drafts show up in `pnpm dev` but are left out of the build
		draft: z.boolean().default(false),
	}),
});

export const collections = { blog };
