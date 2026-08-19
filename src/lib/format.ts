export function formatPrice(price: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(price);
}

export function formatDate(date: Date): string {
	// Render in UTC. A bare `date: 2026-08-19` in frontmatter parses as UTC
	// midnight, so formatting in a negative-offset local timezone would render
	// it as the previous day.
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC',
	}).format(date);
}
