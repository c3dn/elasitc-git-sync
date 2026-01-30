<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import {
		ArrowLeft,
		Pencil,
		Trash2,
		Loader,
		CheckCircle,
		XCircle,
		Clock,
		ArrowRight,
		ArrowDown,
		TestTube,
		Rocket,
		GitMerge,
		ExternalLink,
		FileCode,
		RefreshCw,
		GitBranch,
		Upload,
		Download,
		ChevronRight
	} from 'lucide-svelte';
	import type { ProjectExpanded, SyncJob } from '$types';
	import RuleSelectionModal from '$lib/components/RuleSelectionModal.svelte';

	interface Environment {
		id: string;
		project: string;
		name: 'test' | 'staging' | 'production';
		elastic_space: string;
		git_branch: string;
		requires_approval: boolean;
		auto_deploy: boolean;
	}

	let project = $state<ProjectExpanded | null>(null);
	let environments = $state<Environment[]>([]);
	let syncJobs = $state<SyncJob[]>([]);
	let loading = $state(true);
	let error = $state('');
	let successMessage = $state('');

	// Action states
	let syncingTest = $state(false);
	let syncingProd = $state(false);
	let creatingMR = $state(false);
	let showRuleSelection = $state(false);

	// Metrics
	let testRuleCount = $state(0);
	let prodRuleCount = $state(0);

	// Derived values
	let projectId = $derived($page.params.id);
	let testEnv = $derived(environments.find(e => e.name === 'test'));
	let prodEnv = $derived(environments.find(e => e.name === 'production'));
	let isExportOnly = $derived((project as any)?.sync_mode === 'export_only');

	onMount(async () => {
		await loadAll();
	});

	async function loadAll() {
		try {
			loading = true;
			await Promise.all([
				loadProject(),
				loadEnvironments(),
				loadSyncJobs(),
				loadMetrics()
			]);
		} finally {
			loading = false;
		}
	}

	async function loadProject() {
		try {
			project = await pb.collection('projects').getOne(projectId, {
				expand: 'elastic_instance,git_repository'
			});
		} catch (err: any) {
			error = err.message;
		}
	}

	async function loadEnvironments() {
		try {
			environments = await pb.collection('environments').getFullList({
				filter: `project = "${projectId}"`
			});
		} catch (err: any) {
			console.error('Failed to load environments:', err);
		}
	}

	async function loadSyncJobs() {
		try {
			syncJobs = await pb.collection('sync_jobs').getFullList({
				filter: `project = "${projectId}"`,
				sort: '-created',
				perPage: 10
			});
		} catch (err: any) {
			console.error('Failed to load sync jobs:', err);
		}
	}

	async function loadMetrics() {
		try {
			const response = await fetch(`${pb.baseUrl}/api/project/${projectId}/metrics`);
			if (response.ok) {
				const data = await response.json();
				testRuleCount = data.test_rules || 0;
				prodRuleCount = data.prod_rules || 0;
			}
		} catch (err) {
			console.error('Failed to load metrics:', err);
		}
	}

	function openRuleSelection() {
		showRuleSelection = true;
	}

	async function handleExport(ruleIds: string[] | null) {
		showRuleSelection = false;
		if (!testEnv) return;

		try {
			syncingTest = true;
			error = '';
			successMessage = '';

			const body: Record<string, any> = {
				project_id: projectId,
				environment_id: testEnv.id,
				direction: 'elastic_to_git',
				branch: testEnv.git_branch,
				space: testEnv.elastic_space
			};

			if (ruleIds !== null) {
				body.rule_ids = ruleIds;
			}

			const response = await fetch(`${pb.baseUrl}/api/sync/trigger`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const result = await response.json();

			if (result.success) {
				successMessage = result.message;
				await loadSyncJobs();
				await loadMetrics();
			} else {
				error = result.message || 'Failed to sync';
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			syncingTest = false;
		}
	}

	async function createMergeRequest() {
		if (!testEnv || !prodEnv) return;

		try {
			creatingMR = true;
			error = '';
			successMessage = '';

			const response = await fetch(`${pb.baseUrl}/api/merge-request/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					project_id: projectId,
					source_branch: testEnv.git_branch,
					target_branch: prodEnv.git_branch,
					title: `[Elastic Git Sync] Promote rules from ${testEnv.elastic_space} to ${prodEnv.elastic_space}`
				})
			});

			const result = await response.json();

			if (result.success && result.url) {
				let msg = 'Merge Request created!';
				if (result.conflicts_resolved) {
					msg += ` (${result.conflicts_count || 'all'} conflicts auto-resolved)`;
				}
				msg += ' Opening in new tab...';
				successMessage = msg;
				window.open(result.url, '_blank');
			} else {
				error = result.message || 'Failed to create Merge Request';
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			creatingMR = false;
		}
	}

	async function syncGitToProd() {
		if (!prodEnv) return;

		try {
			syncingProd = true;
			error = '';
			successMessage = '';

			const response = await fetch(`${pb.baseUrl}/api/sync/trigger`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					project_id: projectId,
					environment_id: prodEnv.id,
					direction: 'git_to_elastic',
					branch: prodEnv.git_branch,
					space: prodEnv.elastic_space
				})
			});

			const result = await response.json();

			if (result.success) {
				successMessage = result.message;
				await loadSyncJobs();
				await loadMetrics();
			} else {
				error = result.message || 'Failed to sync';
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			syncingProd = false;
		}
	}

	async function deleteProject() {
		if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

		try {
			for (const env of environments) {
				await pb.collection('environments').delete(env.id);
			}
			await pb.collection('projects').delete(projectId);
			goto('/projects');
		} catch (err: any) {
			error = err.message;
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed': return 'text-green-600';
			case 'failed': return 'text-red-600';
			case 'running': return 'text-blue-600';
			default: return 'text-gray-600';
		}
	}

	function getStatusBg(status: string): string {
		switch (status) {
			case 'completed': return 'bg-green-100';
			case 'failed': return 'bg-red-100';
			case 'running': return 'bg-blue-100';
			default: return 'bg-gray-100';
		}
	}

	function formatRelativeTime(dateStr: string): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function stripGitSuffix(url: string): string {
		return url?.replace(/\.git$/, '') || '';
	}
</script>

<svelte:head>
	<title>{project?.name || 'Project'} - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between animate-fade-in">
		<div>
			<a href="/projects" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2 transition-colors duration-200">
				<ArrowLeft class="w-4 h-4 transition-transform duration-200 hover:-translate-x-1" />
				Back to Projects
			</a>
			{#if loading}
				<h1 class="text-3xl font-bold text-gray-900">Loading...</h1>
			{:else if project}
				<h1 class="text-3xl font-bold text-gray-900">{project.name}</h1>
				{#if project.description}
					<p class="mt-1 text-sm text-gray-500">{project.description}</p>
				{/if}
			{/if}
		</div>
		{#if project}
			<div class="flex items-center gap-2">
				<a
					href="/projects/{projectId}/edit"
					class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<Pencil class="w-4 h-4" />
					Edit
				</a>
				<button
					on:click={deleteProject}
					class="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
				>
					<Trash2 class="w-4 h-4" />
				</button>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="alert bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	{#if successMessage}
		<div class="alert bg-green-50 border border-green-200 rounded-lg p-4">
			<p class="text-sm text-green-800">{successMessage}</p>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if project}
		<!-- Workflow Section -->
		<div class="card p-6 animate-fade-in" style="animation-delay: 100ms; opacity: 0;">
			<h2 class="text-lg font-semibold text-gray-900 mb-6">Sync Workflow</h2>

			{#if isExportOnly}
				<!-- Export Only Workflow -->
				<div class="max-w-md">
					<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<div class="flex items-center gap-2 mb-3">
							<div class="p-2 bg-yellow-100 rounded-lg">
								<TestTube class="w-5 h-5 text-yellow-600" />
							</div>
							<div>
								<h3 class="font-semibold text-gray-900">Export to Git</h3>
								{#if testEnv}
									<p class="text-xs text-gray-500">{testEnv.elastic_space}</p>
								{/if}
							</div>
						</div>

						{#if testEnv}
							<div class="space-y-3">
								<div class="flex items-center justify-between text-sm">
									<span class="text-gray-600">Rules:</span>
									<span class="font-semibold text-gray-900">{testRuleCount}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gray-600">Branch:</span>
									<span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{testEnv.git_branch}</span>
								</div>

								<button
									on:click={openRuleSelection}
									disabled={syncingTest}
									class="btn w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 hover:shadow-md transition-all disabled:opacity-50 text-sm font-medium"
								>
									{#if syncingTest}
										<Loader class="w-4 h-4 animate-spin" />
										Syncing...
									{:else}
										<Upload class="w-4 h-4" />
										Export to Git
									{/if}
								</button>
							</div>
						{:else}
							<p class="text-sm text-yellow-700">No environment configured</p>
						{/if}
					</div>
				</div>

				<!-- Workflow Explanation -->
				<div class="mt-6 pt-4 border-t border-gray-200">
					<h4 class="text-sm font-medium text-gray-700 mb-2">How it works:</h4>
					<ol class="text-sm text-gray-600 space-y-1">
						<li class="flex items-start gap-2">
							<span class="flex-shrink-0 w-5 h-5 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-medium">1</span>
							<span>Export rules from <strong>{testEnv?.elastic_space || 'Elastic'}</strong> to <code class="text-xs bg-gray-100 px-1 rounded">{testEnv?.git_branch || 'main'}</code> branch in Git</span>
						</li>
					</ol>
					<p class="text-xs text-gray-500 mt-2">This project is configured for one-way export only (Elastic to Git).</p>
				</div>
			{:else}
				<!-- Full Workflow -->
				<div class="flex items-stretch gap-4">
					<!-- Step 1: Test Environment -->
					<div class="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<div class="flex items-center gap-2 mb-3">
							<div class="p-2 bg-yellow-100 rounded-lg">
								<TestTube class="w-5 h-5 text-yellow-600" />
							</div>
							<div>
								<h3 class="font-semibold text-gray-900">Test Environment</h3>
								{#if testEnv}
									<p class="text-xs text-gray-500">{testEnv.elastic_space}</p>
								{/if}
							</div>
						</div>

						{#if testEnv}
							<div class="space-y-3">
								<div class="flex items-center justify-between text-sm">
									<span class="text-gray-600">Rules:</span>
									<span class="font-semibold text-gray-900">{testRuleCount}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gray-600">Branch:</span>
									<span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{testEnv.git_branch}</span>
								</div>

								<button
									on:click={openRuleSelection}
									disabled={syncingTest}
									class="btn w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 hover:shadow-md transition-all disabled:opacity-50 text-sm font-medium"
								>
									{#if syncingTest}
										<Loader class="w-4 h-4 animate-spin" />
										Syncing...
									{:else}
										<Upload class="w-4 h-4" />
										Export to Git
									{/if}
								</button>
							</div>
						{:else}
							<p class="text-sm text-yellow-700">No test environment configured</p>
						{/if}
					</div>

					<!-- Arrow 1 -->
					<div class="flex items-center">
						<ChevronRight class="w-8 h-8 text-gray-300" />
					</div>

					<!-- Step 2: Create MR -->
					<div class="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div class="flex items-center gap-2 mb-3">
							<div class="p-2 bg-blue-100 rounded-lg">
								<GitMerge class="w-5 h-5 text-blue-600" />
							</div>
							<div>
								<h3 class="font-semibold text-gray-900">Merge Request</h3>
								<p class="text-xs text-gray-500">Review & Approve</p>
							</div>
						</div>

						{#if testEnv && prodEnv}
							<div class="space-y-3">
								<div class="text-sm text-gray-600">
									<div class="flex items-center gap-2 mb-1">
										<GitBranch class="w-4 h-4" />
										<span class="font-mono text-xs">{testEnv.git_branch}</span>
									</div>
									<div class="flex items-center justify-center">
										<ArrowDown class="w-4 h-4 text-gray-400" />
									</div>
									<div class="flex items-center gap-2 mt-1">
										<GitBranch class="w-4 h-4" />
										<span class="font-mono text-xs">{prodEnv.git_branch}</span>
									</div>
								</div>

								<button
									on:click={createMergeRequest}
									disabled={creatingMR}
									class="btn w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md transition-all disabled:opacity-50 text-sm font-medium"
								>
									{#if creatingMR}
										<Loader class="w-4 h-4 animate-spin" />
										Creating...
									{:else}
										<GitMerge class="w-4 h-4" />
										Create MR
									{/if}
								</button>

								{#if project.expand?.git_repository}
									<a
										href="{stripGitSuffix(project.expand.git_repository.url)}/-/merge_requests"
										target="_blank"
										class="block text-center text-xs text-blue-600 hover:underline"
									>
										View open MRs <ExternalLink class="w-3 h-3 inline" />
									</a>
								{/if}
							</div>
						{:else}
							<p class="text-sm text-blue-700">Configure both environments</p>
						{/if}
					</div>

					<!-- Arrow 2 -->
					<div class="flex items-center">
						<ChevronRight class="w-8 h-8 text-gray-300" />
					</div>

					<!-- Step 3: Production Environment -->
					<div class="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
						<div class="flex items-center gap-2 mb-3">
							<div class="p-2 bg-green-100 rounded-lg">
								<Rocket class="w-5 h-5 text-green-600" />
							</div>
							<div>
								<h3 class="font-semibold text-gray-900">Production</h3>
								{#if prodEnv}
									<p class="text-xs text-gray-500">{prodEnv.elastic_space}</p>
								{/if}
							</div>
						</div>

						{#if prodEnv}
							<div class="space-y-3">
								<div class="flex items-center justify-between text-sm">
									<span class="text-gray-600">Rules:</span>
									<span class="font-semibold text-gray-900">{prodRuleCount}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-gray-600">Branch:</span>
									<span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{prodEnv.git_branch}</span>
								</div>

								<button
									on:click={syncGitToProd}
									disabled={syncingProd}
									class="btn w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-md transition-all disabled:opacity-50 text-sm font-medium"
								>
									{#if syncingProd}
										<Loader class="w-4 h-4 animate-spin" />
										Syncing...
									{:else}
										<Download class="w-4 h-4" />
										Import from Git
									{/if}
								</button>
							</div>
						{:else}
							<p class="text-sm text-green-700">No prod environment configured</p>
						{/if}
					</div>
				</div>

				<!-- Workflow Explanation -->
				<div class="mt-6 pt-4 border-t border-gray-200">
					<h4 class="text-sm font-medium text-gray-700 mb-2">How it works:</h4>
					<ol class="text-sm text-gray-600 space-y-1">
						<li class="flex items-start gap-2">
							<span class="flex-shrink-0 w-5 h-5 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-medium">1</span>
							<span>Export rules from <strong>{testEnv?.elastic_space || 'Test'}</strong> to <code class="text-xs bg-gray-100 px-1 rounded">{testEnv?.git_branch || 'develop'}</code> branch</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">2</span>
							<span>Create MR from <code class="text-xs bg-gray-100 px-1 rounded">{testEnv?.git_branch || 'develop'}</code> to <code class="text-xs bg-gray-100 px-1 rounded">{prodEnv?.git_branch || 'main'}</code>, review and merge</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-medium">3</span>
							<span>Import rules from <code class="text-xs bg-gray-100 px-1 rounded">{prodEnv?.git_branch || 'main'}</code> branch to <strong>{prodEnv?.elastic_space || 'Production'}</strong></span>
						</li>
					</ol>
				</div>
			{/if}
		</div>

		<!-- Quick Links & Info -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Recent Sync Jobs -->
			<div class="lg:col-span-2 card p-6 animate-fade-in" style="animation-delay: 200ms; opacity: 0;">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900">Recent Syncs</h3>
					<button
						on:click={loadSyncJobs}
						class="text-gray-500 hover:text-gray-700"
					>
						<RefreshCw class="w-4 h-4" />
					</button>
				</div>

				{#if syncJobs.length === 0}
					<p class="text-sm text-gray-500">No sync jobs yet. Start by exporting from Test.</p>
				{:else}
					<div class="space-y-2">
						{#each syncJobs.slice(0, 5) as job}
							<div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
								<div class="flex items-center gap-3">
									{#if job.status === 'completed'}
										<CheckCircle class="w-4 h-4 text-green-600" />
									{:else if job.status === 'failed'}
										<XCircle class="w-4 h-4 text-red-600" />
									{:else if job.status === 'running'}
										<Loader class="w-4 h-4 text-blue-600 animate-spin" />
									{:else}
										<Clock class="w-4 h-4 text-yellow-600" />
									{/if}
									<div>
										<span class="text-sm font-medium text-gray-900">
											{#if job.direction === 'elastic_to_git'}
												Export to Git
											{:else if job.direction === 'git_to_elastic'}
												Import from Git
											{:else}
												Bidirectional
											{/if}
										</span>
										{#if job.changes_summary}
											{@const summary = typeof job.changes_summary === 'string' ? JSON.parse(job.changes_summary) : job.changes_summary}
											<span class="text-xs text-gray-500 ml-2">
												{summary.exported || 0} exported
												{#if summary.deleted}, {summary.deleted} deleted{/if}
												{#if summary.imported}, {summary.imported} imported{/if}
											</span>
										{/if}
									</div>
								</div>
								<div class="text-right">
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getStatusBg(job.status)} {getStatusColor(job.status)}">
										{job.status}
									</span>
									<p class="text-xs text-gray-500 mt-1">{formatRelativeTime(job.created)}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Quick Links -->
			<div class="card p-6 animate-fade-in" style="animation-delay: 250ms; opacity: 0;">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
				<div class="space-y-3">
					{#if project.expand?.elastic_instance}
						{@const kibanaUrl = project.expand.elastic_instance.url}
						<a
							href="{kibanaUrl}/app/security/rules"
							target="_blank"
							class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
						>
							<div class="p-2 bg-orange-100 rounded">
								<FileCode class="w-4 h-4 text-orange-600" />
							</div>
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium text-gray-900">Kibana Rules</div>
								<div class="text-xs text-gray-500 truncate">{project.expand.elastic_instance.name}</div>
							</div>
							<ExternalLink class="w-4 h-4 text-gray-400" />
						</a>
					{/if}

					{#if project.expand?.git_repository}
						{@const gitUrl = stripGitSuffix(project.expand.git_repository.url)}
						<a
							href="{gitUrl}"
							target="_blank"
							class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
						>
							<div class="p-2 bg-purple-100 rounded">
								<GitBranch class="w-4 h-4 text-purple-600" />
							</div>
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium text-gray-900">Git Repository</div>
								<div class="text-xs text-gray-500 truncate">{project.expand.git_repository.name}</div>
							</div>
							<ExternalLink class="w-4 h-4 text-gray-400" />
						</a>

						<a
							href="{gitUrl}/-/merge_requests"
							target="_blank"
							class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
						>
							<div class="p-2 bg-blue-100 rounded">
								<GitMerge class="w-4 h-4 text-blue-600" />
							</div>
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium text-gray-900">Merge Requests</div>
								<div class="text-xs text-gray-500">View open MRs</div>
							</div>
							<ExternalLink class="w-4 h-4 text-gray-400" />
						</a>
					{/if}
				</div>

				<!-- Connection Info -->
				<div class="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
					<div><strong>Path:</strong> {project.git_path || '/'}</div>
					<div><strong>Created:</strong> {new Date(project.created).toLocaleDateString()}</div>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if testEnv}
	<RuleSelectionModal
		open={showRuleSelection}
		projectId={projectId}
		space={testEnv.elastic_space}
		branch={testEnv.git_branch}
		onexport={handleExport}
		onclose={() => showRuleSelection = false}
	/>
{/if}
