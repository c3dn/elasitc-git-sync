<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { pb, apiFetch } from '$lib/pocketbase';
	import {
		ScrollText,
		CheckCircle2,
		XCircle,
		GitMerge,
		Upload,
		Download,
		ChevronDown,
		ChevronRight,
		AlertCircle,
		User,
		Filter
	} from 'lucide-svelte';
	import { format } from 'date-fns';
	import type { AuditLog } from '$types';

	let logs: AuditLog[] = [];
	let loading = true;
	let error = '';

	// Pagination
	let page = 1;
	let perPage = 50;
	let total = 0;
	let totalPages = 0;

	// Filters
	let actionFilter = '';
	let userFilter = '';
	let userFilterDraft = '';
	let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	const FILTER_DEBOUNCE_MS = 350;

	// Cache
	const AUDIT_CACHE_TTL = 20_000;
	const auditCache = new Map<string, { ts: number; data: any }>();

	// Expanded rows
	let expandedRows: Set<string> = new Set();

	// Virtualized rendering
	let tableScroller: HTMLDivElement | null = null;
	let scrollTop = 0;
	let viewportHeight = 560;
	const ROW_HEIGHT = 64;
	const OVERSCAN = 10;

	const actionLabels: Record<string, string> = {
		sync_triggered: 'Sync Triggered',
		rule_approved: 'Rule Approved',
		rule_rejected: 'Rule Rejected',
		bulk_approved: 'Bulk Approved',
		bulk_rejected: 'Bulk Rejected',
		mr_created: 'MR Created',
		baseline_initialized: 'Baseline Init',
		change_detected: 'Change Detected'
	};

	const actionColors: Record<string, string> = {
		sync_triggered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		rule_approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		rule_rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		bulk_approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		bulk_rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		mr_created: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
		baseline_initialized: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
		change_detected: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
	};

	function getActionIcon(action: string) {
		const icons: Record<string, any> = {
			sync_triggered: Upload,
			rule_approved: CheckCircle2,
			rule_rejected: XCircle,
			bulk_approved: CheckCircle2,
			bulk_rejected: XCircle,
			mr_created: GitMerge,
			baseline_initialized: Download,
			change_detected: AlertCircle
		};
		return icons[action] || ScrollText;
	}

	onMount(async () => {
		await loadLogs();
	});

	onDestroy(() => {
		if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
	});

	async function loadLogs(force = false) {
		try {
			loading = true;
			error = '';

			let url = `${pb.baseUrl}/api/audit-logs?page=${page}&per_page=${perPage}`;
			if (actionFilter) url += `&action=${actionFilter}`;
			if (userFilter) url += `&user=${encodeURIComponent(userFilter)}`;

			const cacheKey = `${page}|${perPage}|${actionFilter}|${userFilter}`;
			const now = Date.now();
			let data: any = null;

			if (!force) {
				const cached = auditCache.get(cacheKey);
				if (cached && now - cached.ts < AUDIT_CACHE_TTL) {
					data = cached.data;
				}
			}

			if (!data) {
				const response = await apiFetch(url);
				data = await response.json();
				auditCache.set(cacheKey, { ts: now, data });
			}

			if (data.success) {
				logs = data.items || [];
				total = data.total || 0;
				totalPages = data.total_pages || 0;
				expandedRows = new Set();
			} else {
				error = data.message || 'Failed to load audit logs';
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
		page = 1;
		userFilter = userFilterDraft.trim();
		void loadLogs();
	}

	function clearFilters() {
		actionFilter = '';
		userFilterDraft = '';
		userFilter = '';
		page = 1;
		void loadLogs();
	}

	function goToPage(p: number) {
		page = p;
		void loadLogs();
	}

	function toggleRow(id: string) {
		if (expandedRows.has(id)) {
			expandedRows.delete(id);
		} else {
			expandedRows.add(id);
		}
		expandedRows = new Set(expandedRows);
	}

	function queueFilterApply() {
		if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
		filterDebounceTimer = setTimeout(() => {
			applyFilters();
		}, FILTER_DEBOUNCE_MS);
	}

	function handleTableScroll() {
		if (!tableScroller) return;
		scrollTop = tableScroller.scrollTop;
		viewportHeight = tableScroller.clientHeight;
	}

	function formatDetails(details: any): string {
		if (!details || Object.keys(details).length === 0) return '';
		try {
			return JSON.stringify(details, null, 2);
		} catch {
			return String(details);
		}
	}

	$: virtualized = logs.length > 20 && expandedRows.size === 0;
	$: startRow = virtualized ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
	$: visibleRows = virtualized ? Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2 : logs.length;
	$: endRow = virtualized ? Math.min(logs.length, startRow + visibleRows) : logs.length;
	$: visibleLogs = virtualized ? logs.slice(startRow, endRow) : logs;
	$: topSpacer = virtualized ? startRow * ROW_HEIGHT : 0;
	$: bottomSpacer = virtualized ? Math.max(0, (logs.length - endRow) * ROW_HEIGHT) : 0;
</script>

<svelte:head>
	<title>Audit Log - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="animate-fade-in">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Track who did what and when across your projects
		</p>
	</div>

	<!-- Filters -->
	<div class="card p-4 animate-fade-in" style="animation-delay: 50ms; opacity: 0;">
		<div class="flex items-center gap-4 flex-wrap">
			<div class="flex items-center gap-2">
				<Filter class="w-4 h-4 text-gray-400" />
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
			</div>

			<label for="action-filter" class="sr-only">Filter by action</label>
			<select
				id="action-filter"
				bind:value={actionFilter}
				onchange={applyFilters}
				class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
			>
				<option value="">All Actions</option>
				<option value="sync_triggered">Sync Triggered</option>
				<option value="rule_approved">Rule Approved</option>
				<option value="rule_rejected">Rule Rejected</option>
				<option value="bulk_approved">Bulk Approved</option>
				<option value="bulk_rejected">Bulk Rejected</option>
				<option value="mr_created">MR Created</option>
				<option value="baseline_initialized">Baseline Init</option>
				<option value="change_detected">Change Detected</option>
			</select>

			<label for="user-filter" class="sr-only">Filter by user</label>
			<input
				id="user-filter"
				type="text"
				bind:value={userFilterDraft}
				oninput={queueFilterApply}
				onkeydown={(e) => e.key === 'Enter' && applyFilters()}
				placeholder="Filter by user..."
				class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
			/>

			<button
				onclick={applyFilters}
				class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
			>
				Apply
			</button>

			{#if actionFilter || userFilterDraft}
				<button
					onclick={clearFilters}
					class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
				>
					Clear
				</button>
			{/if}

			<div class="ml-auto text-xs text-gray-500 dark:text-gray-400">
				{total} {total === 1 ? 'entry' : 'entries'}
			</div>
		</div>
	</div>

	<!-- Table -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
			<p class="text-sm text-red-800 dark:text-red-200">{error}</p>
		</div>
	{:else if logs.length === 0}
		<div class="card p-12 text-center animate-fade-in" style="animation-delay: 100ms; opacity: 0;">
			<ScrollText class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
			<p class="text-gray-500 dark:text-gray-400 font-medium">No audit log entries yet</p>
			<p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
				Actions like syncs, rule approvals, and rejections will appear here.
			</p>
		</div>
	{:else}
		<div class="card overflow-hidden animate-fade-in" style="animation-delay: 100ms; opacity: 0;">
			<div class="overflow-x-auto overflow-y-auto max-h-[72vh]" bind:this={tableScroller} onscroll={handleTableScroll}>
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
						<tr>
							<th class="w-8 px-4 py-3"></th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Time
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								User
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Action
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Resource
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Project
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Status
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
						{#if topSpacer > 0}
							<tr aria-hidden="true"><td colspan="7" style={`height: ${topSpacer}px;`}></td></tr>
						{/if}
						{#each visibleLogs as log}
							<tr
								class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
							>
								<td class="px-4 py-3">
									{#if log.details && Object.keys(log.details).length > 0}
										<button
											type="button"
											onclick={() => toggleRow(log.id)}
											aria-expanded={expandedRows.has(log.id)}
											aria-controls={"audit-details-" + log.id}
											class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
										>
											{#if expandedRows.has(log.id)}
												<ChevronDown class="w-4 h-4" />
											{:else}
												<ChevronRight class="w-4 h-4" />
											{/if}
										</button>
									{/if}
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<div class="text-sm text-gray-900 dark:text-gray-100">
										{format(new Date(log.created), 'MMM d, yyyy')}
									</div>
									<div class="text-xs text-gray-500 dark:text-gray-400">
										{format(new Date(log.created), 'HH:mm:ss')}
									</div>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<div class="flex items-center gap-2">
										<div class="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
											<User class="w-3 h-3 text-gray-500 dark:text-gray-400" />
										</div>
										<span class="text-sm font-medium text-gray-900 dark:text-gray-100">{log.user}</span>
									</div>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium {actionColors[log.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}">
										<svelte:component this={getActionIcon(log.action)} class="w-3 h-3" />
										{actionLabels[log.action] || log.action}
									</span>
								</td>
								<td class="px-4 py-3">
									<div class="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
										{log.resource_name || '-'}
									</div>
									<div class="text-xs text-gray-500 dark:text-gray-400">
										{log.resource_type}
									</div>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span class="text-sm text-gray-700 dark:text-gray-300">
										{log.project_name || '-'}
									</span>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									{#if log.status === 'success'}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
											<CheckCircle2 class="w-3 h-3" />
											Success
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
											<XCircle class="w-3 h-3" />
											Error
										</span>
									{/if}
								</td>
							</tr>

							<!-- Expanded Details Row -->
							{#if expandedRows.has(log.id) && log.details && Object.keys(log.details).length > 0}
								<tr class="bg-gray-50 dark:bg-gray-800/50" id={"audit-details-" + log.id}>
									<td colspan="7" class="px-6 py-3">
										<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Details</div>
										<pre class="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 overflow-x-auto">{formatDetails(log.details)}</pre>
										{#if log.error_message}
											<div class="mt-2 text-xs text-red-600 dark:text-red-400">
												<span class="font-medium">Error:</span> {log.error_message}
											</div>
										{/if}
									</td>
								</tr>
							{/if}
						{/each}
						{#if bottomSpacer > 0}
							<tr aria-hidden="true"><td colspan="7" style={`height: ${bottomSpacer}px;`}></td></tr>
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
					<div class="text-xs text-gray-500 dark:text-gray-400">
						Page {page} of {totalPages} ({total} total)
					</div>
					<div class="flex items-center gap-1">
						<button
							onclick={() => goToPage(page - 1)}
							disabled={page <= 1}
							class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-colors"
						>
							Previous
						</button>
						<button
							onclick={() => goToPage(page + 1)}
							disabled={page >= totalPages}
							class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-colors"
						>
							Next
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
