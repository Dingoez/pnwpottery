import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedPosts } from '../lib/posts';
import { SITE_NAME } from '../lib/site';

export async function GET(context: APIContext) {
	const posts = await getPublishedPosts();

	return rss({
		title: SITE_NAME,
		description: 'Writing about ceramics, cities, and whatever else is on my mind.',
		// `site` comes from astro.config.mjs — without it, feed links come out relative.
		site: context.site!,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			categories: post.data.tags,
			link: `/blog/${post.id}/`,
		})),
		customData: '<language>en-us</language>',
	});
}
