import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	changePassword: async ({ locals, request }) => {
		const formData = await request.formData();
		const oldPassword = formData.get('oldPassword') as string;
		const newPassword = formData.get('newPassword') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!oldPassword || !newPassword || !confirmPassword) {
			return fail(400, { error: 'All fields are required' });
		}

		if (newPassword.length < 8) {
			return fail(400, { error: 'New password must be at least 8 characters' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'New passwords do not match' });
		}

		if (oldPassword === newPassword) {
			return fail(400, { error: 'New password must be different from current password' });
		}

		try {
			await locals.pb.collection('users').update(locals.user.id, {
				oldPassword,
				password: newPassword,
				passwordConfirm: confirmPassword
			});

			// Re-authenticate with the new password to refresh the session
			await locals.pb.collection('users').authWithPassword(locals.user.email, newPassword);

			return { success: true };
		} catch (err: any) {
			console.error('Password change error:', err);
			const message = err?.response?.data?.oldPassword?.message || err?.message || 'Failed to change password';
			return fail(400, { error: message });
		}
	}
};
