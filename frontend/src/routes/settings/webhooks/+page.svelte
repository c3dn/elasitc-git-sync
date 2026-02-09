<script lang="ts">
	import { onMount } from 'svelte';
	import { pb, apiFetch } from '$lib/pocketbase';
	import {
		Webhook,
		Plus,
		Trash2,
		Edit3,
		Send,
		CheckCircle2,
		XCircle,
		AlertCircle
	} from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import type { WebhookConfig } from '$types';

	let webhooks: WebhookConfig[] = [];
	let loading = true;
	let error = '';
	let showForm = false;
	let editingId = '';

	let form = {
		name: '',
		url: '',
		secret: '',
		events: [] as string[],
		is_active: true
	};

	const allEvents = [
		{ id: 'change_detected', label: 'Change Detected', description: 'When new rule changes are found in Elastic' },
		{ id: 'change_approved', label: 'Change Approved', description: 'When a reviewer approves a change' },
		{ id: 'change_rejected', label: 'Change Rejected', description: 'When a reviewer rejects a change' },
		{ id: 'revert_failed', label: 'Revert Failed', description: 'When reverting a rejected change fails in Elastic' },
		{ id: 'sync_error', label: 'Sync Error', description: 'When a sync operation encounters an error' }
	];

	onMount(async () => {
		await loadWebhooks();
	});

	async function loadWebhooks() {
		try {
			loading = true;
			const resp = await apiFetch(`${pb.baseUrl}/api/webhooks`);
			if (!resp.ok) throw new Error('Failed to load webhooks');
			const data = await resp.json();
			webhooks = data.webhooks || [];
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function openNew() {
		form = { name: '', url: '', secret: '', events: ['change_detected'], is_active: true };
		editingId = '';
		showForm = true;
	}

	function openEdit(hook: WebhookConfig) {
		form = {
			name: hook.name,
			url: hook.url,
			secret: '',
			events: Array.isArray(hook.events) ? hook.events : [],
			is_active: hook.is_active
		};
		editingId = hook.id;
		showForm = true;
	}

	async function saveWebhook() {
		try {
			const body: any = { ...form };
			if (editingId) {
				if (!body.secret) delete body.secret;
				await apiFetch(`${pb.baseUrl}/api/webhooks/${editingId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
			} else {
				await apiFetch(`${pb.baseUrl}/api/webhooks`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
			}
			showForm = false;
			await loadWebhooks();
		} catch (err: any) {
			error = err.message;
		}
	}

	async function deleteWebhook(id: string) {
		if (!confirm('Delete this webhook?')) return;
		try {
			await apiFetch(`${pb.baseUrl}/api/webhooks/${id}`, { method: 'DELETE' });
			await loadWebhooks();
		} catch (err: any) {
			error = err.message;
		}
	}

	async function testWebhook(id: string) {
		try {
			const resp = await apiFetch(`${pb.baseUrl}/api/webhooks/${id}/test`, { method: 'POST' });
			const data = await resp.json();
			if (data.success) {
				alert('Test webhook sent successfully!');
			} else {
				alert('Test failed: ' + (data.message || 'Unknown error'));
			}
			await loadWebhooks();
		} catch (err: any) {
			alert('Error: ' + err.message);
		}
	}

	function toggleEvent(eventId: string) {
		if (form.events.includes(eventId)) {
			form.events = form.events.filter((e) => e !== eventId);
		} else {
			form.events = [...form.events, eventId];
		}
	}
</script>

<svelte:head>
	<title>Webhooks - Settings - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks</h2>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure webhook endpoints for notifications</p>
		</div>
		<button
			onclick={openNew}
			class="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
		>
			<Plus class="w-4 h-4" />
			Add Webhook
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
			<p class="text-sm text-red-800 dark:text-red-300">{error}</p>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
		</div>
	{:else if webhooks.length === 0 && !showForm}
		<div class="card p-12 text-center">
			<Webhook class="w-12 h-12 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
			<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">No webhooks configured</h3>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Add a webhook to receive notifications about rule changes.</p>
		</div>
	{:else}
		<!-- Webhook List -->
		<div class="space-y-3">
			{#each webhooks as hook (hook.id)}
				<div class="card p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3 flex-1 min-w-0">
							<div class="p-2 rounded-lg {hook.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}">
								<Webhook class="w-5 h-5 {hook.is_active ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="text-sm font-medium text-gray-900 dark:text-gray-100">{hook.name}</p>
									{#if !hook.is_active}
										<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">Disabled</span>
									{/if}
								</div>
								<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{hook.url}</p>
								<div class="flex items-center gap-2 mt-1">
									{#if hook.last_status === 'success'}
										<CheckCircle2 class="w-3 h-3 text-green-500" />
									{:else if hook.last_status === 'failed'}
										<XCircle class="w-3 h-3 text-red-500" />
									{:else}
										<AlertCircle class="w-3 h-3 text-gray-400 dark:text-gray-500" />
									{/if}
									<span class="text-xs text-gray-400 dark:text-gray-500">
										{#if hook.last_triggered}
											Last triggered {formatDistanceToNow(new Date(hook.last_triggered), { addSuffix: true })}
										{:else}
											Never triggered
										{/if}
									</span>
								</div>
							</div>
						</div>
						<div class="flex items-center gap-1">
							<button
								onclick={() => testWebhook(hook.id)}
								class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
								title="Send test webhook"
							>
								<Send class="w-4 h-4" />
							</button>
							<button
								onclick={() => openEdit(hook)}
								class="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
								title="Edit"
							>
								<Edit3 class="w-4 h-4" />
							</button>
							<button
								onclick={() => deleteWebhook(hook.id)}
								class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
								title="Delete"
							>
								<Trash2 class="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Form Modal -->
	{#if showForm}
		<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
				<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{editingId ? 'Edit Webhook' : 'Add Webhook'}
					</h3>
				</div>

				<div class="px-6 py-4 space-y-4">
					<div>
						<label for="wh-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
						<input
							id="wh-name"
							type="text"
							bind:value={form.name}
							placeholder="e.g., Slack Notifications"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
						/>
					</div>

					<div>
						<label for="wh-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
						<input
							id="wh-url"
							type="url"
							bind:value={form.url}
							placeholder="https://hooks.slack.com/services/..."
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
						/>
					</div>

					<div>
						<label for="wh-secret" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret (optional)</label>
						<input
							id="wh-secret"
							type="password"
							bind:value={form.secret}
							placeholder={editingId ? 'Leave blank to keep current' : 'HMAC signing secret'}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
						/>
					</div>

					<div>
						<p class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</p>
						<div class="space-y-2">
							{#each allEvents as event}
								<label class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
									<input
										type="checkbox"
										checked={form.events.includes(event.id)}
										onchange={() => toggleEvent(event.id)}
										class="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
									/>
									<div>
										<p class="text-sm font-medium text-gray-900 dark:text-gray-100">{event.label}</p>
										<p class="text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={form.is_active}
							id="wh-active"
							class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
						/>
						<label for="wh-active" class="text-sm text-gray-700 dark:text-gray-300">Enabled</label>
					</div>
				</div>

				<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
					<button
						onclick={() => (showForm = false)}
						class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={saveWebhook}
						disabled={!form.name || !form.url || form.events.length === 0}
						class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
					>
						{editingId ? 'Save Changes' : 'Create Webhook'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
