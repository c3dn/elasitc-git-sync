<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { KeyRound, Loader, CheckCircle, AlertTriangle } from 'lucide-svelte';

	let { form } = $props();

	let loading = $state(false);
	let success = $state(false);
</script>

<svelte:head>
	<title>Account - Settings - Elastic Git Sync</title>
</svelte:head>

<div class="max-w-xl">
	<!-- User Info -->
	<div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Information</h2>
		<div class="text-sm text-gray-600 dark:text-gray-400">
			<span class="font-medium text-gray-700 dark:text-gray-300">E-Mail:</span>
			{$page.data.user?.email || '—'}
		</div>
	</div>

	<!-- Change Password -->
	<div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
		<div class="flex items-center gap-3 mb-6">
			<div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
				<KeyRound class="w-5 h-5 text-primary-600" />
			</div>
			<div>
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Change Password</h2>
				<p class="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
			</div>
		</div>

		{#if success}
			<div class="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg mb-4">
				<CheckCircle class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
				<span class="text-sm text-green-700 dark:text-green-300">Password changed successfully.</span>
			</div>
		{/if}

		{#if form?.error}
			<div class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg mb-4">
				<AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
				<span class="text-sm text-red-700 dark:text-red-300">{form.error}</span>
			</div>
		{/if}

		<form
			method="POST"
			action="?/changePassword"
			use:enhance={() => {
				loading = true;
				success = false;
				return async ({ result, update }) => {
					loading = false;
					if (result.type === 'success') {
						success = true;
						// Clear form fields by updating
						await update({ reset: true });
					} else {
						await update();
					}
				};
			}}
			class="space-y-4"
		>
			<div>
				<label for="oldPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Current Password
				</label>
				<input
					id="oldPassword"
					name="oldPassword"
					type="password"
					required
					autocomplete="current-password"
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					New Password
				</label>
				<input
					id="newPassword"
					name="newPassword"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
				/>
				<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Minimum 8 characters</p>
			</div>

			<div>
				<label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Confirm New Password
				</label>
				<input
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
				/>
			</div>

			<div class="pt-2">
				<button
					type="submit"
					disabled={loading}
					class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
				>
					{#if loading}
						<Loader class="w-4 h-4 animate-spin" />
						Saving...
					{:else}
						<KeyRound class="w-4 h-4" />
						Change Password
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
