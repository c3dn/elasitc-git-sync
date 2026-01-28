<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { Activity, FolderGit2, AlertCircle, CheckCircle2, Clock, FileCode, TestTube, Rocket, Settings } from 'lucide-svelte';
	import type { DashboardStats, SyncJobExpanded } from '$types';
	import { formatDistanceToNow } from 'date-fns';

	interface ExtendedStats extends DashboardStats {
		total_rules?: number;
		total_test_rules?: number;
		total_prod_rules?: number;
	}

	let stats: ExtendedStats | null = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadDashboard();
	});

	async function loadDashboard() {
		try {
			loading = true;
			const response = await fetch(`${pb.baseUrl}/api/dashboard/stats`);
			if (!response.ok) throw new Error('Failed to load dashboard');
			stats = await response.json();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function getSyncStatusColor(status: string) {
		const colors: Record<string, string> = {
			completed: 'bg-green-100 text-green-800',
			running: 'bg-blue-100 text-blue-800',
			failed: 'bg-red-100 text-red-800',
			conflict: 'bg-yellow-100 text-yellow-800',
			pending: 'bg-gray-100 text-gray-800'
		};
		return colors[status] || colors.pending;
	}

	function getSyncStatusIcon(status: string) {
		const icons: Record<string, any> = {
			completed: CheckCircle2,
			running: Activity,
			failed: AlertCircle,
			conflict: AlertCircle,
			pending: Clock
		};
		return icons[status] || Clock;
	}
</script>

<svelte:head>
	<title>Dashboard - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="animate-fade-in">
		<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500">
			Overview of your Elastic Security rules synchronization
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{:else if stats}
		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 stats-grid">
			<div class="card p-6 animate-fade-in opacity-0">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Total Projects</p>
						<p class="mt-2 text-3xl font-semibold text-gray-900">{stats.total_projects}</p>
					</div>
					<div class="p-3 bg-purple-100 rounded-lg transition-transform duration-200 hover:scale-110">
						<FolderGit2 class="w-6 h-6 text-purple-600" />
					</div>
				</div>
			</div>

			<div class="card p-6 animate-fade-in opacity-0">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Total Rules</p>
						<p class="mt-2 text-3xl font-semibold text-gray-900">{stats.total_rules || 0}</p>
					</div>
					<div class="p-3 bg-blue-100 rounded-lg transition-transform duration-200 hover:scale-110">
						<FileCode class="w-6 h-6 text-blue-600" />
					</div>
				</div>
			</div>

			<div class="card p-6 animate-fade-in opacity-0">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Test Rules</p>
						<p class="mt-2 text-3xl font-semibold text-yellow-600">{stats.total_test_rules || 0}</p>
					</div>
					<div class="p-3 bg-yellow-100 rounded-lg transition-transform duration-200 hover:scale-110">
						<TestTube class="w-6 h-6 text-yellow-600" />
					</div>
				</div>
			</div>

			<div class="card p-6 animate-fade-in opacity-0">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Prod Rules</p>
						<p class="mt-2 text-3xl font-semibold text-green-600">{stats.total_prod_rules || 0}</p>
					</div>
					<div class="p-3 bg-green-100 rounded-lg transition-transform duration-200 hover:scale-110">
						<Rocket class="w-6 h-6 text-green-600" />
					</div>
				</div>
			</div>

			<div class="card p-6 animate-fade-in opacity-0">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Success Rate</p>
						<p class="mt-2 text-3xl font-semibold text-gray-900">{stats.sync_success_rate}%</p>
					</div>
					<div class="p-3 bg-green-100 rounded-lg transition-transform duration-200 hover:scale-110">
						<CheckCircle2 class="w-6 h-6 text-green-600" />
					</div>
				</div>
			</div>
		</div>

		<!-- Sync Activity Overview -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="card p-6 animate-fade-in" style="animation-delay: 250ms; opacity: 0;">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-semibold text-gray-900">Active Syncs</h3>
					<span class="text-2xl font-bold text-blue-600">{stats.active_syncs}</span>
				</div>
				<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
					<div class="h-full bg-blue-600 rounded-full progress-bar" style="width: {stats.active_syncs > 0 ? '100%' : '0%'}"></div>
				</div>
				<p class="text-xs text-gray-500 mt-2">Currently running sync jobs</p>
			</div>

			<div class="card p-6 animate-fade-in" style="animation-delay: 300ms; opacity: 0;">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-semibold text-gray-900">Pending Conflicts</h3>
					<span class="text-2xl font-bold {stats.pending_conflicts > 0 ? 'text-yellow-600' : 'text-gray-400'}">{stats.pending_conflicts}</span>
				</div>
				<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
					<div class="h-full bg-yellow-500 rounded-full progress-bar" style="width: {stats.pending_conflicts > 0 ? '100%' : '0%'}"></div>
				</div>
				<p class="text-xs text-gray-500 mt-2">Conflicts requiring attention</p>
			</div>

			<div class="card p-6 animate-fade-in" style="animation-delay: 350ms; opacity: 0;">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-semibold text-gray-900">Sync Success Rate</h3>
					<span class="text-2xl font-bold text-green-600">{stats.sync_success_rate}%</span>
				</div>
				<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
					<div class="h-full bg-green-500 rounded-full progress-bar" style="width: {stats.sync_success_rate}%"></div>
				</div>
				<p class="text-xs text-gray-500 mt-2">Based on last 100 sync jobs</p>
			</div>
		</div>

		<!-- Recent Syncs -->
		<div class="card animate-fade-in" style="animation-delay: 400ms; opacity: 0;">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Recent Syncs</h2>
			</div>
			{#if stats.recent_syncs.length === 0}
				<div class="px-6 py-8 text-center">
					<p class="text-sm text-gray-500">No sync jobs yet. Create a project to get started.</p>
				</div>
			{:else}
				<div class="p-4 space-y-3">
					{#each stats.recent_syncs as sync}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
							<div class="flex items-center gap-3">
								<div class="p-2 rounded-lg {sync.status === 'completed' ? 'bg-green-100' : sync.status === 'failed' ? 'bg-red-100' : sync.status === 'running' ? 'bg-blue-100' : 'bg-gray-100'}">
									<svelte:component
										this={getSyncStatusIcon(sync.status)}
										class="w-4 h-4 {sync.status === 'completed' ? 'text-green-600' : sync.status === 'failed' ? 'text-red-600' : sync.status === 'running' ? 'text-blue-600' : 'text-gray-600'}"
									/>
								</div>
								<div>
									<p class="text-sm font-medium text-gray-900">
										{sync.direction === 'elastic_to_git'
											? 'Elastic → Git'
											: sync.direction === 'git_to_elastic'
												? 'Git → Elastic'
												: 'Bidirectional Sync'}
									</p>
									<p class="text-xs text-gray-500">
										{#if sync.started_at}
											{formatDistanceToNow(new Date(sync.started_at), { addSuffix: true })}
										{/if}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3">
								{#if sync.changes_summary}
									<div class="hidden sm:flex items-center gap-2 text-xs">
										<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded">+{sync.changes_summary.added}</span>
										<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">~{sync.changes_summary.modified}</span>
										<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded">-{sync.changes_summary.deleted}</span>
									</div>
								{/if}
								<span
									class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium {getSyncStatusColor(sync.status)}"
								>
									{sync.status}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Quick Actions -->
		<div class="card p-6 animate-fade-in" style="animation-delay: 450ms; opacity: 0;">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<a
					href="/projects/new"
					class="card-interactive flex items-center gap-3 p-4"
				>
					<div class="p-2 bg-primary-100 rounded-lg transition-transform duration-200 group-hover:scale-110">
						<FolderGit2 class="w-5 h-5 text-primary-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900">Create Project</p>
						<p class="text-xs text-gray-500">Link Elastic space with Git repo</p>
					</div>
				</a>

				<a
					href="/settings/elastic"
					class="card-interactive flex items-center gap-3 p-4"
				>
					<div class="p-2 bg-primary-100 rounded-lg transition-transform duration-200 group-hover:scale-110">
						<Settings class="w-5 h-5 text-primary-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900">Add Elastic Instance</p>
						<p class="text-xs text-gray-500">Configure new Elastic cluster</p>
					</div>
				</a>

				<a
					href="/settings/git"
					class="card-interactive flex items-center gap-3 p-4"
				>
					<div class="p-2 bg-primary-100 rounded-lg transition-transform duration-200 group-hover:scale-110">
						<FolderGit2 class="w-5 h-5 text-primary-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900">Add Git Repository</p>
						<p class="text-xs text-gray-500">Connect to your Git repo</p>
					</div>
				</a>
			</div>
		</div>
	{/if}
</div>
