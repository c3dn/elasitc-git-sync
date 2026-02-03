<script lang="ts">
	import { onMount } from 'svelte';
	import { pb, apiFetch } from '$lib/pocketbase';
	import {
		Activity, FolderGit2, AlertCircle, CheckCircle2, Clock, Shield, ShieldCheck, ShieldOff,
		Rocket, ClipboardCheck, ArrowRight, RefreshCw, GitBranch, AlertTriangle,
		Plus, Minus, Pencil, ToggleLeft, ToggleRight, ListPlus, ListMinus, ListChecks
	} from 'lucide-svelte';
	import type { ExtendedDashboardStats, RecentChange } from '$types';
	import { formatDistanceToNow } from 'date-fns';

	let stats: ExtendedDashboardStats | null = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadDashboard();
	});

	async function loadDashboard() {
		try {
			loading = true;
			const response = await apiFetch(`${pb.baseUrl}/api/dashboard/stats`);
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
			pending: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
		};
		return colors[status] || colors.pending;
	}

	function getSyncStatusIcon(status: string) {
		const icons: Record<string, any> = {
			completed: CheckCircle2,
			running: Activity,
			failed: AlertCircle,
			conflict: AlertTriangle,
			pending: Clock
		};
		return icons[status] || Clock;
	}

	function getChangeTypeColor(type: string) {
		const colors: Record<string, string> = {
			new_rule: 'bg-green-100 text-green-700',
			modified_rule: 'bg-blue-100 text-blue-700',
			deleted_rule: 'bg-red-100 text-red-700',
			rule_enabled: 'bg-emerald-100 text-emerald-700',
			rule_disabled: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
			exception_added: 'bg-amber-100 text-amber-700',
			exception_removed: 'bg-orange-100 text-orange-700',
			exception_modified: 'bg-yellow-100 text-yellow-700',
			severity_changed: 'bg-purple-100 text-purple-700',
			tags_changed: 'bg-indigo-100 text-indigo-700',
			query_changed: 'bg-cyan-100 text-cyan-700'
		};
		return colors[type] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
	}

	function getChangeTypeIcon(type: string) {
		const icons: Record<string, any> = {
			new_rule: Plus,
			modified_rule: Pencil,
			deleted_rule: Minus,
			rule_enabled: ToggleRight,
			rule_disabled: ToggleLeft,
			exception_added: ListPlus,
			exception_removed: ListMinus,
			exception_modified: ListChecks,
			severity_changed: AlertTriangle,
			tags_changed: Pencil,
			query_changed: Pencil
		};
		return icons[type] || Pencil;
	}

	function getChangeTypeLabel(type: string) {
		const labels: Record<string, string> = {
			new_rule: 'New Rule',
			modified_rule: 'Modified',
			deleted_rule: 'Deleted',
			rule_enabled: 'Enabled',
			rule_disabled: 'Disabled',
			exception_added: 'Exception Added',
			exception_removed: 'Exception Removed',
			exception_modified: 'Exception Modified',
			severity_changed: 'Severity Changed',
			tags_changed: 'Tags Changed',
			query_changed: 'Query Changed'
		};
		return labels[type] || type;
	}

	function getChangeStatusColor(status: string) {
		const colors: Record<string, string> = {
			pending: 'bg-amber-100 text-amber-700',
			approved: 'bg-green-100 text-green-700',
			rejected: 'bg-red-100 text-red-700'
		};
		return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
	}
</script>

<svelte:head>
	<title>Dashboard - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="animate-fade-in">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Elastic Security detection rules sync overview
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
		<!-- Top Stats Row -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stats-grid">
			<!-- Pending Reviews - Primary CTA -->
			<a href="/review" class="card p-6 animate-fade-in opacity-0 hover:shadow-md transition-all {(stats.pending_reviews || 0) > 0 ? 'ring-2 ring-orange-300' : ''}">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Reviews</p>
						<p class="mt-2 text-3xl font-semibold {(stats.pending_reviews || 0) > 0 ? 'text-orange-600' : 'text-gray-900 dark:text-gray-100'}">{stats.pending_reviews || 0}</p>
						<p class="mt-1 text-xs {(stats.pending_reviews || 0) > 0 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}">
							{(stats.pending_reviews || 0) > 0 ? 'Changes need your review' : 'All clear'}
						</p>
					</div>
					<div class="p-3 {(stats.pending_reviews || 0) > 0 ? 'bg-orange-100' : 'bg-gray-100 dark:bg-gray-800'} rounded-lg transition-transform duration-200 hover:scale-110">
						<ClipboardCheck class="w-6 h-6 {(stats.pending_reviews || 0) > 0 ? 'text-orange-600' : 'text-gray-400 dark:text-gray-500'}" />
					</div>
				</div>
			</a>

			<!-- Rules in Elastic -->
			<div class="card p-6 animate-fade-in opacity-0">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Rules in Elastic</p>
						<p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.total_rules || 0}</p>
						<div class="mt-1 flex items-center gap-3 text-xs">
							<span class="flex items-center gap-1 text-green-600">
								<ShieldCheck class="w-3 h-3" />{stats.enabled_rules || 0} active
							</span>
							<span class="flex items-center gap-1 text-gray-400 dark:text-gray-500">
								<ShieldOff class="w-3 h-3" />{stats.disabled_rules || 0} disabled
							</span>
						</div>
					</div>
					<div class="p-3 bg-blue-100 rounded-lg transition-transform duration-200 hover:scale-110">
						<Shield class="w-6 h-6 text-blue-600" />
					</div>
				</div>
			</div>

			<!-- Tracked Rules -->
			<div class="card p-6 animate-fade-in opacity-0">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Tracked in Git</p>
						<p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.tracked_rules || 0}</p>
						<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
							{#if (stats.total_rules || 0) > 0}
								{Math.round(((stats.tracked_rules || 0) / (stats.total_rules || 1)) * 100)}% coverage
							{:else}
								Rule snapshots baseline
							{/if}
						</p>
					</div>
					<div class="p-3 bg-purple-100 rounded-lg transition-transform duration-200 hover:scale-110">
						<GitBranch class="w-6 h-6 text-purple-600" />
					</div>
				</div>
			</div>

			<!-- Sync Success Rate -->
			<div class="card p-6 animate-fade-in opacity-0">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Sync Success Rate</p>
						<p class="mt-2 text-3xl font-semibold {stats.sync_success_rate >= 90 ? 'text-green-600' : stats.sync_success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}">{stats.sync_success_rate}%</p>
						<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Last 100 sync jobs</p>
					</div>
					<div class="p-3 {stats.sync_success_rate >= 90 ? 'bg-green-100' : stats.sync_success_rate >= 70 ? 'bg-yellow-100' : 'bg-red-100'} rounded-lg transition-transform duration-200 hover:scale-110">
						<CheckCircle2 class="w-6 h-6 {stats.sync_success_rate >= 90 ? 'text-green-600' : stats.sync_success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}" />
					</div>
				</div>
			</div>
		</div>

		<!-- Last Sync Status Banner -->
		{#if stats.last_sync}
			<div class="card p-4 animate-fade-in" style="animation-delay: 200ms; opacity: 0;">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="p-2 rounded-lg {stats.last_sync.status === 'completed' ? 'bg-green-100' : 'bg-red-100'}">
							<svelte:component
								this={stats.last_sync.status === 'completed' ? CheckCircle2 : AlertCircle}
								class="w-5 h-5 {stats.last_sync.status === 'completed' ? 'text-green-600' : 'text-red-600'}"
							/>
						</div>
						<div>
							<div class="flex items-center gap-2">
								<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Last Sync</p>
								<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
									<Rocket class="w-3 h-3" />Elastic → Git
								</span>
							</div>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{#if stats.last_sync.project_name}
									{stats.last_sync.project_name} &middot;
								{/if}
								{#if stats.last_sync.completed_at}
									{formatDistanceToNow(new Date(stats.last_sync.completed_at), { addSuffix: true })}
								{/if}
								{#if stats.last_sync.status === 'failed' && stats.last_sync.error_message}
									&middot; <span class="text-red-500">{stats.last_sync.error_message}</span>
								{/if}
							</p>
						</div>
					</div>
					<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium {getSyncStatusColor(stats.last_sync.status)}">
						{stats.last_sync.status}
					</span>
				</div>
			</div>
		{/if}

		<!-- Two Column Layout: Recent Changes + Recent Syncs -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Recent Changes -->
			<div class="card animate-fade-in" style="animation-delay: 300ms; opacity: 0;">
				<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Changes</h2>
					{#if (stats.pending_reviews || 0) > 0}
						<a href="/review" class="text-xs font-medium text-primary-600 hover:text-primary-700">
							Review all →
						</a>
					{/if}
				</div>
				{#if !stats.recent_changes || stats.recent_changes.length === 0}
					<div class="px-6 py-8 text-center">
						<Shield class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
						<p class="text-sm text-gray-500 dark:text-gray-400">No changes detected yet.</p>
						<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Changes appear here when rules are modified in Elastic.</p>
					</div>
				{:else}
					<div class="divide-y divide-gray-100 dark:divide-gray-800">
						{#each stats.recent_changes as change}
							<div class="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="p-1.5 rounded {getChangeTypeColor(change.change_type)}">
										<svelte:component
											this={getChangeTypeIcon(change.change_type)}
											class="w-3.5 h-3.5"
										/>
									</div>
									<div class="min-w-0">
										<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{change.rule_name}</p>
										<p class="text-xs text-gray-500 dark:text-gray-400">
											{#if change.created}
												{formatDistanceToNow(new Date(change.created), { addSuffix: true })}
											{/if}
											{#if change.diff_summary}
												&middot; {change.diff_summary}
											{/if}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-2 flex-shrink-0 ml-3">
									<span class="px-2 py-0.5 rounded text-xs font-medium {getChangeTypeColor(change.change_type)}">
										{getChangeTypeLabel(change.change_type)}
									</span>
									<span class="px-2 py-0.5 rounded text-xs font-medium {getChangeStatusColor(change.status)}">
										{change.status}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Recent Syncs -->
			<div class="card animate-fade-in" style="animation-delay: 350ms; opacity: 0;">
				<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Sync History</h2>
					<a href="/history" class="text-xs font-medium text-primary-600 hover:text-primary-700">
						View all →
					</a>
				</div>
				{#if stats.recent_syncs.length === 0}
					<div class="px-6 py-8 text-center">
						<RefreshCw class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
						<p class="text-sm text-gray-500 dark:text-gray-400">No sync jobs yet.</p>
						<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Create a project to get started.</p>
					</div>
				{:else}
					<div class="divide-y divide-gray-100 dark:divide-gray-800">
						{#each stats.recent_syncs as sync}
							<div class="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
								<div class="flex items-center gap-3">
									<div class="p-1.5 rounded-lg {sync.status === 'completed' ? 'bg-green-100' : sync.status === 'failed' ? 'bg-red-100' : sync.status === 'running' ? 'bg-blue-100' : 'bg-gray-100 dark:bg-gray-800'}">
										<svelte:component
											this={getSyncStatusIcon(sync.status)}
											class="w-3.5 h-3.5 {sync.status === 'completed' ? 'text-green-600' : sync.status === 'failed' ? 'text-red-600' : sync.status === 'running' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}"
										/>
									</div>
									<div>
										<div class="flex items-center gap-2">
											<p class="text-sm font-medium text-gray-900 dark:text-gray-100">
												{sync.project_name || 'Sync'}
											</p>
											<span class="inline-flex items-center gap-1 text-xs text-indigo-600">
												<Rocket class="w-3 h-3" />
											</span>
										</div>
										<p class="text-xs text-gray-500 dark:text-gray-400">
											{#if sync.started_at}
												{formatDistanceToNow(new Date(sync.started_at), { addSuffix: true })}
											{/if}
											{#if sync.error_message}
												&middot; <span class="text-red-500 truncate">{sync.error_message}</span>
											{/if}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-2 flex-shrink-0">
									{#if sync.changes_summary}
										<div class="hidden sm:flex items-center gap-1.5 text-xs">
											{#if sync.changes_summary.added > 0}
												<span class="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">+{sync.changes_summary.added}</span>
											{/if}
											{#if sync.changes_summary.modified > 0}
												<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">~{sync.changes_summary.modified}</span>
											{/if}
											{#if sync.changes_summary.deleted > 0}
												<span class="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">-{sync.changes_summary.deleted}</span>
											{/if}
										</div>
									{/if}
									<span
										class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getSyncStatusColor(sync.status)}"
									>
										{sync.status}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="card p-6 animate-fade-in" style="animation-delay: 400ms; opacity: 0;">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<a
					href="/review"
					class="card-interactive flex items-center gap-3 p-4"
				>
					<div class="p-2 bg-orange-100 rounded-lg">
						<ClipboardCheck class="w-5 h-5 text-orange-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Review Changes</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">Approve or reject rule changes</p>
					</div>
				</a>

				<a
					href="/projects/new"
					class="card-interactive flex items-center gap-3 p-4"
				>
					<div class="p-2 bg-primary-100 rounded-lg">
						<FolderGit2 class="w-5 h-5 text-primary-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Create Project</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">Link Elastic space with Git repo</p>
					</div>
				</a>

				<a
					href="/settings/elastic"
					class="card-interactive flex items-center gap-3 p-4"
				>
					<div class="p-2 bg-primary-100 rounded-lg">
						<Shield class="w-5 h-5 text-primary-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Elastic Instances</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">Manage Elastic connections</p>
					</div>
				</a>

				<a
					href="/settings/webhooks"
					class="card-interactive flex items-center gap-3 p-4"
				>
					<div class="p-2 bg-primary-100 rounded-lg">
						<ArrowRight class="w-5 h-5 text-primary-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Webhooks</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">Configure notifications</p>
					</div>
				</a>
			</div>
		</div>
	{/if}
</div>
