import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

			try {
			await locals.pb.collection('users').authWithPassword(email, password);
		} catch (err: any) {
			console.error('Login error:', err);
			return fail(400, { error: 'Invalid email or password' });
		}

		// Auth succeeded, redirect to home
		throw redirect(303, '/');
	}
};
