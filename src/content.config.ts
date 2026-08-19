import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const pieces = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/pieces' }),
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),
				series: z.string().optional(),
				date: z.coerce.date(),
				clay: z.string(),
				glaze: z.string(),
				// Free-form museum-label text, e.g. `7" h × 4" w` — not structured on purpose.
				dimensions: z.string(),
				// Omit = not for sale / archive piece.
				price: z.number().positive().optional(),
				// Only ever renders a "sold" badge when true — never renders "available".
				sold: z.boolean().default(false),
				stripeUrl: z.string().url().optional(),
				images: z
					.object({
						src: image(),
						alt: z.string().min(1),
					})
					.array()
					.min(1)
					.max(4),
				featured: z.boolean().default(false),
				// Optional on purpose — some pieces are photo-ready but not yet written up.
				description: z.string().optional(),
			})
			.superRefine((data, ctx) => {
				if (data.price !== undefined && !data.stripeUrl) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['stripeUrl'],
						message: 'stripeUrl is required when price is set.',
					});
				}
				if (data.stripeUrl && data.price === undefined) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['price'],
						message: 'price is required when stripeUrl is set.',
					});
				}
			}),
});

const posts = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			draft: z.boolean().default(false),
			heroImage: image().optional(),
		}),
});

const likes = defineCollection({
	loader: file('./src/content/likes/likes.yaml'),
	schema: z.object({
		id: z.string(),
		// Explicit display order — getCollection returns entries sorted by id,
		// which would otherwise alphabetize the list and lose the intended order.
		order: z.number().int(),
		title: z.string(),
		url: z.string().url(),
		note: z.string(),
		category: z.string().optional(),
	}),
});

export const collections = { pieces, posts, likes };
