import { getCollection, type CollectionEntry } from 'astro:content';

export type Piece = CollectionEntry<'pieces'>;

export async function getAllPieces(): Promise<Piece[]> {
	const pieces = await getCollection('pieces');
	return pieces.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function isPurchasable(piece: Piece): boolean {
	return piece.data.price !== undefined && !piece.data.sold;
}

export async function getPurchasablePieces(): Promise<Piece[]> {
	const pieces = await getAllPieces();
	return pieces.filter(isPurchasable);
}

/**
 * Stand-in `stripeUrl`s are marked with "placeholder" until the real Payment
 * Links exist. The site is public, so a Buy button pointing at a fake Stripe
 * URL would hand a real visitor a dead checkout — these fall back to email
 * instead, and flip to a live button automatically once real URLs land.
 */
export function isLivePaymentLink(url: string | undefined): url is string {
	return typeof url === 'string' && !url.includes('placeholder');
}

/** Purchasable *and* actually checkout-able right now. */
export function canCheckout(piece: Piece): boolean {
	return isPurchasable(piece) && isLivePaymentLink(piece.data.stripeUrl);
}

export function groupByYear(pieces: Piece[]): Map<number, Piece[]> {
	const groups = new Map<number, Piece[]>();
	for (const piece of pieces) {
		// UTC to match how bare frontmatter dates parse — getFullYear() would put a
		// Jan 1 piece in the previous year for anyone in a negative-offset timezone.
		const year = piece.data.date.getUTCFullYear();
		const group = groups.get(year);
		if (group) {
			group.push(piece);
		} else {
			groups.set(year, [piece]);
		}
	}
	return groups;
}

export function getSeriesList(pieces: Piece[]): string[] {
	const series = new Set<string>();
	for (const piece of pieces) {
		if (piece.data.series) series.add(piece.data.series);
	}
	return [...series].sort();
}

export function seriesSlug(series: string): string {
	return series.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
