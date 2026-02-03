<script lang="ts">
	import { page } from '$app/stores';
	import { Server, FolderGit2, UserCog, Webhook } from 'lucide-svelte';

	const tabs = [
		{ name: 'Elastic Instances', href: '/settings/elastic', icon: Server },
		{ name: 'Git Repositories', href: '/settings/git', icon: FolderGit2 },
		{ name: 'Webhooks', href: '/settings/webhooks', icon: Webhook },
		{ name: 'Account', href: '/settings/account', icon: UserCog }
	];
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Configure Elastic instances, Git repositories, webhooks, and your account
		</p>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200 dark:border-gray-700">
		<nav class="flex gap-8">
			{#each tabs as tab}
				<a
					href={tab.href}
					class="flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
						{$page.url.pathname === tab.href
							? 'border-primary-600 text-primary-600'
							: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}"
				>
					<svelte:component this={tab.icon} class="w-4 h-4" />
					{tab.name}
				</a>
			{/each}
		</nav>
	</div>

	<!-- Content -->
	<slot />
</div>
