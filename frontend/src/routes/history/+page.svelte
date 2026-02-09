<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { Clock, CheckCircle2, XCircle, AlertCircle, Activity, Loader, RefreshCw } from 'lucide-svelte';
	import type { SyncJobExpanded } from '$types';
	import { format } from 'date-fns';
	import {
		formatSyncSummary,
		getDirectionLabel,
		getUnifiedSyncBadgeClasses,
		getUnifiedSyncLabel,
		getUnifiedSyncUiState
	} from '$lib/utils/sync-ui';

	let syncJobs: SyncJobExpanded[] = [];
	let loading = true;
	let error = '';
	let livePolling = false;

	let historyCache: { ts: number; items: SyncJobExpanded[] } | null = null;
	const HISTORY_CACHE_TTL = 20_000;

	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let pollInFlight = false;

	let tableScroller: HTMLDivElement | null = null;
	let scrollTop = 0;
	let viewportHeight = 560;
	const ROW_HEIGHT = 76;
	const OVERSCAN = 10;

	onMount(async () => {
		await loadHistory();
		document.addEventListener('visibilitychange', handleVisibilityChange);
		updatePolling();
	});

	onDestroy(() => {
		stopPolling();
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	});

	async function loadHistory(force = false) {
		try {
			loading = true;
			const now = Date.now();
			if (!force && historyCache && now - historyCache.ts < HISTORY_CACHE_TTL) {
				syncJobs = historyCache.items;
				updatePolling();
				return;
			}

			const result = await pb.collection('sync_jobs').getList(1, 50, {
				expand: 'project',
				sort: '-created'
			});
			syncJobs = result.items;
			historyCache = { ts: now, items: result.items };
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
			updatePolling();
		}
	}

	function hasRunningJobs(): boolean {
		return syncJobs.some((job) => job.status === 'running' || job.status === 'pending');
	}

	function startPolling() {
		if (pollTimer) return;
		livePolling = true;
		pollTimer = setInterval(() => {
			void refreshRunningJobs();
		}, 3000);
	}

	function stopPolling() {
		if (!pollTimer) return;
		clearInterval(pollTimer);
		pollTimer = null;
		livePolling = false;
	}

	function updatePolling() {
		if (hasRunningJobs()) startPolling();
		else stopPolling();
	}

	async function refreshRunningJobs() {
		if (document.hidden || pollInFlight || !hasRunningJobs()) return;
		pollInFlight = true;
		try {
			await loadHistory(true);
		} finally {
			pollInFlight = false;
		}
	}

	function handleVisibilityChange() {
		if (!document.hidden && hasRunningJobs()) {
			void refreshRunningJobs();
		}
	}

	function handleTableScroll() {
		if (!tableScroller) return;
		scrollTop = tableScroller.scrollTop;
		viewportHeight = tableScroller.clientHeight;
	}

	function getRowIconState(job: SyncJobExpanded): 'success' | 'failed' | 'running' | 'queued' | 'partial' | 'conflict' {
		const state = getUnifiedSyncUiState(job);
		if (state === 'success') return 'success';
		if (state === 'failed') return 'failed';
		if (state === 'in_progress') return 'running';
		if (state === 'partial') return 'partial';
		if (state === 'conflict') return 'conflict';
		return 'queued';
	}

	$: virtualized = syncJobs.length > 24;
	$: startRow = virtualized ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
	$: visibleRows = virtualized ? Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2 : syncJobs.length;
	$: endRow = virtualized ? Math.min(syncJobs.length, startRow + visibleRows) : syncJobs.length;
	$: visibleJobs = virtualized ? syncJobs.slice(startRow, endRow) : syncJobs;
	$: topSpacer = virtualized ? startRow * ROW_HEIGHT : 0;
	$: bottomSpacer = virtualized ? Math.max(0, (syncJobs.length - endRow) * ROW_HEIGHT) : 0;
</script>

<svelte:head>
	<title>History - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Sync History</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				View all synchronization jobs and their results
			</p>
		</div>
		<div class="flex items-center gap-2">
			{#if livePolling}
				<span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
					<Loader class="h-3 w-3 animate-spin" />
					Live
				</span>
			{/if}
			<button
				type="button"
				onclick={() => loadHistory(true)}
				class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
			>
				<RefreshCw class="h-3.5 w-3.5" />
				Refresh
			</button>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{:else if syncJobs.length === 0}
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
			<p class="text-gray-500 dark:text-gray-400">No sync jobs yet. Start a sync to see history here.</p>
		</div>
	{:else}
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
			<div class="overflow-x-auto overflow-y-auto max-h-[70vh]" bind:this={tableScroller} onscroll={handleTableScroll}>
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Status
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Project
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Direction
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Changes
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Started
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Duration
							</th>
						</tr>
					</thead>
					<tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
						{#if topSpacer > 0}
							<tr aria-hidden="true"><td colspan="6" style={`height: ${topSpacer}px;`}></td></tr>
						{/if}
						{#each visibleJobs as job}
							{@const iconState = getRowIconState(job)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-2">
										{#if iconState === 'success'}
											<CheckCircle2 class="w-4 h-4 text-green-500" />
										{:else if iconState === 'failed'}
											<XCircle class="w-4 h-4 text-red-500" />
										{:else if iconState === 'running'}
											<Activity class="w-4 h-4 text-blue-500 animate-pulse" />
										{:else if iconState === 'partial' || iconState === 'conflict'}
											<AlertCircle class="w-4 h-4 text-amber-500" />
										{:else}
											<Clock class="w-4 h-4 text-gray-400 dark:text-gray-500" />
										{/if}
										<span
											class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getUnifiedSyncBadgeClasses(job)}"
										>
											{getUnifiedSyncLabel(job)}
										</span>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
										{job.expand?.project?.name || 'Unknown Project'}
									</div>
									<div class="text-xs text-gray-500 dark:text-gray-400">
										{job.type}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="text-sm text-gray-700 dark:text-gray-300">
										{getDirectionLabel(job.direction)}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-xs text-gray-600 dark:text-gray-300 max-w-[300px] truncate">
										{formatSyncSummary(job)}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if job.started_at}
										<div class="text-sm text-gray-900 dark:text-gray-100">
											{format(new Date(job.started_at), 'MMM d, yyyy')}
										</div>
										<div class="text-xs text-gray-500 dark:text-gray-400">
											{format(new Date(job.started_at), 'HH:mm:ss')}
										</div>
									{:else}
										<span class="text-xs text-gray-400 dark:text-gray-500">Not started</span>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if job.started_at && job.completed_at}
										{@const duration =
											new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()}
										<span class="text-sm text-gray-700 dark:text-gray-300">
											{Math.floor(duration / 1000)}s
										</span>
									{:else if job.started_at}
										<span class="text-sm text-blue-600 animate-pulse">In progress...</span>
									{:else}
										<span class="text-xs text-gray-400 dark:text-gray-500">-</span>
									{/if}
								</td>
							</tr>
						{/each}
						{#if bottomSpacer > 0}
							<tr aria-hidden="true"><td colspan="6" style={`height: ${bottomSpacer}px;`}></td></tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
