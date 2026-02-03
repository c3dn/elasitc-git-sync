import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark' | 'system';

function getInitialTheme(): ThemeMode {
	if (!browser) return 'system';
	return (localStorage.getItem('theme') as ThemeMode) || 'system';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
	if (mode !== 'system') return mode;
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
	if (!browser) return;
	const resolved = resolveTheme(mode);
	document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export const themeMode = writable<ThemeMode>(getInitialTheme());

// Apply theme whenever it changes
themeMode.subscribe((mode) => {
	if (browser) {
		localStorage.setItem('theme', mode);
		applyTheme(mode);
	}
});

export function toggleTheme() {
	themeMode.update((current) => {
		if (current === 'light') return 'dark';
		if (current === 'dark') return 'system';
		return 'light';
	});
}

export function initTheme() {
	if (!browser) return;
	applyTheme(getInitialTheme());

	// Listen for OS theme changes when in system mode
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		const current = localStorage.getItem('theme') as ThemeMode || 'system';
		if (current === 'system') {
			applyTheme('system');
		}
	});
}
