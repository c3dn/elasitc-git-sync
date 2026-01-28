<script lang="ts">
	import { Cloud, GitBranch, ChevronRight } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Settings - Elastic Git Sync</title>
</svelte:head>

<div>
	<h1 class="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
	<p class="text-gray-600 mb-8">Configure your Elastic instances and Git repositories</p>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Elastic Instances Card -->
		<a
			href="/settings/elastic"
			class="block bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
		>
			<div class="flex items-start justify-between">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
						<Cloud class="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
							Elastic Instances
						</h2>
						<p class="text-gray-600 mt-1">
							Manage your Elasticsearch/Kibana connections and API keys
						</p>
					</div>
				</div>
				<ChevronRight class="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
			</div>
		</a>

		<!-- Git Repositories Card -->
		<a
			href="/settings/git"
			class="block bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
		>
			<div class="flex items-start justify-between">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
						<GitBranch class="w-6 h-6 text-orange-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
							Git Repositories
						</h2>
						<p class="text-gray-600 mt-1">
							Configure Git repositories for storing security rules
						</p>
					</div>
				</div>
				<ChevronRight class="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
			</div>
		</a>
	</div>
</div>
