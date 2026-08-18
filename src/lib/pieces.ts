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

export function groupByYear(pieces: Piece[]): Map<number, Piece[]> {
	const groups = new Map<number, Piece[]>();
	for (const piece of pieces) {
		const year = piece.data.date.getFullYear();
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
