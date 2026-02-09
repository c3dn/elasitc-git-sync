<script lang="ts">
	import { onMount } from 'svelte';
	import { pb, apiFetch } from '$lib/pocketbase';
	import { AlertTriangle, CheckCircle } from 'lucide-svelte';
	import type { Conflict } from '$types';

	let conflicts: Conflict[] = [];
	let loading = true;
	let error = '';
	let selectedConflict: Conflict | null = null;
	let showModal = false;

	onMount(async () => {
		await loadConflicts();
	});

	async function loadConflicts() {
		try {
			loading = true;
			conflicts = await pb.collection('conflicts').getFullList({
				filter: 'resolution = "pending"',
				sort: '-created'
			});
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function openConflictModal(conflict: Conflict) {
		selectedConflict = conflict;
		showModal = true;
	}

	function closeModal() {
		selectedConflict = null;
		showModal = false;
	}

	async function resolveConflict(resolution: 'use_elastic' | 'use_git') {
		if (!selectedConflict) return;

		try {
			const response = await apiFetch(`${pb.baseUrl}/api/conflict/resolve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conflict_id: selectedConflict.id,
					resolution
				})
			});

			if (!response.ok) throw new Error('Failed to resolve conflict');

			closeModal();
			await loadConflicts();
		} catch (err: any) {
			alert(`Error: ${err.message}`);
		}
	}
</script>

<svelte:head>
	<title>Conflicts - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Conflicts</h1>
		<p class="mt-1 text-sm text-gray-500">
			Resolve synchronization conflicts between Elastic and Git
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
	{:else if conflicts.length === 0}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
			<CheckCircle class="w-12 h-12 text-green-600 mx-auto mb-4" />
			<p class="text-gray-500">No pending conflicts. All syncs are clean!</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each conflicts as conflict}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-start gap-4">
						<div class="p-3 bg-yellow-100 rounded-lg">
							<AlertTriangle class="w-6 h-6 text-yellow-600" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-gray-900 mb-1">
								{conflict.rule_name}
							</h3>
							<p class="text-sm text-gray-600 mb-2">
								Rule ID: {conflict.rule_id}
							</p>
							<p class="text-sm text-gray-500">
								This rule has been modified in both Elastic and Git. Choose which version to keep.
							</p>
						</div>
						<button
							onclick={() => openConflictModal(conflict)}
							class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
						>
							Resolve
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Conflict Resolution Modal -->
{#if showModal && selectedConflict}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900">
					Resolve Conflict: {selectedConflict.rule_name}
				</h2>
			</div>

			<!-- Modal Content -->
			<div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
				<div class="grid grid-cols-2 gap-6">
					<!-- Elastic Version -->
					<div>
						<div class="flex items-center gap-2 mb-3">
							<h3 class="text-lg font-semibold text-gray-900">Elastic Version</h3>
							<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Source</span>
						</div>
						<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
							<pre class="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(
								selectedConflict.elastic_version,
								null,
								2
							)}</pre>
						</div>
					</div>

					<!-- Git Version -->
					<div>
						<div class="flex items-center gap-2 mb-3">
							<h3 class="text-lg font-semibold text-gray-900">Git Version</h3>
							<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Repository</span>
						</div>
						<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
							<pre class="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(
								selectedConflict.git_version,
								null,
								2
							)}</pre>
						</div>
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
				<button
					onclick={closeModal}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={() => resolveConflict('use_git')}
					class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
				>
					Use Git Version
				</button>
				<button
					onclick={() => resolveConflict('use_elastic')}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Use Elastic Version
				</button>
			</div>
		</div>
	</div>
{/if}
