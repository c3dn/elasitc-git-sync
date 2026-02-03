<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import { ArrowLeft, ArrowRight, Check, TestTube, Rocket } from 'lucide-svelte';
	import type { ElasticInstance, GitRepository } from '$types';

	let step = $state(1);
	let syncMode = $state<'full' | 'export_only'>('full');
	let totalSteps = $derived(syncMode === 'export_only' ? 3 : 4);
	let stepNames = $derived(
		syncMode === 'export_only'
			? ['Project Info', 'Connections', 'Environment']
			: ['Project Info', 'Connections', 'Test Environment', 'Prod Environment']
	);

	// Form data - Project
	let name = $state('');
	let description = $state('');
	let elasticInstanceId = $state('');
	let gitRepositoryId = $state('');
	let gitPath = $state('');

	// Form data - Test Environment
	let testSpace = $state('');
	let testBranch = $state('develop');

	// Form data - Prod Environment
	let prodSpace = $state('');
	let prodBranch = $state('main');

	// Available options
	let elasticInstances = $state<ElasticInstance[]>([]);
	let gitRepositories = $state<GitRepository[]>([]);
	let availableSpaces = $state<string[]>([]);

	let loading = $state(false);
	let error = $state('');

	// Derived state for button enabled
	let canProceedStep1 = $derived(name.trim().length > 0);
	let canProceedStep2 = $derived(elasticInstanceId !== '' && gitRepositoryId !== '');
	let canProceedStep3 = $derived(testSpace !== '' && testBranch.trim().length > 0);
	let canProceedStep4 = $derived(prodSpace !== '' && prodBranch.trim().length > 0);

	onMount(async () => {
		await loadOptions();
	});

	async function loadOptions() {
		try {
			elasticInstances = await pb.collection('elastic_instances').getFullList({
				filter: 'is_active = true'
			});
			gitRepositories = await pb.collection('git_repositories').getFullList({
				filter: 'is_active = true'
			});
		} catch (err: any) {
			error = err.message;
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
		if (elasticInstanceId) {
			loadSpaces();
		}
	});

	// Clamp step when sync mode changes (e.g. from full to export_only while on step 4)
	$effect(() => {
		if (step > totalSteps) {
			step = totalSteps;
		}
	});

	function nextStep() {
		if (step < totalSteps) step++;
	}

	function prevStep() {
		if (step > 1) step--;
	}

	async function createProject() {
		try {
			loading = true;
			error = '';

			// Create project first
			const projectData = {
				name,
				description,
				elastic_instance: elasticInstanceId,
				elastic_space: testSpace, // Default to test space for backwards compatibility
				git_repository: gitRepositoryId,
				git_path: gitPath || undefined,
				is_active: true,
				sync_enabled: true,
				sync_mode: syncMode
			};

			const project = await pb.collection('projects').create(projectData);

			// Create Test environment
			await pb.collection('environments').create({
				project: project.id,
				name: 'test',
				elastic_space: testSpace,
				git_branch: testBranch,
				requires_approval: false,
				auto_deploy: true
			});

			// Create Production environment (only for full mode)
			if (syncMode === 'full') {
				await pb.collection('environments').create({
					project: project.id,
					name: 'production',
					elastic_space: prodSpace,
					git_branch: prodBranch,
					requires_approval: true,
					auto_deploy: false
				});
			}

			goto('/projects/' + project.id);
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function canProceed(currentStep: number): boolean {
		switch (currentStep) {
			case 1:
				return canProceedStep1;
			case 2:
				return canProceedStep2;
			case 3:
				return canProceedStep3;
			case 4:
				return canProceedStep4;
			default:
				return false;
		}
	}
</script>

<svelte:head>
	<title>New Project - Elastic Git Sync</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6">
	<!-- Header -->
	<div>
		<a href="/projects" class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4">
			<ArrowLeft class="w-4 h-4" />
			Back to Projects
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Project</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Configure Test and Production environments for your detection rules
		</p>
	</div>

	<!-- Progress Steps -->
	<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
		<div class="flex items-center justify-between mb-8">
			{#each Array(totalSteps) as _, i}
				<div class="flex items-center flex-1">
					<div class="flex flex-col items-center">
						<div
							class="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
							{step > i + 1
								? 'bg-blue-600 border-blue-600'
								: step === i + 1
									? 'border-blue-600 text-blue-600'
									: 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'}"
						>
							{#if step > i + 1}
								<Check class="w-5 h-5 text-white" />
							{:else}
								<span class="text-sm font-semibold">{i + 1}</span>
							{/if}
						</div>
						<span class="mt-2 text-xs font-medium text-center {step >= i + 1 ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}">
							{stepNames[i]}
						</span>
					</div>
					{#if i < totalSteps - 1}
						<div
							class="flex-1 h-1 mx-4 rounded -mt-6
							{step > i + 1 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}"
						></div>
					{/if}
				</div>
			{/each}
		</div>

		{#if error}
			<div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}

		<!-- Step 1: Basic Information -->
		{#if step === 1}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Basic Information</h2>
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Project Name *
					</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="My Security Rules Project"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					/>
				</div>
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Description (optional)
					</label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="Describe this project..."
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					></textarea>
				</div>

				<!-- Sync Mode -->
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Sync Mode *
					</label>
					<div class="grid grid-cols-2 gap-3">
						<button
							type="button"
							on:click={() => syncMode = 'full'}
							class="flex flex-col items-start p-4 border-2 rounded-lg transition-colors
								{syncMode === 'full' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
						>
							<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Full Workflow</span>
							<span class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">Export to Git, create merge requests, and import to production</span>
						</button>
						<button
							type="button"
							on:click={() => syncMode = 'export_only'}
							class="flex flex-col items-start p-4 border-2 rounded-lg transition-colors
								{syncMode === 'export_only' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
						>
							<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Export Only</span>
							<span class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">Only export rules from Elastic to Git (one-way sync)</span>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 2: Connections -->
		{#if step === 2}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Connections</h2>
				<p class="text-sm text-gray-500 dark:text-gray-400">Select the Elastic instance and Git repository for this project.</p>

				{#if elasticInstances.length === 0}
					<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p class="text-sm text-yellow-800">
							No Elastic instances configured. Please add one in settings first.
						</p>
						<a href="/settings/elastic" class="text-sm text-blue-600 hover:underline mt-2 inline-block">
							Add Elastic Instance
						</a>
					</div>
				{:else}
					<div>
						<label for="elastic-instance" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Elastic Instance *
						</label>
						<select
							id="elastic-instance"
							bind:value={elasticInstanceId}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						>
							<option value="">Select instance...</option>
							{#each elasticInstances as instance}
								<option value={instance.id}>{instance.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				{#if gitRepositories.length === 0}
					<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p class="text-sm text-yellow-800">
							No Git repositories configured. Please add one in settings first.
						</p>
						<a href="/settings/git" class="text-sm text-blue-600 hover:underline mt-2 inline-block">
							Add Git Repository
						</a>
					</div>
				{:else}
					<div>
						<label for="git-repo" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Git Repository *
						</label>
						<select
							id="git-repo"
							bind:value={gitRepositoryId}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						>
							<option value="">Select repository...</option>
							{#each gitRepositories as repo}
								<option value={repo.id}>{repo.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="git-path" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Base Path in Repository (optional)
						</label>
						<input
							id="git-path"
							type="text"
							bind:value={gitPath}
							placeholder="detection-rules/"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Base directory for rules. Environments will have subdirectories.
						</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Step 3: Test / Export Environment -->
		{#if step === 3}
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-yellow-100 rounded-lg">
						<TestTube class="w-6 h-6 text-yellow-600" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
							{syncMode === 'export_only' ? 'Environment' : 'Test Environment'}
						</h2>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{syncMode === 'export_only'
								? 'Configure the Elastic space and Git branch for exporting rules'
								: 'Configure the development/test environment'}
						</p>
					</div>
				</div>

				<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
					<p class="text-sm text-yellow-800">
						{#if syncMode === 'export_only'}
							Rules will be exported from this Elastic space to the <strong>{testBranch || 'develop'}</strong> branch in Git.
						{:else}
							Rules synced here will be saved to the <strong>{testBranch || 'develop'}</strong> branch.
							Use this for testing new rules before promoting to production.
						{/if}
					</p>
				</div>

				<div>
					<label for="test-space" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Elastic Space (Test) *
					</label>
					{#if availableSpaces.length > 0}
						<select
							id="test-space"
							bind:value={testSpace}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						/>
					{/if}
				</div>

				<div>
					<label for="test-branch" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Git Branch (Test) *
					</label>
					<input
						id="test-branch"
						type="text"
						bind:value={testBranch}
						placeholder="develop"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Branch where test rules will be synced (e.g., develop, staging)
					</p>
				</div>
			</div>
		{/if}

		<!-- Step 4: Prod Environment (full mode only) -->
		{#if step === 4 && syncMode === 'full'}
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-green-100 rounded-lg">
						<Rocket class="w-6 h-6 text-green-600" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Production Environment</h2>
						<p class="text-sm text-gray-500 dark:text-gray-400">Configure the production environment</p>
					</div>
				</div>

				<div class="bg-green-50 border border-green-200 rounded-lg p-4">
					<p class="text-sm text-green-800">
						Rules synced here will be saved to the <strong>{prodBranch || 'main'}</strong> branch.
						Changes require a Merge Request from <strong>{testBranch || 'develop'}</strong>.
					</p>
				</div>

				<div>
					<label for="prod-space" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Elastic Space (Production) *
					</label>
					{#if availableSpaces.length > 0}
						<select
							id="prod-space"
							bind:value={prodSpace}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
						/>
					{/if}
				</div>

				<div>
					<label for="prod-branch" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Git Branch (Production) *
					</label>
					<input
						id="prod-branch"
						type="text"
						bind:value={prodBranch}
						placeholder="main"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Protected branch for production rules (e.g., main, master)
					</p>
				</div>
			</div>
		{/if}

		<!-- Navigation -->
		<div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
			<button
				on:click={prevStep}
				disabled={step === 1}
				class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<ArrowLeft class="w-4 h-4" />
				Previous
			</button>

			{#if step < totalSteps}
				<button
					on:click={nextStep}
					disabled={!canProceed(step)}
					class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Next
					<ArrowRight class="w-4 h-4" />
				</button>
			{:else}
				<button
					on:click={createProject}
					disabled={loading || !canProceed(step)}
					class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if loading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					{:else}
						<Check class="w-4 h-4" />
					{/if}
					Create Project
				</button>
			{/if}
		</div>
	</div>
</div>
