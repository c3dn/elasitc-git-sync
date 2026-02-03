<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { LogIn, AlertCircle } from 'lucide-svelte';
	import type { ActionData } from './$types';

	export let form: ActionData;

	let loading = false;
</script>

<svelte:head>
	<title>Login - Elastic Git Sync</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
				<LogIn class="w-8 h-8 text-white" />
			</div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Elastic Git Sync</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-2">Sign in to manage your security rules</p>
		</div>

		<!-- Login Card -->
		<div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
			<h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Sign In</h2>

			{#if form?.error}
				<div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<p class="text-sm text-red-800">{form.error}</p>
				</div>
			{/if}

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					// Clear any previous error
					form = null;
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'redirect') {
							// Successful login, redirect
							window.location.href = result.location;
						} else {
							// Failed login, show error
							await update();
						}
					};
				}}
				class="space-y-5"
			>
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Email Address
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						autofocus
						placeholder="admin@example.com"
						class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-colors"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						placeholder="Enter your password"
						class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-colors"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
				>
					{#if loading}
						<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
						Signing in...
					{:else}
						<LogIn class="w-5 h-5" />
						Sign In
					{/if}
				</button>
			</form>

			<div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
				<p class="text-sm text-gray-600 dark:text-gray-400 text-center">
					Need help? Contact your administrator to create an account.
				</p>
			</div>
		</div>

		<!-- Footer -->
		<p class="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
			Elastic Git Sync v1.0.0 • Secure Authentication
		</p>
	</div>
</div>
