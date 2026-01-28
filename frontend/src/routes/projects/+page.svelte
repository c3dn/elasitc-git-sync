<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { Plus, Play, Settings, Trash2, TestTube, Rocket, GitBranch, Database } from 'lucide-svelte';
	import type { ProjectExpanded, Environment } from '$types';

	interface ProjectWithEnvs extends ProjectExpanded {
		environments?: Environment[];
	}

	let projects: ProjectWithEnvs[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadProjects();
	});

	async function loadProjects() {
		try {
			loading = true;
			const projectList = await pb.collection('projects').getFullList({
				expand: 'elastic_instance,git_repository',
				sort: '-created'
			});

			// Load environments for each project
			const projectsWithEnvs: ProjectWithEnvs[] = [];
			for (const project of projectList) {
				try {
					const envs = await pb.collection('environments').getFullList({
						filter: `project = "${project.id}"`
					});
					projectsWithEnvs.push({ ...project, environments: envs });
				} catch {
					projectsWithEnvs.push({ ...project, environments: [] });
				}
			}
			projects = projectsWithEnvs;
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function getTestEnv(project: ProjectWithEnvs): Environment | undefined {
		return project.environments?.find(e => e.name === 'test');
	}

	function getProdEnv(project: ProjectWithEnvs): Environment | undefined {
		return project.environments?.find(e => e.name === 'production');
	}

	async function deleteProject(id: string) {
		if (!confirm('Are you sure you want to delete this project and all its environments?')) return;

		try {
			// Delete environments first
			const envs = await pb.collection('environments').getFullList({
				filter: `project = "${id}"`
			});
			for (const env of envs) {
				await pb.collection('environments').delete(env.id);
			}
			await pb.collection('projects').delete(id);
			await loadProjects();
		} catch (err: any) {
			alert(`Error: ${err.message}`);
		}
	}
</script>

<svelte:head>
	<title>Projects - Elastic Git Sync</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between animate-fade-in">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Projects</h1>
			<p class="mt-1 text-sm text-gray-500">
				Manage your Elastic Security rule sync projects
			</p>
		</div>
		<a
			href="/projects/new"
			class="btn inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md transition-all"
		>
			<Plus class="w-5 h-5" />
			New Project
		</a>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{:else if projects.length === 0}
		<div class="card p-12 text-center animate-fade-in">
			<div class="mb-4">
				<Database class="w-12 h-12 text-gray-400 mx-auto" />
			</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
			<p class="text-gray-500 mb-6">Create your first project to start syncing Elastic Security rules with Git.</p>
			<a
				href="/projects/new"
				class="btn inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md transition-all"
			>
				<Plus class="w-5 h-5" />
				Create Project
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{#each projects as project, index}
				<div class="card overflow-hidden animate-fade-in" style="animation-delay: {index * 50}ms; opacity: 0;">
					<!-- Header -->
					<div class="p-6 border-b border-gray-100">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<a href="/projects/{project.id}" class="text-lg font-semibold text-gray-900 hover:text-blue-600">
									{project.name}
								</a>
								{#if project.description}
									<p class="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
								{/if}
							</div>
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
								{project.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}"
							>
								{project.is_active ? 'Active' : 'Inactive'}
							</span>
						</div>
					</div>

					<!-- Environments -->
					<div class="px-6 py-4 bg-gray-50">
						<div class="grid grid-cols-2 gap-4">
							<!-- Test Environment -->
							{#if getTestEnv(project)}
								{@const testEnv = getTestEnv(project)}
								<div class="flex items-start gap-2">
									<div class="p-1.5 bg-yellow-100 rounded">
										<TestTube class="w-4 h-4 text-yellow-600" />
									</div>
									<div class="min-w-0">
										<div class="text-xs font-medium text-gray-700">Test</div>
										<div class="text-xs text-gray-500 truncate">{testEnv?.elastic_space}</div>
										<div class="text-xs text-gray-400 flex items-center gap-1">
											<GitBranch class="w-3 h-3" />
											{testEnv?.git_branch}
										</div>
									</div>
								</div>
							{:else}
								<div class="flex items-center gap-2 text-gray-400">
									<TestTube class="w-4 h-4" />
									<span class="text-xs">No test env</span>
								</div>
							{/if}

							<!-- Production Environment -->
							{#if getProdEnv(project)}
								{@const prodEnv = getProdEnv(project)}
								<div class="flex items-start gap-2">
									<div class="p-1.5 bg-green-100 rounded">
										<Rocket class="w-4 h-4 text-green-600" />
									</div>
									<div class="min-w-0">
										<div class="text-xs font-medium text-gray-700">Production</div>
										<div class="text-xs text-gray-500 truncate">{prodEnv?.elastic_space}</div>
										<div class="text-xs text-gray-400 flex items-center gap-1">
											<GitBranch class="w-3 h-3" />
											{prodEnv?.git_branch}
										</div>
									</div>
								</div>
							{:else}
								<div class="flex items-center gap-2 text-gray-400">
									<Rocket class="w-4 h-4" />
									<span class="text-xs">No prod env</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Connection Info -->
					<div class="px-6 py-3 text-xs text-gray-500 border-t border-gray-100">
						<div class="flex items-center justify-between">
							<span>
								<strong>Elastic:</strong> {project.expand?.elastic_instance?.name || 'Unknown'}
							</span>
							<span>
								<strong>Git:</strong> {project.expand?.git_repository?.name || 'Unknown'}
							</span>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex items-center gap-2 p-4 border-t border-gray-200 bg-white">
						<a
							href="/projects/{project.id}"
							class="btn flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md transition-all text-sm"
						>
							<Settings class="w-4 h-4" />
							Manage
						</a>
						<button
							on:click={() => deleteProject(project.id)}
							class="btn flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all text-sm"
						>
							<Trash2 class="w-4 h-4" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
