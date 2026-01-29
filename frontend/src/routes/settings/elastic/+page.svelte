<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { Plus, CheckCircle, XCircle, Loader, Trash2, RefreshCw, Pencil } from 'lucide-svelte';
	import type { ElasticInstance } from '$types';

	let instances: ElasticInstance[] = [];
	let showForm = false;
	let loading = false;
	let testingConnection = false;
	let error = '';
	let editingId: string | null = null;
	let sslVerificationDisabled = false;

	// Form fields
	let name = '';
	let url = '';
	let apiKey = '';
	let isActive = true;

	onMount(async () => {
		await loadInstances();
		try {
			const res = await fetch(`${pb.baseUrl}/api/settings/ssl-status`);
			const data = await res.json();
			sslVerificationDisabled = data.ssl_verification_disabled;
		} catch (err) {}
	});

	async function loadInstances() {
		try {
			loading = true;
			instances = await pb.collection('elastic_instances').getFullList({
				sort: '-created'
			});
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		name = '';
		url = '';
		apiKey = '';
		isActive = true;
		editingId = null;
		error = '';
	}

	function openCreateForm() {
		resetForm();
		showForm = true;
	}

	function openEditForm(instance: ElasticInstance) {
		editingId = instance.id;
		name = instance.name;
		url = instance.url;
		apiKey = instance.api_key;
		isActive = instance.is_active;
		error = '';
		showForm = true;
	}

	function closeForm() {
		showForm = false;
		resetForm();
	}

	async function testConnection() {
		try {
			testingConnection = true;
			error = '';

			const response = await fetch(`${pb.baseUrl}/api/connection/test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'elastic',
					config: { url, api_key: apiKey }
				})
			});

			const result = await response.json();

			if (result.success) {
				alert(`Connection successful! Found ${result.spaces?.length || 0} spaces.`);
			} else {
				error = result.message;
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			testingConnection = false;
		}
	}

	async function saveInstance() {
		try {
			loading = true;
			error = '';

			const data = {
				name,
				url,
				api_key: apiKey,
				is_active: isActive
			};

			if (editingId) {
				await pb.collection('elastic_instances').update(editingId, data);
			} else {
				await pb.collection('elastic_instances').create(data);
			}

			closeForm();
			await loadInstances();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function deleteInstance(id: string) {
		if (!confirm('Are you sure you want to delete this instance?')) return;

		try {
			await pb.collection('elastic_instances').delete(id);
			await loadInstances();
		} catch (err: any) {
			alert(`Error: ${err.message}`);
		}
	}

	async function retestConnection(instance: ElasticInstance) {
		try {
			const response = await fetch(`${pb.baseUrl}/api/connection/test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'elastic',
					config: { url: instance.url, api_key: instance.api_key }
				})
			});

			const result = await response.json();

			await pb.collection('elastic_instances').update(instance.id, {
				connection_status: result.success ? 'success' : 'failed',
				last_connection_test: new Date().toISOString(),
				spaces: result.spaces || []
			});

			await loadInstances();
		} catch (err: any) {
			console.error('Connection test failed:', err);
		}
	}
</script>

<svelte:head>
	<title>Elastic Instances - Settings</title>
</svelte:head>

<div class="space-y-6">
	{#if sslVerificationDisabled}
		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
			<p class="text-sm text-yellow-800 font-medium">SSL certificate verification is disabled</p>
			<p class="text-xs text-yellow-700 mt-1">
				The DISABLE_SSL_VERIFY environment variable is set to true. All outgoing HTTPS connections skip certificate verification.
			</p>
		</div>
	{/if}

	{#if !showForm}
		<button
			on:click={openCreateForm}
			class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
		>
			<Plus class="w-5 h-5" />
			Add Elastic Instance
		</button>
	{/if}

	{#if showForm}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">
				{editingId ? 'Edit Elastic Instance' : 'Add Elastic Instance'}
			</h3>

			{#if error}
				<div class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700 mb-2">
						Instance Name *
					</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="Production Elastic"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
					/>
				</div>

				<div>
					<label for="url" class="block text-sm font-medium text-gray-700 mb-2">
						Elastic URL *
					</label>
					<input
						id="url"
						type="url"
						bind:value={url}
						placeholder="https://your-elastic.cloud"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 mt-1">Full URL to your Elastic instance</p>
				</div>

				<div>
					<label for="api-key" class="block text-sm font-medium text-gray-700 mb-2">
						API Key {editingId ? '(leave empty to keep current)' : '*'}
					</label>
					<input
						id="api-key"
						type="password"
						bind:value={apiKey}
						placeholder={editingId ? '••••••••' : 'Your Elastic API key'}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 mt-1">
						Create an API key in Kibana: Stack Management → API Keys
					</p>
				</div>

				<div class="flex items-center gap-2">
					<input
						id="is-active"
						type="checkbox"
						bind:checked={isActive}
						class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-600"
					/>
					<label for="is-active" class="text-sm font-medium text-gray-700">
						Active
					</label>
				</div>

				<div class="flex items-center gap-3 pt-4">
					<button
						on:click={testConnection}
						disabled={!url || !apiKey || testingConnection}
						class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if testingConnection}
							<Loader class="w-4 h-4 animate-spin" />
						{:else}
							<RefreshCw class="w-4 h-4" />
						{/if}
						Test Connection
					</button>
					<button
						on:click={saveInstance}
						disabled={loading || !name || !url || (!editingId && !apiKey)}
						class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if loading}
							<Loader class="w-4 h-4 animate-spin" />
						{:else}
							{editingId ? 'Update' : 'Save'}
						{/if}
					</button>
					<button
						on:click={closeForm}
						class="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if loading && instances.length === 0}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
		</div>
	{:else if instances.length === 0 && !showForm}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
			<p class="text-gray-500">No Elastic instances configured yet.</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each instances as instance}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<h3 class="text-lg font-semibold text-gray-900">{instance.name}</h3>
								{#if instance.connection_status === 'success'}
									<CheckCircle class="w-5 h-5 text-green-600" />
								{:else if instance.connection_status === 'failed'}
									<XCircle class="w-5 h-5 text-red-600" />
								{/if}
							</div>
							<p class="text-sm text-gray-600 mb-2">{instance.url}</p>
							{#if instance.spaces && instance.spaces.length > 0}
								<p class="text-xs text-gray-500">
									Spaces: {instance.spaces.join(', ')}
								</p>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
								{instance.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}"
							>
								{instance.is_active ? 'Active' : 'Inactive'}
							</span>
						</div>
					</div>

					<div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
						<button
							on:click={() => retestConnection(instance)}
							class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
						>
							<RefreshCw class="w-4 h-4" />
							Test Connection
						</button>
						<button
							on:click={() => openEditForm(instance)}
							class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
						>
							<Pencil class="w-4 h-4" />
							Edit
						</button>
						<button
							on:click={() => deleteInstance(instance.id)}
							class="ml-auto inline-flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
						>
							<Trash2 class="w-4 h-4" />
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
