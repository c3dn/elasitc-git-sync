<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { pb, apiFetch } from '$lib/pocketbase';
	import {
		CheckCircle2,
		XCircle,
		AlertTriangle,
		ChevronDown,
		ChevronRight,
		Shield,
		ShieldOff,
		Plus,
		Minus,
		Edit3,
		ToggleLeft,
		ToggleRight,
		Tag,
		Search as SearchIcon,
		Filter,
		CheckCheck,
		XOctagon,
		ExternalLink
	} from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import type { PendingChange } from '$types';

	let changes: PendingChange[] = [];
	let loading = true;
	let error = '';
	let actionLoading: Record<string, boolean> = {};
	let expandedIds: Set<string> = new Set();
	let filterStatus = 'pending';
	let searchQuery = '';

	// Map: "projectId:envId" -> kibana base URL (e.g. "http://host:5601/s/prod")
	let kibanaBaseUrls: Record<string, string> = {};

	$: batchFilter = $page.url.searchParams.get('batch') || '';

	$: filteredChanges = changes.filter((c) => {
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			if (!c.rule_name.toLowerCase().includes(q) && !c.rule_id.toLowerCase().includes(q)) {
				return false;
			}
		}
		return true;
	});

	$: groupedByBatch = groupByBatch(filteredChanges);

	function groupByBatch(items: PendingChange[]): Record<string, PendingChange[]> {
		const groups: Record<string, PendingChange[]> = {};
		for (const item of items) {
			const batch = item.detection_batch || 'unknown';
			if (!groups[batch]) groups[batch] = [];
			groups[batch].push(item);
		}
		return groups;
	}

	onMount(async () => {
		await loadChanges();
	});

	async function loadChanges() {
		try {
			loading = true;
			let url = `${pb.baseUrl}/api/review/pending?status=${filterStatus}`;
			if (batchFilter) url += `&batch_id=${batchFilter}`;
			const response = await apiFetch(url);
			if (!response.ok) throw new Error('Failed to load changes');
			const data = await response.json();
			changes = data.changes || [];
			await resolveKibanaUrls();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function resolveKibanaUrls() {
		const resolved: Record<string, string> = {};
		const seen = new Map<string, string>();

		for (const change of changes) {
			const key = `${change.project}:${change.environment || ''}`;
			if (seen.has(key)) {
				resolved[change.id] = seen.get(key)!;
				continue;
			}

			try {
				const project = await pb.collection('projects').getOne(change.project, {
					expand: 'elastic_instance'
				});
				const elasticUrl = (project.expand?.elastic_instance?.url || '').replace(/\/$/, '');
				let space = project.elastic_space || 'default';

				if (change.environment) {
					try {
						const env = await pb.collection('environments').getOne(change.environment);
						if (env.elastic_space) space = env.elastic_space;
					} catch {}
				}

				const base = space && space !== 'default'
					? `${elasticUrl}/s/${space}`
					: elasticUrl;

				seen.set(key, base);
				resolved[change.id] = base;
			} catch {
				seen.set(key, '');
				resolved[change.id] = '';
			}
		}

		kibanaBaseUrls = resolved;
	}

	function getKibanaRuleUrl(change: PendingChange): string {
		const baseUrl = kibanaBaseUrls[change.id];
		if (!baseUrl) return '';
		const ruleInternalId = change.current_state?.id || change.previous_state?.id;
		if (!ruleInternalId) return '';
		return `${baseUrl}/app/security/rules/id/${ruleInternalId}`;
	}

	async function approveChange(id: string) {
		actionLoading[id] = true;
		error = '';
		try {
			const resp = await apiFetch(`${pb.baseUrl}/api/review/approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ change_id: id })
			});
			const data = await resp.json();
			if (resp.ok) {
				changes = changes.filter((c) => c.id !== id);
			} else {
				error = data.message || 'Approve failed';
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			actionLoading[id] = false;
		}
	}

	async function rejectChange(id: string) {
		actionLoading[id] = true;
		error = '';
		try {
			const resp = await apiFetch(`${pb.baseUrl}/api/review/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ change_id: id })
			});
			const data = await resp.json();
			if (resp.ok) {
				changes = changes.filter((c) => c.id !== id);
			} else {
				error = data.message || 'Reject failed';
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			actionLoading[id] = false;
		}
	}

	async function bulkApprove(batchId: string) {
		actionLoading['bulk-' + batchId] = true;
		error = '';
		try {
			const resp = await apiFetch(`${pb.baseUrl}/api/review/bulk-approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ batch_id: batchId })
			});
			const data = await resp.json();
			if (!resp.ok) {
				error = data.message || 'Bulk approve failed';
			} else if (data.failed > 0) {
				error = `Approved ${data.approved}, failed ${data.failed}: ${(data.errors || []).join('; ')}`;
			}
			await loadChanges();
		} catch (err: any) {
			error = err.message;
		} finally {
			actionLoading['bulk-' + batchId] = false;
		}
	}

	async function bulkReject(batchId: string) {
		actionLoading['bulk-reject-' + batchId] = true;
		error = '';
		try {
			const resp = await apiFetch(`${pb.baseUrl}/api/review/bulk-reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ batch_id: batchId })
			});
			const data = await resp.json();
			if (!resp.ok) {
				error = data.message || 'Bulk reject failed';
			}
			await loadChanges();
		} catch (err: any) {
			error = err.message;
		} finally {
			actionLoading['bulk-reject-' + batchId] = false;
		}
	}

	function toggleExpand(id: string) {
		if (expandedIds.has(id)) {
			expandedIds.delete(id);
		} else {
			expandedIds.add(id);
		}
		expandedIds = expandedIds;
	}

	function getChangeIcon(type: string) {
		const icons: Record<string, any> = {
			new_rule: Plus,
			deleted_rule: Minus,
			modified_rule: Edit3,
			rule_enabled: ToggleRight,
			rule_disabled: ToggleLeft,
			severity_changed: AlertTriangle,
			tags_changed: Tag,
			query_changed: SearchIcon,
			exception_added: ShieldOff,
			exception_removed: Shield,
			exception_modified: Shield
		};
		return icons[type] || Edit3;
	}

	function getChangeColor(type: string) {
		if (type === 'new_rule') return 'bg-green-100 text-green-700';
		if (type === 'deleted_rule') return 'bg-red-100 text-red-700';
		if (type.includes('exception')) return 'bg-orange-100 text-orange-700';
		if (type === 'rule_enabled' || type === 'rule_disabled') return 'bg-blue-100 text-blue-700';
		return 'bg-yellow-100 text-yellow-700';
	}

	function formatChangeType(type: string) {
		return type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
	}

	type DiffEntry = {
		field: string;
		type: 'added' | 'removed' | 'changed';
		oldValue?: unknown;
		newValue?: unknown;
	};

	// Skip noisy/volatile fields from diff
	const SKIP_FIELDS = new Set([
		'id',
		'created_at',
		'updated_at',
		'created_by',
		'updated_by',
		'execution_summary',
		'revision',
		'immutable',
		'output_index',
		'rule_source',
		'_enriched_exceptions',
		'_exception_items',
		'meta',
		'version'
	]);

	function computeDiff(prev: Record<string, any> | null, curr: Record<string, any> | null): DiffEntry[] {
		if (!prev && !curr) return [];
		if (!prev) {
			return Object.keys(curr!).filter(k => !SKIP_FIELDS.has(k)).map(k => ({
				field: k,
				type: 'added' as const,
				newValue: curr![k]
			}));
		}
		if (!curr) {
			return Object.keys(prev).filter(k => !SKIP_FIELDS.has(k)).map(k => ({
				field: k,
				type: 'removed' as const,
				oldValue: prev[k]
			}));
		}

		const diffs: DiffEntry[] = [];
		const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

		for (const key of allKeys) {
			if (SKIP_FIELDS.has(key)) continue;
			const inPrev = key in prev;
			const inCurr = key in curr;
			const prevStr = JSON.stringify(prev[key]);
			const currStr = JSON.stringify(curr[key]);

			if (!inPrev && inCurr) {
				diffs.push({ field: key, type: 'added', newValue: curr[key] });
			} else if (inPrev && !inCurr) {
				diffs.push({ field: key, type: 'removed', oldValue: prev[key] });
			} else if (prevStr !== currStr) {
				diffs.push({ field: key, type: 'changed', oldValue: prev[key], newValue: curr[key] });
			}
		}
		return diffs;
	}

	function formatValue(val: unknown): string {
		if (val === null || val === undefined) return 'null';
		if (typeof val === 'string') return val;
		if (Array.isArray(val) && val.length === 0) return '[]';
		return JSON.stringify(val, null, 2);
	}

	function formatExceptionItem(item: any): string {
		const name = item?.name || 'unnamed';
		const entries = item?.entries || [];
		const conditions = entries.map((e: any) => {
			const field = e.field || '?';
			const op = e.operator === 'included' ? 'is' : 'is not';
			const val = e.value || e.list?.id || '?';
			return `${field} ${op} "${val}"`;
		});
		return conditions.length > 0 ? `${name} (${conditions.join(' AND ')})` : name;
	}

	function buildExceptionDiff(prev: Record<string, any> | null, curr: Record<string, any> | null): string {
		const prevItems: any[] = (prev?._exception_items) || [];
		const currItems: any[] = (curr?._exception_items) || [];

		if (prevItems.length === 0 && currItems.length === 0) return '';

		const prevById = new Map(prevItems.map(it => [it.item_id, it]));
		const currById = new Map(currItems.map(it => [it.item_id, it]));

		const lines: string[] = [];

		// Added items
		for (const [id, item] of currById) {
			if (!prevById.has(id)) {
				lines.push(`+ Exception: ${formatExceptionItem(item)}`);
			}
		}
		// Removed items
		for (const [id, item] of prevById) {
			if (!currById.has(id)) {
				lines.push(`- Exception: ${formatExceptionItem(item)}`);
			}
		}
		// Modified items
		for (const [id, currItem] of currById) {
			const prevItem = prevById.get(id);
			if (prevItem && JSON.stringify(prevItem) !== JSON.stringify(currItem)) {
				lines.push(`- Exception: ${formatExceptionItem(prevItem)}`);
				lines.push(`+ Exception: ${formatExceptionItem(currItem)}`);
			}
		}

		return lines.join('\n');
	}

	function buildDiffText(prev: Record<string, any> | null, curr: Record<string, any> | null): string {
		const diffs = computeDiff(prev, curr);
		const lines: string[] = [];
		for (const d of diffs) {
			if (d.type === 'added') {
				lines.push(`+ ${d.field}: ${formatValue(d.newValue)}`);
			} else if (d.type === 'removed') {
				lines.push(`- ${d.field}: ${formatValue(d.oldValue)}`);
			} else {
				lines.push(`- ${d.field}: ${formatValue(d.oldValue)}`);
				lines.push(`+ ${d.field}: ${formatValue(d.newValue)}`);
			}
		}

		// Add exception item details
		const excDiff = buildExceptionDiff(prev, curr);
		if (excDiff) {
			if (lines.length > 0) lines.push('');
			lines.push(excDiff);
		}

		return lines.join('\n');
	}
</script>

<svelte:head>
	<title>Review Changes - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between animate-fade-in">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Review Changes</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Review detected rule changes before they are synced to Git
			</p>
		</div>
		<div class="flex items-center gap-3">
			<select
				bind:value={filterStatus}
				on:change={loadChanges}
				class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
			>
				<option value="pending">Pending</option>
				<option value="approved">Approved</option>
				<option value="rejected">Rejected</option>
			</select>
		</div>
	</div>

	<!-- Search -->
	<div class="relative">
		<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search by rule name or ID..."
			class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
		/>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{:else if filteredChanges.length === 0}
		<div class="card p-12 text-center">
			<CheckCircle2 class="w-12 h-12 text-green-400 mx-auto mb-4" />
			<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">No pending changes</h3>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">All changes have been reviewed. Check back later.</p>
		</div>
	{:else}
		{#each Object.entries(groupedByBatch) as [batchId, batchChanges]}
			<div class="card animate-fade-in">
				<!-- Batch Header -->
				<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<div>
						<h3 class="font-semibold text-gray-900 dark:text-gray-100">
							Detection Batch
						</h3>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
							{batchChanges.length} change{batchChanges.length !== 1 ? 's' : ''}
							{#if batchChanges[0]?.created}
								&middot; {formatDistanceToNow(new Date(batchChanges[0].created), { addSuffix: true })}
							{/if}
						</p>
					</div>
					{#if filterStatus === 'pending'}
						<div class="flex items-center gap-2">
							<button
								on:click={() => bulkApprove(batchId)}
								disabled={actionLoading['bulk-' + batchId]}
								class="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
							>
								<CheckCheck class="w-3.5 h-3.5" />
								Approve All
							</button>
							<button
								on:click={() => bulkReject(batchId)}
								disabled={actionLoading['bulk-reject-' + batchId]}
								class="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
							>
								<XOctagon class="w-3.5 h-3.5" />
								Reject All
							</button>
						</div>
					{/if}
				</div>

				<!-- Change Items -->
				<div class="divide-y divide-gray-100 dark:divide-gray-800">
					{#each batchChanges as change (change.id)}
						<div class="px-6 py-4">
							<!-- Change Row -->
							<div class="flex items-center justify-between">
								<button
									on:click={() => toggleExpand(change.id)}
									class="flex items-center gap-3 text-left flex-1 min-w-0"
								>
									{#if expandedIds.has(change.id)}
										<ChevronDown class="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
									{:else}
										<ChevronRight class="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
									{/if}

									<div class="p-1.5 rounded-lg {getChangeColor(change.change_type)}">
										<svelte:component this={getChangeIcon(change.change_type)} class="w-4 h-4" />
									</div>

									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-1.5">
											<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{change.rule_name}</p>
											{#if getKibanaRuleUrl(change)}
												<a
													href={getKibanaRuleUrl(change)}
													target="_blank"
													rel="noopener noreferrer"
													on:click|stopPropagation
													class="text-gray-400 dark:text-gray-500 hover:text-primary-600 flex-shrink-0"
													title="Open in Kibana"
												>
													<ExternalLink class="w-3.5 h-3.5" />
												</a>
											{/if}
										</div>
										<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{change.rule_id}</p>
										{#if change.current_state?.updated_by || change.current_state?.created_by}
											<p class="text-xs text-gray-400 dark:text-gray-500 truncate">
												{#if change.current_state?.updated_by}
													Modified by <span class="text-gray-500 dark:text-gray-400">{change.current_state.updated_by}</span>
												{:else if change.current_state?.created_by}
													Created by <span class="text-gray-500 dark:text-gray-400">{change.current_state.created_by}</span>
												{/if}
											</p>
										{/if}
									</div>

									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getChangeColor(change.change_type)} flex-shrink-0 ml-2">
										{formatChangeType(change.change_type)}
									</span>
								</button>

								{#if filterStatus === 'pending'}
									<div class="flex items-center gap-2 ml-4 flex-shrink-0">
										<button
											on:click={() => approveChange(change.id)}
											disabled={actionLoading[change.id]}
											class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
											title="Approve"
										>
											<CheckCircle2 class="w-5 h-5" />
										</button>
										<button
											on:click={() => rejectChange(change.id)}
											disabled={actionLoading[change.id]}
											class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
											title="Reject & Revert"
										>
											<XCircle class="w-5 h-5" />
										</button>
									</div>
								{:else}
									<span class="text-xs px-2 py-1 rounded-full ml-4 flex-shrink-0
										{change.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
										{change.status}
									</span>
								{/if}
							</div>

							<!-- Expanded Details -->
							{#if expandedIds.has(change.id)}
								{@const diffText = buildDiffText(change.previous_state, change.current_state)}
								<div class="mt-4 ml-11 space-y-3">
									{#if change.diff_summary}
										<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
											<p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Change Summary</p>
											<p class="text-sm text-gray-800 dark:text-gray-200">{change.diff_summary}</p>
										</div>
									{/if}
									{#if diffText}
										<pre class="text-xs font-mono bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap">{diffText}</pre>
									{/if}

									{#if change.reviewed_by}
										<p class="text-xs text-gray-500 dark:text-gray-400">
											Reviewed by {change.reviewed_by}
											{#if change.reviewed_at}
												&middot; {formatDistanceToNow(new Date(change.reviewed_at), { addSuffix: true })}
											{/if}
											{#if change.reverted}
												&middot; <span class="text-green-600">Reverted in Elastic</span>
											{/if}
										</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>
