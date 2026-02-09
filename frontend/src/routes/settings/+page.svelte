<script lang="ts">
	import { Cloud, GitBranch, ChevronRight, KeyRound } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Settings - Elastic Git Sync</title>
</svelte:head>

<div>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h1>
	<p class="text-gray-600 dark:text-gray-400 mb-8">Configure your Elastic instances, Git repositories, and account</p>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Elastic Instances Card -->
		<a
			href="/settings/elastic"
			class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all group"
		>
			<div class="flex items-start justify-between">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<Cloud class="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600">
							Elastic Instances
						</h2>
						<p class="text-gray-600 dark:text-gray-400 mt-1">
							Manage your Elasticsearch/Kibana connections and API keys
						</p>
					</div>
				</div>
				<ChevronRight class="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 transition-colors" />
			</div>
		</a>

		<!-- Git Repositories Card -->
		<a
			href="/settings/git"
			class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all group"
		>
			<div class="flex items-start justify-between">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<GitBranch class="w-6 h-6 text-orange-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600">
							Git Repositories
						</h2>
						<p class="text-gray-600 dark:text-gray-400 mt-1">
							Configure Git repositories for storing security rules
						</p>
					</div>
				</div>
				<ChevronRight class="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 transition-colors" />
			</div>
		</a>

		<!-- Account Card -->
		<a
			href="/settings/account"
			class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all group"
		>
			<div class="flex items-start justify-between">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<KeyRound class="w-6 h-6 text-purple-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600">
							Account
						</h2>
						<p class="text-gray-600 dark:text-gray-400 mt-1">
							Change your password and manage account settings
						</p>
					</div>
				</div>
				<ChevronRight class="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 transition-colors" />
			</div>
		</a>
	</div>
</div>
