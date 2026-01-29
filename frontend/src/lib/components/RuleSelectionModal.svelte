<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import {
		X,
		Search,
		Loader,
		Upload,
		CheckSquare,
		Square,
		AlertTriangle
	} from 'lucide-svelte';
	import type { ElasticRuleSummary } from '$types';

	interface Props {
		open: boolean;
		projectId: string;
		space: string;
		branch: string;
		onexport: (ruleIds: string[] | null) => void;
		onclose: () => void;
	}

	let { open, projectId, space, branch, onexport, onclose }: Props = $props();

	let rules = $state<ElasticRuleSummary[]>([]);
	let selected = $state<Set<string>>(new Set());
	let loadingRules = $state(false);
	let loadError = $state('');
	let searchQuery = $state('');
	let severityFilter = $state<string>('all');

	let filteredRules = $derived(
		rules.filter((r) => {
			const matchesSearch =
				!searchQuery ||
				r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.rule_id.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter;
			return matchesSearch && matchesSeverity;
		})
	);

	let selectedCount = $derived(selected.size);
	let allFilteredSelected = $derived(
		filteredRules.length > 0 && filteredRules.every((r) => selected.has(r.rule_id))
	);

	$effect(() => {
		if (open) {
			fetchRules();
		}
	});

	async function fetchRules() {
		loadingRules = true;
		loadError = '';
		searchQuery = '';
		severityFilter = 'all';
		try {
			const response = await fetch(`${pb.baseUrl}/api/rules/list`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					project_id: projectId,
					space: space
				})
			});
			const data = await response.json();
			if (data.success) {
				rules = data.rules;
				selected = new Set(rules.map((r) => r.rule_id));
			} else {
				loadError = data.message || 'Failed to load rules';
			}
		} catch (err: any) {
			loadError = err.message;
		} finally {
			loadingRules = false;
		}
	}

	function toggleRule(ruleId: string) {
		const next = new Set(selected);
		if (next.has(ruleId)) {
			next.delete(ruleId);
		} else {
			next.add(ruleId);
		}
		selected = next;
	}

	function toggleAll() {
		if (allFilteredSelected) {
			const next = new Set(selected);
			for (const r of filteredRules) {
				next.delete(r.rule_id);
			}
			selected = next;
		} else {
			const next = new Set(selected);
			for (const r of filteredRules) {
				next.add(r.rule_id);
			}
			selected = next;
		}
	}

	function exportSelected() {
		onexport(Array.from(selected));
	}

	function exportAll() {
		onexport(null);
	}

	function getSeverityColor(severity: string): string {
		switch (severity) {
			case 'critical':
				return 'bg-red-100 text-red-700';
			case 'high':
				return 'bg-orange-100 text-orange-700';
			case 'medium':
				return 'bg-yellow-100 text-yellow-700';
			case 'low':
				return 'bg-blue-100 text-blue-700';
			default:
				return 'bg-gray-100 text-gray-600';
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Select Rules to Export</h2>
					<p class="text-sm text-gray-500 mt-1">
						Export to branch: <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{branch}</code>
					</p>
				</div>
				<button onclick={onclose} class="text-gray-400 hover:text-gray-600 transition-colors">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Toolbar -->
			<div class="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0 flex-wrap">
				<div class="relative flex-1 min-w-[200px]">
					<Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
					<input
						type="text"
						placeholder="Search rules..."
						bind:value={searchQuery}
						class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
					/>
				</div>
				<select
					bind:value={severityFilter}
					class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
				>
					<option value="all">All Severities</option>
					<option value="critical">Critical</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
				<button
					onclick={toggleAll}
					class="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
				>
					{#if allFilteredSelected}
						<CheckSquare class="w-4 h-4" />
						Deselect All
					{:else}
						<Square class="w-4 h-4" />
						Select All
					{/if}
				</button>
			</div>

			<!-- Rules list -->
			<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
				{#if loadingRules}
					<div class="flex items-center justify-center py-12">
						<Loader class="w-6 h-6 animate-spin text-yellow-600" />
						<span class="ml-2 text-sm text-gray-500">Loading rules from Elastic...</span>
					</div>
				{:else if loadError}
					<div class="flex items-center gap-3 py-8 justify-center">
						<AlertTriangle class="w-5 h-5 text-red-500" />
						<span class="text-sm text-red-600">{loadError}</span>
					</div>
				{:else if filteredRules.length === 0}
					<div class="text-center py-8 text-sm text-gray-500">
						{#if searchQuery || severityFilter !== 'all'}
							No rules match your filter.
						{:else}
							No rules found in Elastic.
						{/if}
					</div>
				{:else}
					{#each filteredRules as rule}
						<label
							class="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-50 last:border-0"
						>
							<input
								type="checkbox"
								checked={selected.has(rule.rule_id)}
								onchange={() => toggleRule(rule.rule_id)}
								class="w-4 h-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
							/>
							<div class="flex-1 min-w-0">
								<div class="font-medium text-sm text-gray-900 truncate">{rule.name}</div>
								<div class="text-xs text-gray-400 truncate">{rule.rule_id}</div>
							</div>
							<span class="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 {getSeverityColor(rule.severity)}">
								{rule.severity}
							</span>
							<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex-shrink-0">
								{rule.type}
							</span>
							{#if rule.enabled}
								<span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Enabled"></span>
							{:else}
								<span class="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" title="Disabled"></span>
							{/if}
						</label>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
				<span class="text-sm text-gray-500">
					{selectedCount} of {rules.length} rules selected
				</span>
				<div class="flex items-center gap-3">
					<button
						onclick={onclose}
						class="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={exportAll}
						class="px-4 py-2 text-sm text-yellow-700 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors font-medium"
					>
						Export All ({rules.length})
					</button>
					<button
						onclick={exportSelected}
						disabled={selectedCount === 0}
						class="inline-flex items-center gap-2 px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Upload class="w-4 h-4" />
						Export Selected ({selectedCount})
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
