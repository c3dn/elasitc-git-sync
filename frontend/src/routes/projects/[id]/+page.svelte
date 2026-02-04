<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { pb, apiFetch } from '$lib/pocketbase';
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
		ChevronRight,
		Database,
		FolderGit2,
		FolderCode
	} from 'lucide-svelte';
	import type { ProjectExpanded, SyncJob, PendingChange } from '$types';
	import RuleSelectionModal from '$lib/components/RuleSelectionModal.svelte';
	import { AlertTriangle, Eye, ShieldOff, Shield, ToggleLeft, ToggleRight, Tag, Search as SearchIcon, Edit3, Plus, Minus } from 'lucide-svelte';

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

	// Pending changes
	let pendingChanges = $state<PendingChange[]>([]);
	let pendingTotal = $state(0);

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
				loadMetrics(),
				loadPendingChanges()
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
			const result = await pb.collection('sync_jobs').getList(1, 10, {
				filter: `project = "${projectId}"`,
				sort: '-created'
			});
			syncJobs = result.items;
		} catch (err: any) {
			console.error('Failed to load sync jobs:', err);
		}
	}

	async function loadMetrics() {
		try {
			const response = await apiFetch(`${pb.baseUrl}/api/project/${projectId}/metrics`);
			if (response.ok) {
				const data = await response.json();
				testRuleCount = data.test_rules || 0;
				prodRuleCount = data.prod_rules || 0;
			}
		} catch (err) {
			console.error('Failed to load metrics:', err);
		}
	}

	async function loadPendingChanges() {
		try {
			const response = await apiFetch(`${pb.baseUrl}/api/review/pending?project_id=${projectId}&status=pending`);
			if (response.ok) {
				const data = await response.json();
				pendingChanges = data.changes || [];
				pendingTotal = data.total || pendingChanges.length;
			}
		} catch (err) {
			console.error('Failed to load pending changes:', err);
		}
	}

	function getPendingBreakdown(): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const c of pendingChanges) {
			const type = c.change_type || 'modified_rule';
			counts[type] = (counts[type] || 0) + 1;
		}
		return counts;
	}

	function formatChangeType(type: string): string {
		const labels: Record<string, string> = {
			new_rule: 'New',
			modified_rule: 'Modified',
			deleted_rule: 'Deleted',
			rule_enabled: 'Enabled',
			rule_disabled: 'Disabled',
			exception_added: 'Exception added',
			exception_removed: 'Exception removed',
			exception_modified: 'Exception modified',
			severity_changed: 'Severity changed',
			tags_changed: 'Tags changed',
			query_changed: 'Query changed'
		};
		return labels[type] || type.replace(/_/g, ' ');
	}

	function getChangeTypeColor(type: string): string {
		switch (type) {
			case 'new_rule': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
			case 'deleted_rule': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
			case 'rule_enabled': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
			case 'rule_disabled': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
			default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
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

			const response = await apiFetch(`${pb.baseUrl}/api/sync/trigger`, {
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

			const response = await apiFetch(`${pb.baseUrl}/api/merge-request/create`, {
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

			const response = await apiFetch(`${pb.baseUrl}/api/sync/trigger`, {
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
			default: return 'text-gray-600 dark:text-gray-400';
		}
	}

	function getStatusBg(status: string): string {
		switch (status) {
			case 'completed': return 'bg-green-100';
			case 'failed': return 'bg-red-100';
			case 'running': return 'bg-blue-100';
			default: return 'bg-gray-100 dark:bg-gray-800';
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
			<a href="/projects" class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2 transition-colors duration-200">
				<ArrowLeft class="w-4 h-4 transition-transform duration-200 hover:-translate-x-1" />
				Back to Projects
			</a>
			{#if loading}
				<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Loading...</h1>
			{:else if project}
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {isExportOnly ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-primary-100 text-primary-700'}">
						{isExportOnly ? 'Export Only' : 'Full Workflow'}
					</span>
				</div>
				{#if project.description}
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{project.description}</p>
				{/if}
			{/if}
		</div>
		{#if project}
			<div class="flex items-center gap-2">
				<a
					href="/projects/{projectId}/edit"
					class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
				>
					<Pencil class="w-4 h-4" />
					Edit
				</a>
				<button
					on:click={deleteProject}
					class="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
				>
					<Trash2 class="w-4 h-4" />
				</button>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="alert bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
			<p class="text-sm text-red-800 dark:text-red-200">{error}</p>
		</div>
	{/if}

	{#if successMessage}
		<div class="alert bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
			<p class="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if project}
		<!-- Project Info Strip -->
		<div class="card animate-fade-in" style="animation-delay: 50ms; opacity: 0;">
			<div class="flex items-center gap-4 px-6 py-3 flex-wrap">
				{#if project.expand?.elastic_instance}
					{@const kibanaUrl = project.expand.elastic_instance.url}
					<a
						href="{kibanaUrl}/app/security/rules"
						target="_blank"
						class="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
					>
						<Database class="w-3.5 h-3.5" />
						<span class="font-medium">{project.expand.elastic_instance.name}</span>
						<ExternalLink class="w-3 h-3 opacity-50" />
					</a>
				{/if}

				{#if project.expand?.git_repository}
					{@const gitUrl = stripGitSuffix(project.expand.git_repository.url)}
					<a
						href="{gitUrl}"
						target="_blank"
						class="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg text-sm hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
					>
						<FolderGit2 class="w-3.5 h-3.5" />
						<span class="font-medium">{project.expand.git_repository.name}</span>
						<ExternalLink class="w-3 h-3 opacity-50" />
					</a>

					<a
						href="{gitUrl}/-/merge_requests"
						target="_blank"
						class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
					>
						<GitMerge class="w-3.5 h-3.5" />
						<span class="font-medium">Merge Requests</span>
						<ExternalLink class="w-3 h-3 opacity-50" />
					</a>
				{/if}

				<div class="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700"></div>

				<div class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<FolderCode class="w-3.5 h-3.5" />
					<span class="font-mono">{project.git_path || '/'}</span>
				</div>

				{#if syncJobs.length > 0}
					<div class="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700"></div>
					<div class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
						<Clock class="w-3.5 h-3.5" />
						Last sync {formatRelativeTime(syncJobs[0].created)}
					</div>
				{/if}
			</div>
		</div>

		<!-- Workflow Section -->
		<div class="card p-6 animate-fade-in" style="animation-delay: 100ms; opacity: 0;">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Sync Workflow</h2>

			{#if isExportOnly}
				<!-- Export Only Workflow -->
				<div class="max-w-md">
					<div class="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5">
						<div class="flex items-center gap-3 mb-4">
							<div class="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
								<Upload class="w-5 h-5 text-emerald-600" />
							</div>
							<div>
								<h3 class="font-semibold text-gray-900 dark:text-gray-100">Export to Git</h3>
								{#if testEnv}
									<p class="text-xs text-gray-500 dark:text-gray-400">{testEnv.elastic_space} → {testEnv.git_branch}</p>
								{/if}
							</div>
						</div>

						{#if testEnv}
							<div class="space-y-4">
								<div class="flex items-center gap-4 text-sm">
									<div class="flex items-center gap-2">
										<span class="text-gray-500 dark:text-gray-400">Rules:</span>
										<span class="font-semibold text-gray-900 dark:text-gray-100">{testRuleCount}</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-gray-500 dark:text-gray-400">Branch:</span>
										<span class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{testEnv.git_branch}</span>
									</div>
								</div>

								<button
									on:click={openRuleSelection}
									disabled={syncingTest}
									class="btn w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 hover:shadow-md transition-all disabled:opacity-50 text-sm font-medium"
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
							<p class="text-sm text-emerald-700 dark:text-emerald-400">No environment configured</p>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Full Workflow - Pipeline Steps -->
				<div class="flex items-start gap-3">
					<!-- Step 1: Test Environment -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-3">
							<span class="flex-shrink-0 w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
							<div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
						</div>
						<div class="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/50 rounded-xl p-4">
							<div class="flex items-center gap-2 mb-3">
								<div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
									<TestTube class="w-4 h-4 text-yellow-600" />
								</div>
								<div class="min-w-0">
									<h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">Export to Git</h3>
									{#if testEnv}
										<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{testEnv.elastic_space}</p>
									{/if}
								</div>
							</div>

							{#if testEnv}
								<div class="space-y-3">
									<div class="flex items-center justify-between text-sm">
										<span class="text-gray-500 dark:text-gray-400">Rules</span>
										<span class="font-semibold text-gray-900 dark:text-gray-100">{testRuleCount}</span>
									</div>
									<div class="flex items-center justify-between text-sm">
										<span class="text-gray-500 dark:text-gray-400">Branch</span>
										<span class="font-mono text-xs bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-800/50 px-2 py-0.5 rounded">{testEnv.git_branch}</span>
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
											Export
										{/if}
									</button>
								</div>
							{:else}
								<p class="text-sm text-yellow-700 dark:text-yellow-400">Not configured</p>
							{/if}
						</div>
					</div>

					<!-- Arrow 1 -->
					<div class="flex items-center pt-10 flex-shrink-0">
						<ChevronRight class="w-6 h-6 text-gray-300 dark:text-gray-600" />
					</div>

					<!-- Step 2: Create MR -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-3">
							<span class="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
							<div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
						</div>
						<div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
							<div class="flex items-center gap-2 mb-3">
								<div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
									<GitMerge class="w-4 h-4 text-blue-600" />
								</div>
								<div class="min-w-0">
									<h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">Merge Request</h3>
									<p class="text-xs text-gray-500 dark:text-gray-400">Review & Approve</p>
								</div>
							</div>

							{#if testEnv && prodEnv}
								<div class="space-y-3">
									<div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
										<GitBranch class="w-3.5 h-3.5 flex-shrink-0" />
										<span class="font-mono text-xs truncate">{testEnv.git_branch}</span>
										<ArrowRight class="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
										<span class="font-mono text-xs truncate">{prodEnv.git_branch}</span>
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
											class="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
										>
											View open MRs <ExternalLink class="w-3 h-3 inline" />
										</a>
									{/if}
								</div>
							{:else}
								<p class="text-sm text-blue-700 dark:text-blue-400">Configure both environments</p>
							{/if}
						</div>
					</div>

					<!-- Arrow 2 -->
					<div class="flex items-center pt-10 flex-shrink-0">
						<ChevronRight class="w-6 h-6 text-gray-300 dark:text-gray-600" />
					</div>

					<!-- Step 3: Production Environment -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-3">
							<span class="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
							<div class="flex-1 h-px bg-transparent"></div>
						</div>
						<div class="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-xl p-4">
							<div class="flex items-center gap-2 mb-3">
								<div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
									<Rocket class="w-4 h-4 text-green-600" />
								</div>
								<div class="min-w-0">
									<h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">Production</h3>
									{#if prodEnv}
										<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{prodEnv.elastic_space}</p>
									{/if}
								</div>
							</div>

							{#if prodEnv}
								<div class="space-y-3">
									<div class="flex items-center justify-between text-sm">
										<span class="text-gray-500 dark:text-gray-400">Rules</span>
										<span class="font-semibold text-gray-900 dark:text-gray-100">{prodRuleCount}</span>
									</div>
									<div class="flex items-center justify-between text-sm">
										<span class="text-gray-500 dark:text-gray-400">Branch</span>
										<span class="font-mono text-xs bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800/50 px-2 py-0.5 rounded">{prodEnv.git_branch}</span>
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
											Import
										{/if}
									</button>
								</div>
							{:else}
								<p class="text-sm text-green-700 dark:text-green-400">Not configured</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Pending Review -->
		{#if pendingTotal > 0}
			{@const breakdown = getPendingBreakdown()}
			<div class="card animate-fade-in border-l-4 border-l-amber-400" style="animation-delay: 150ms; opacity: 0;">
				<div class="flex items-center justify-between px-6 py-4">
					<div class="flex items-center gap-3">
						<div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
							<AlertTriangle class="w-5 h-5 text-amber-600" />
						</div>
						<div>
							<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
								{pendingTotal} {pendingTotal === 1 ? 'Change' : 'Changes'} Pending Review
							</h2>
							<div class="flex items-center gap-2 mt-1 flex-wrap">
								{#each Object.entries(breakdown) as [type, count]}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium {getChangeTypeColor(type)}">
										{count} {formatChangeType(type)}
									</span>
								{/each}
							</div>
						</div>
					</div>
					<a
						href="/review?project_id={projectId}"
						class="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 hover:shadow-md transition-all text-sm font-medium"
					>
						<Eye class="w-4 h-4" />
						Review Changes
					</a>
				</div>

				<!-- Preview of pending rules -->
				{#if pendingChanges.length > 0}
					<div class="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
						{#each pendingChanges.slice(0, 5) as change}
							<div class="flex items-center justify-between px-6 py-2.5">
								<div class="flex items-center gap-2 min-w-0">
									<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium {getChangeTypeColor(change.change_type)}">
										{formatChangeType(change.change_type)}
									</span>
									<span class="text-sm text-gray-900 dark:text-gray-100 truncate">{change.rule_name}</span>
								</div>
								<span class="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">{change.rule_id.substring(0, 8)}</span>
							</div>
						{/each}
						{#if pendingTotal > 5}
							<div class="px-6 py-2.5 text-center">
								<a href="/review?project_id={projectId}" class="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400">
									View all {pendingTotal} pending changes →
								</a>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Recent Syncs - Full Width -->
		<div class="card animate-fade-in" style="animation-delay: 200ms; opacity: 0;">
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Syncs</h2>
				<button
					on:click={loadSyncJobs}
					class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
				>
					<RefreshCw class="w-4 h-4" />
				</button>
			</div>

			{#if syncJobs.length === 0}
				<div class="px-6 py-10 text-center">
					<RefreshCw class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
					<p class="text-sm text-gray-500 dark:text-gray-400">No sync jobs yet.</p>
					<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Start by exporting rules from your environment.</p>
				</div>
			{:else}
				<div class="divide-y divide-gray-100 dark:divide-gray-800">
					{#each syncJobs.slice(0, 8) as job}
						<div class="flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
							<div class="flex items-center gap-3 min-w-0">
								<div class="p-1.5 rounded-lg {getStatusBg(job.status)}">
									{#if job.status === 'completed'}
										<CheckCircle class="w-4 h-4 text-green-600" />
									{:else if job.status === 'failed'}
										<XCircle class="w-4 h-4 text-red-600" />
									{:else if job.status === 'running'}
										<Loader class="w-4 h-4 text-blue-600 animate-spin" />
									{:else}
										<Clock class="w-4 h-4 text-yellow-600" />
									{/if}
								</div>
								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium text-gray-900 dark:text-gray-100">
											{#if job.direction === 'elastic_to_git'}
												Export to Git
											{:else if job.direction === 'git_to_elastic'}
												Import from Git
											{:else}
												Bidirectional
											{/if}
										</span>
										<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getStatusBg(job.status)} {getStatusColor(job.status)}">
											{job.status}
										</span>
									</div>
									{#if job.changes_summary}
										{@const summary = typeof job.changes_summary === 'string' ? JSON.parse(job.changes_summary) : job.changes_summary}
										<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
											{#if summary.changes_detected}
												{summary.changes_detected} {summary.changes_detected === 1 ? 'change' : 'changes'} detected
											{/if}
											{#if summary.pending_created}
												{#if summary.changes_detected}, {/if}{summary.pending_created} pending review
											{/if}
											{#if summary.exported}
												{#if summary.changes_detected || summary.pending_created}, {/if}{summary.exported} exported
											{/if}
											{#if summary.imported}
												{#if summary.changes_detected || summary.pending_created || summary.exported}, {/if}{summary.imported} imported
											{/if}
											{#if summary.deleted}
												, {summary.deleted} deleted
											{/if}
											{#if summary.errors}
												, {summary.errors} {summary.errors === 1 ? 'error' : 'errors'}
											{/if}
											{#if !summary.changes_detected && !summary.pending_created && !summary.exported && !summary.imported && !summary.deleted}
												No changes
											{/if}
										</p>
									{/if}
								</div>
							</div>
							<div class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">
								{formatRelativeTime(job.created)}
							</div>
						</div>
					{/each}
				</div>

				{#if syncJobs.length > 8}
					<div class="px-6 py-3 border-t border-gray-100 dark:border-gray-800">
						<a href="/history" class="text-xs font-medium text-primary-600 hover:text-primary-700">
							View all sync history →
						</a>
					</div>
				{/if}
			{/if}
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
