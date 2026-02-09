<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Home, Settings, FolderGit2, History, LogOut, User, ClipboardCheck, Sun, Moon, Monitor, ScrollText } from 'lucide-svelte';
	import NotificationPanel from '$lib/components/NotificationPanel.svelte';
	import { themeMode, toggleTheme, initTheme } from '$lib/stores/theme';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	const navigation = [
		{ name: 'Dashboard', href: '/', icon: Home },
		{ name: 'Projects', href: '/projects', icon: FolderGit2 },
		{ name: 'Review', href: '/review', icon: ClipboardCheck },
		{ name: 'History', href: '/history', icon: History },
		{ name: 'Audit Log', href: '/audit', icon: ScrollText },
		{ name: 'Settings', href: '/settings', icon: Settings }
	];

	function handleLogout() {
		goto('/logout');
	}

	onMount(() => {
		initTheme();
	});

	$: isLoginPage = $page.url.pathname === '/login';
</script>

{#if isLoginPage}
	<!-- Login page without sidebar -->
	<slot />
{:else}
	<div class="min-h-screen bg-gray-50 dark:bg-gray-950">
		<!-- Sidebar -->
		<div class="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
			<div class="flex flex-col h-full">
				<!-- Logo -->
				<div class="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
					<div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
						<FolderGit2 class="w-6 h-6 text-white" />
					</div>
					<div>
						<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Elastic Git Sync</h1>
						<p class="text-xs text-gray-500 dark:text-gray-400">Security Rules Manager</p>
					</div>
				</div>

				<!-- Navigation -->
				<nav class="flex-1 px-4 py-4 space-y-1">
					{#each navigation as item}
						<a
							href={item.href}
							class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
								{$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/')
									? 'bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-900/30 dark:text-primary-400'
									: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'}"
						>
							<svelte:component this={item.icon} class="w-5 h-5 transition-transform duration-200" />
							{item.name}
						</a>
					{/each}
				</nav>

				<!-- User Section -->
				<div class="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
					<div class="flex items-center gap-3 px-3 py-2 mb-2">
						<div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
							<User class="w-4 h-4 text-gray-600 dark:text-gray-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
								{data.user?.email || 'User'}
							</p>
						</div>
					</div>
					<button
						onclick={handleLogout}
						class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
					>
						<LogOut class="w-4 h-4" />
						Sign Out
					</button>
				</div>

				<!-- Footer -->
				<div class="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
					<p class="text-xs text-gray-500 dark:text-gray-500">Version 1.0.0</p>
					<p class="text-xs text-gray-400 dark:text-gray-600 mt-1">By Cedric Selkmann</p>
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<div class="ml-64">
			<!-- Top Bar -->
			<div class="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-end px-8 py-3 gap-2">
					<!-- Theme Toggle -->
					<button
						onclick={toggleTheme}
						class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
						title="{$themeMode === 'light' ? 'Switch to dark mode' : $themeMode === 'dark' ? 'Switch to system mode' : 'Switch to light mode'}"
					>
						{#if $themeMode === 'dark'}
							<Sun class="w-5 h-5" />
						{:else if $themeMode === 'system'}
							<Monitor class="w-5 h-5" />
						{:else}
							<Moon class="w-5 h-5" />
						{/if}
					</button>
					<NotificationPanel />
				</div>
			</div>
			<main class="p-8">
				<slot />
			</main>
		</div>
	</div>
{/if}
