// Drives the photo carousel on a piece page. Served as a plain static file
// and loaded with `is:inline` from PieceCarousel.astro — Astro's default
// script handling inlines small scripts directly into the page, which the
// site's CSP (`script-src 'self'`, no 'unsafe-inline') silently blocks in
// production. A real external file keeps the carousel working everywhere.
const root = document.querySelector('[data-carousel]');

if (root) {
	const slides = Array.from(root.querySelectorAll('[data-slide]'));
	const dots = Array.from(root.querySelectorAll('[data-dot]'));
	let index = 0;

	const show = (i) => {
		index = (i + slides.length) % slides.length;
		slides.forEach((slide, n) => slide.classList.toggle('active', n === index));
		dots.forEach((dot, n) => dot.setAttribute('aria-current', String(n === index)));
	};

	root.querySelector('.prev')?.addEventListener('click', () => show(index - 1));
	root.querySelector('.next')?.addEventListener('click', () => show(index + 1));
	dots.forEach((dot, n) => dot.addEventListener('click', () => show(n)));

	root.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowLeft') show(index - 1);
		if (e.key === 'ArrowRight') show(index + 1);
	});
}
