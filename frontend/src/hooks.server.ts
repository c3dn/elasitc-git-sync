import PocketBase from 'pocketbase';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const pb = new PocketBase('http://pocketbase:8090');

	// Load the store data from the cookie
	const cookie = event.request.headers.get('cookie') || '';
	pb.authStore.loadFromCookie(cookie);

	event.locals.pb = pb;
	event.locals.user = pb.authStore.model;

	const response = await resolve(event);

	// Send back the auth cookie
	const setCookie = pb.authStore.exportToCookie({ httpOnly: false });
	response.headers.append('set-cookie', setCookie);

	return response;
};
