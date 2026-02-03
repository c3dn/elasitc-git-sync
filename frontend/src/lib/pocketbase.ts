import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Create PocketBase instance
const pbUrl = browser ? window.location.origin.replace(':3000', ':8090') : 'http://pocketbase:8090';
export const pb = new PocketBase(pbUrl);

// Disable auto cancellation to prevent request cancellation on navigation
pb.autoCancellation(false);

// Make auth state reactive
export const currentUser = writable(pb.authStore.model);

// Update store when auth changes
pb.authStore.onChange((token, model) => {
	currentUser.set(model);
});

// Load auth from cookie on client side
if (browser) {
	const authCookie = document.cookie
		.split('; ')
		.find((row) => row.startsWith('pb_auth='));

	if (authCookie) {
		try {
			const cookieValue = authCookie.split('=')[1];
			pb.authStore.loadFromCookie(cookieValue);
			currentUser.set(pb.authStore.model);
		} catch (err) {
			console.error('Failed to load auth from cookie:', err);
		}
	}
}

// Authenticated fetch wrapper - includes PocketBase auth token in requests
export function apiFetch(url: string, options?: RequestInit): Promise<Response> {
	const authHeaders: Record<string, string> = {};
	if (pb.authStore.token) {
		authHeaders['Authorization'] = pb.authStore.token;
	}
	return fetch(url, {
		...options,
		headers: {
			...authHeaders,
			...(options?.headers as Record<string, string>)
		}
	});
}
