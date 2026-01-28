<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import {
		ArrowLeft,
		Save,
		Loader,
		TestTube,
		Rocket,
		Trash2
	} from 'lucide-svelte';
	import type { ProjectExpanded, Environment, ElasticInstance, GitRepository } from '$types';

	let project = $state<ProjectExpanded | null>(null);
	let environments = $state<Environment[]>([]);
	let elasticInstances = $state<ElasticInstance[]>([]);
	let gitRepositories = $state<GitRepository[]>([]);
	let availableSpaces = $state<string[]>([]);

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let successMessage = $state('');

	// Project form
	let name = $state('');
	let description = $state('');
	let elasticInstanceId = $state('');
	let gitRepositoryId = $state('');
	let gitPath = $state('');
	let isActive = $state(true);

	// Test environment form
	let testSpace = $state('');
	let testBranch = $state('');

	// Production environment form
	let prodSpace = $state('');
	let prodBranch = $state('');

	let projectId = $derived($page.params.id);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		try {
			loading = true;

			// Load project
			project = await pb.collection('projects').getOne(projectId, {
				expand: 'elastic_instance,git_repository'
			});

			// Populate project form
			name = project.name;
			description = project.description || '';
			elasticInstanceId = project.elastic_instance;
			gitRepositoryId = project.git_repository;
			gitPath = project.git_path || '';
			isActive = project.is_active;

			// Load environments
			environments = await pb.collection('environments').getFullList({
				filter: `project = "${projectId}"`
			});

			// Populate environment forms
			const testEnv = environments.find(e => e.name === 'test');
			const prodEnv = environments.find(e => e.name === 'production');

			if (testEnv) {
				testSpace = testEnv.elastic_space;
				testBranch = testEnv.git_branch;
			}

			if (prodEnv) {
				prodSpace = prodEnv.elastic_space;
				prodBranch = prodEnv.git_branch;
			}

			// Load options
			elasticInstances = await pb.collection('elastic_instances').getFullList({
				filter: 'is_active = true'
			});
			gitRepositories = await pb.collection('git_repositories').getFullList({
				filter: 'is_active = true'
			});

			// Load spaces
			await loadSpaces();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadSpaces() {
		if (!elasticInstanceId) return;

		try {
			const instance = elasticInstances.find((i) => i.id === elasticInstanceId);
			if (instance && instance.spaces) {
				availableSpaces = instance.spaces;
			}
		} catch (err: any) {
			console.error('Failed to load spaces:', err);
		}
	}

	$effect(() => {
		if (elasticInstanceId && elasticInstances.length > 0) {
			loadSpaces();
		}
	});

	async function saveProject() {
		try {
			saving = true;
			error = '';
			successMessage = '';

			// Update project
			await pb.collection('projects').update(projectId, {
				name,
				description: description || '',
				elastic_instance: elasticInstanceId,
				elastic_space: testSpace, // Keep for backwards compatibility
				git_repository: gitRepositoryId,
				git_path: gitPath || '',
				is_active: isActive
			});

			// Update or create test environment
			const testEnv = environments.find(e => e.name === 'test');
			if (testEnv) {
				await pb.collection('environments').update(testEnv.id, {
					elastic_space: testSpace,
					git_branch: testBranch
				});
			} else if (testSpace && testBranch) {
				await pb.collection('environments').create({
					project: projectId,
					name: 'test',
					elastic_space: testSpace,
					git_branch: testBranch,
					requires_approval: false,
					auto_deploy: true
				});
			}

			// Update or create production environment
			const prodEnv = environments.find(e => e.name === 'production');
			if (prodEnv) {
				await pb.collection('environments').update(prodEnv.id, {
					elastic_space: prodSpace,
					git_branch: prodBranch
				});
			} else if (prodSpace && prodBranch) {
				await pb.collection('environments').create({
					project: projectId,
					name: 'production',
					elastic_space: prodSpace,
					git_branch: prodBranch,
					requires_approval: true,
					auto_deploy: false
				});
			}

			successMessage = 'Project saved successfully!';

			// Reload data
			await loadData();
		} catch (err: any) {
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function deleteEnvironment(envName: 'test' | 'production') {
		const env = environments.find(e => e.name === envName);
		if (!env) return;

		if (!confirm(`Are you sure you want to delete the ${envName} environment?`)) return;

		try {
			await pb.collection('environments').delete(env.id);
			if (envName === 'test') {
				testSpace = '';
				testBranch = '';
			} else {
				prodSpace = '';
				prodBranch = '';
			}
			await loadData();
		} catch (err: any) {
			error = err.message;
		}
	}
</script>

<svelte:head>
	<title>Edit {project?.name || 'Project'} - Elastic Git Sync</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6">
	<!-- Header -->
	<div>
		<a href="/projects/{projectId}" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
			<ArrowLeft class="w-4 h-4" />
			Back to Project
		</a>
		<h1 class="text-3xl font-bold text-gray-900">Edit Project</h1>
		<p class="mt-1 text-sm text-gray-500">
			Update project settings and environment configuration
		</p>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	{#if successMessage}
		<div class="bg-green-50 border border-green-200 rounded-lg p-4">
			<p class="text-sm text-green-800">{successMessage}</p>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else}
		<!-- Project Details -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700 mb-2">
						Project Name *
					</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					/>
				</div>
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
						Description
					</label>
					<textarea
						id="description"
						bind:value={description}
						rows="2"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					></textarea>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="elastic" class="block text-sm font-medium text-gray-700 mb-2">
							Elastic Instance *
						</label>
						<select
							id="elastic"
							bind:value={elasticInstanceId}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						>
							{#each elasticInstances as instance}
								<option value={instance.id}>{instance.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="git" class="block text-sm font-medium text-gray-700 mb-2">
							Git Repository *
						</label>
						<select
							id="git"
							bind:value={gitRepositoryId}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						>
							{#each gitRepositories as repo}
								<option value={repo.id}>{repo.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div>
					<label for="path" class="block text-sm font-medium text-gray-700 mb-2">
						Base Path in Repository
					</label>
					<input
						id="path"
						type="text"
						bind:value={gitPath}
						placeholder="detection-rules/"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					/>
				</div>
				<div class="flex items-center gap-2">
					<input
						id="active"
						type="checkbox"
						bind:checked={isActive}
						class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
					/>
					<label for="active" class="text-sm font-medium text-gray-700">
						Project is active
					</label>
				</div>
			</div>
		</div>

		<!-- Test Environment -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-yellow-100 rounded-lg">
						<TestTube class="w-5 h-5 text-yellow-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900">Test Environment</h2>
						<p class="text-sm text-gray-500">Development and testing configuration</p>
					</div>
				</div>
				{#if environments.find(e => e.name === 'test')}
					<button
						on:click={() => deleteEnvironment('test')}
						class="text-red-600 hover:text-red-700 text-sm"
					>
						<Trash2 class="w-4 h-4" />
					</button>
				{/if}
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="test-space" class="block text-sm font-medium text-gray-700 mb-2">
						Elastic Space
					</label>
					{#if availableSpaces.length > 0}
						<select
							id="test-space"
							bind:value={testSpace}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						>
							<option value="">Select space...</option>
							{#each availableSpaces as space}
								<option value={space}>{space}</option>
							{/each}
						</select>
					{:else}
						<input
							id="test-space"
							type="text"
							bind:value={testSpace}
							placeholder="test"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						/>
					{/if}
				</div>
				<div>
					<label for="test-branch" class="block text-sm font-medium text-gray-700 mb-2">
						Git Branch
					</label>
					<input
						id="test-branch"
						type="text"
						bind:value={testBranch}
						placeholder="develop"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					/>
				</div>
			</div>
		</div>

		<!-- Production Environment -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-green-100 rounded-lg">
						<Rocket class="w-5 h-5 text-green-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900">Production Environment</h2>
						<p class="text-sm text-gray-500">Production configuration (requires MR)</p>
					</div>
				</div>
				{#if environments.find(e => e.name === 'production')}
					<button
						on:click={() => deleteEnvironment('production')}
						class="text-red-600 hover:text-red-700 text-sm"
					>
						<Trash2 class="w-4 h-4" />
					</button>
				{/if}
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="prod-space" class="block text-sm font-medium text-gray-700 mb-2">
						Elastic Space
					</label>
					{#if availableSpaces.length > 0}
						<select
							id="prod-space"
							bind:value={prodSpace}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						>
							<option value="">Select space...</option>
							{#each availableSpaces as space}
								<option value={space}>{space}</option>
							{/each}
						</select>
					{:else}
						<input
							id="prod-space"
							type="text"
							bind:value={prodSpace}
							placeholder="default"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						/>
					{/if}
				</div>
				<div>
					<label for="prod-branch" class="block text-sm font-medium text-gray-700 mb-2">
						Git Branch
					</label>
					<input
						id="prod-branch"
						type="text"
						bind:value={prodBranch}
						placeholder="main"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					/>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-4">
			<button
				on:click={saveProject}
				disabled={saving || !name || !elasticInstanceId || !gitRepositoryId}
				class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
			>
				{#if saving}
					<Loader class="w-5 h-5 animate-spin" />
				{:else}
					<Save class="w-5 h-5" />
				{/if}
				Save Changes
			</button>
			<a
				href="/projects/{projectId}"
				class="px-6 py-3 text-gray-700 hover:text-gray-900 transition-colors"
			>
				Cancel
			</a>
		</div>
	{/if}
</div>
