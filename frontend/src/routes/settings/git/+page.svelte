<script lang="ts">
	import { onMount } from 'svelte';
	import { pb, apiFetch } from '$lib/pocketbase';
	import { Plus, CheckCircle, XCircle, Loader, Trash2, RefreshCw, Pencil } from 'lucide-svelte';
	import type { GitRepository } from '$types';

	let repositories: GitRepository[] = [];
	let showForm = false;
	let loading = false;
	let testingConnection = false;
	let error = '';
	let editingId: string | null = null;
	let sslVerificationDisabled = false;

	// Form fields
	let name = '';
	let url = '';
	let provider: 'gitlab' | 'github' | 'generic' = 'gitlab';
	let accessToken = '';
	let defaultBranch = 'main';
	let basePath = '';
	let isActive = true;

	onMount(async () => {
		await loadRepositories();
		try {
			const res = await apiFetch(`${pb.baseUrl}/api/settings/ssl-status`);
			const data = await res.json();
			sslVerificationDisabled = data.ssl_verification_disabled;
		} catch (err) {}
	});

	async function loadRepositories() {
		try {
			loading = true;
			repositories = await pb.collection('git_repositories').getFullList({
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
		provider = 'gitlab';
		accessToken = '';
		defaultBranch = 'main';
		basePath = '';
		isActive = true;
		editingId = null;
		error = '';
	}

	function openCreateForm() {
		resetForm();
		showForm = true;
	}

	function openEditForm(repo: GitRepository) {
		editingId = repo.id;
		name = repo.name;
		url = repo.url;
		provider = repo.provider;
		accessToken = repo.access_token;
		defaultBranch = repo.default_branch;
		basePath = repo.base_path || '';
		isActive = repo.is_active;
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

			const response = await apiFetch(`${pb.baseUrl}/api/connection/test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'git',
					config: { url, provider, access_token: accessToken }
				})
			});

			const result = await response.json();

			if (result.success) {
				alert(`Connection successful! Found ${result.branches?.length || 0} branches.`);
			} else {
				error = result.message;
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			testingConnection = false;
		}
	}

	async function saveRepository() {
		try {
			loading = true;
			error = '';

			const data = {
				name,
				url,
				provider,
				access_token: accessToken,
				default_branch: defaultBranch,
				base_path: basePath || '',
				is_active: isActive
			};

			if (editingId) {
				await pb.collection('git_repositories').update(editingId, data);
			} else {
				await pb.collection('git_repositories').create(data);
			}

			closeForm();
			await loadRepositories();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function deleteRepository(id: string) {
		if (!confirm('Are you sure you want to delete this repository?')) return;

		try {
			await pb.collection('git_repositories').delete(id);
			await loadRepositories();
		} catch (err: any) {
			alert(`Error: ${err.message}`);
		}
	}

	async function retestConnection(repo: GitRepository) {
		try {
			const response = await apiFetch(`${pb.baseUrl}/api/connection/test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'git',
					config: { url: repo.url, provider: repo.provider, access_token: repo.access_token }
				})
			});

			const result = await response.json();

			await pb.collection('git_repositories').update(repo.id, {
				connection_status: result.success ? 'success' : 'failed',
				last_connection_test: new Date().toISOString()
			});

			await loadRepositories();
		} catch (err: any) {
			console.error('Connection test failed:', err);
		}
	}
</script>

<svelte:head>
	<title>Git Repositories - Settings</title>
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
			Add Git Repository
		</button>
	{/if}

	{#if showForm}
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				{editingId ? 'Edit Git Repository' : 'Add Git Repository'}
			</h3>

			{#if error}
				<div class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Repository Name *
					</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="Security Rules Repository"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
					/>
				</div>

				<div>
					<label for="provider" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Provider *
					</label>
					<select
						id="provider"
						bind:value={provider}
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent appearance-auto"
					>
						<option value="gitlab">GitLab</option>
						<option value="github">GitHub</option>
						<option value="generic">Generic Git</option>
					</select>
				</div>

				<div>
					<label for="url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Repository URL *
					</label>
					<input
						id="url"
						type="url"
						bind:value={url}
						placeholder="https://gitlab.com/your-org/security-rules"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Full HTTPS URL to your Git repository
					</p>
				</div>

				<div>
					<label for="token" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Access Token {editingId ? '(leave empty to keep current)' : '*'}
					</label>
					<input
						id="token"
						type="password"
						bind:value={accessToken}
						placeholder={editingId ? '••••••••' : 'Your Git access token'}
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						{#if provider === 'gitlab'}
							Create a project access token with API and write_repository scopes
						{:else if provider === 'github'}
							Create a personal access token with repo scope
						{:else}
							Token for authentication
						{/if}
					</p>
				</div>

				<div>
					<label for="branch" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Default Branch *
					</label>
					<input
						id="branch"
						type="text"
						bind:value={defaultBranch}
						placeholder="main"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
					/>
				</div>

				<div>
					<label for="base-path" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Base Path (optional)
					</label>
					<input
						id="base-path"
						type="text"
						bind:value={basePath}
						placeholder="rules/"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Default subdirectory for storing rules
					</p>
				</div>

				<div class="flex items-center gap-2">
					<input
						id="is-active"
						type="checkbox"
						bind:checked={isActive}
						class="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-600"
					/>
					<label for="is-active" class="text-sm font-medium text-gray-700 dark:text-gray-300">
						Active
					</label>
				</div>

				<div class="flex items-center gap-3 pt-4">
					<button
						on:click={testConnection}
						disabled={!url || !accessToken || testingConnection}
						class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if testingConnection}
							<Loader class="w-4 h-4 animate-spin" />
						{:else}
							<RefreshCw class="w-4 h-4" />
						{/if}
						Test Connection
					</button>
					<button
						on:click={saveRepository}
						disabled={loading || !name || !url || (!editingId && !accessToken) || !defaultBranch}
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
						class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if loading && repositories.length === 0}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
		</div>
	{:else if repositories.length === 0 && !showForm}
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
			<p class="text-gray-500 dark:text-gray-400">No Git repositories configured yet.</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each repositories as repo}
				<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{repo.name}</h3>
								{#if repo.connection_status === 'success'}
									<CheckCircle class="w-5 h-5 text-green-600" />
								{:else if repo.connection_status === 'failed'}
									<XCircle class="w-5 h-5 text-red-600" />
								{/if}
								<span
									class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
								>
									{repo.provider}
								</span>
							</div>
							<p class="text-sm text-gray-600 dark:text-gray-400 mb-1">{repo.url}</p>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								Branch: {repo.default_branch}
								{#if repo.base_path}
									 &bull; Path: {repo.base_path}
								{/if}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
								{repo.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}"
							>
								{repo.is_active ? 'Active' : 'Inactive'}
							</span>
						</div>
					</div>

					<div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
						<button
							on:click={() => retestConnection(repo)}
							class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
						>
							<RefreshCw class="w-4 h-4" />
							Test Connection
						</button>
						<button
							on:click={() => openEditForm(repo)}
							class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
						>
							<Pencil class="w-4 h-4" />
							Edit
						</button>
						<button
							on:click={() => deleteRepository(repo.id)}
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
