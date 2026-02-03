<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { Clock, CheckCircle2, XCircle, AlertCircle, Activity } from 'lucide-svelte';
	import type { SyncJobExpanded } from '$types';
	import { formatDistanceToNow, format } from 'date-fns';

	let syncJobs: SyncJobExpanded[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadHistory();
	});

	async function loadHistory() {
		try {
			loading = true;
			const result = await pb.collection('sync_jobs').getList(1, 50, {
				expand: 'project',
				sort: '-created'
			});
			syncJobs = result.items;
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
			failed: XCircle,
			conflict: AlertCircle,
			pending: Clock
		};
		return icons[status] || Clock;
	}

	function getDirectionLabel(direction: string) {
		const labels: Record<string, string> = {
			elastic_to_git: 'Elastic → Git',
			git_to_elastic: 'Git → Elastic',
			bidirectional: 'Bidirectional'
		};
		return labels[direction] || direction;
	}
</script>

<svelte:head>
	<title>History - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Sync History</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			View all synchronization jobs and their results
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
	{:else if syncJobs.length === 0}
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
			<p class="text-gray-500 dark:text-gray-400">No sync jobs yet. Start a sync to see history here.</p>
		</div>
	{:else}
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
			<div class="overflow-x-auto">
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
						{#each syncJobs as job}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-2">
										<svelte:component
											this={getSyncStatusIcon(job.status)}
											class="w-4 h-4 text-gray-400 dark:text-gray-500"
										/>
										<span
											class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getSyncStatusColor(
												job.status
											)}"
										>
											{job.status}
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
									{#if job.changes_summary}
										<div class="flex items-center gap-3 text-xs">
											<span class="text-green-600">+{job.changes_summary.added}</span>
											<span class="text-blue-600">~{job.changes_summary.modified}</span>
											<span class="text-red-600">-{job.changes_summary.deleted}</span>
											{#if job.changes_summary.conflicts > 0}
												<span class="text-yellow-600">⚠ {job.changes_summary.conflicts}</span>
											{/if}
										</div>
									{:else}
										<span class="text-xs text-gray-400 dark:text-gray-500">-</span>
									{/if}
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
										<span class="text-sm text-blue-600 animate-pulse">Running...</span>
									{:else}
										<span class="text-xs text-gray-400 dark:text-gray-500">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
