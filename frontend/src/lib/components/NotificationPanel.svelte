<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { pb, apiFetch } from '$lib/pocketbase';
	import { Bell, CheckCheck, AlertTriangle, Info, XCircle, ExternalLink } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import type { AppNotification } from '$types';

	let notifications: AppNotification[] = [];
	let unreadCount = 0;
	let isOpen = false;
	let loading = false;
	let pollInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		loadNotifications();
		pollInterval = setInterval(loadNotifications, 30000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	async function loadNotifications() {
		try {
			const resp = await apiFetch(`${pb.baseUrl}/api/notifications?limit=20`);
			if (resp.ok) {
				const data = await resp.json();
				notifications = data.notifications || [];
				unreadCount = data.unread_count || 0;
			}
		} catch (err) {}
	}

	async function markAsRead(id: string) {
		try {
			await apiFetch(`${pb.baseUrl}/api/notifications/read`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [id] })
			});
			const notif = notifications.find((n) => n.id === id);
			if (notif) {
				notif.read = true;
				notifications = notifications;
				unreadCount = Math.max(0, unreadCount - 1);
			}
		} catch (err) {}
	}

	async function markAllAsRead() {
		try {
			await apiFetch(`${pb.baseUrl}/api/notifications/read-all`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			notifications = notifications.map((n) => ({ ...n, read: true }));
			unreadCount = 0;
		} catch (err) {}
	}

	function toggle() {
		isOpen = !isOpen;
		if (isOpen) loadNotifications();
	}

	function close() {
		isOpen = false;
	}

	function getSeverityIcon(severity: string) {
		if (severity === 'error') return XCircle;
		if (severity === 'warning') return AlertTriangle;
		return Info;
	}

	function getSeverityColor(severity: string) {
		if (severity === 'error') return 'text-red-500';
		if (severity === 'warning') return 'text-yellow-500';
		return 'text-blue-500';
	}
</script>

<div class="relative">
	<!-- Bell Button -->
	<button
		onclick={toggle}
		class="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
	>
		<Bell class="w-5 h-5" />
		{#if unreadCount > 0}
			<span class="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
				{unreadCount > 99 ? '99+' : unreadCount}
			</span>
		{/if}
	</button>

	<!-- Dropdown Panel -->
	{#if isOpen}
		<!-- Backdrop -->
		<button class="fixed inset-0 z-40" onclick={close} aria-label="Close notifications"></button>

		<div class="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[70vh] flex flex-col">
			<!-- Header -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
				<h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">Notifications</h3>
				{#if unreadCount > 0}
					<button
						onclick={markAllAsRead}
						class="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
					>
						<CheckCheck class="w-3.5 h-3.5" />
						Mark all read
					</button>
				{/if}
			</div>

			<!-- Notification List -->
			<div class="overflow-y-auto flex-1">
				{#if notifications.length === 0}
					<div class="px-4 py-8 text-center">
						<Bell class="w-8 h-8 text-gray-300 dark:text-gray-500 mx-auto mb-2" />
						<p class="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
					</div>
				{:else}
					{#each notifications as notif (notif.id)}
						<button
							onclick={() => {
								if (!notif.read) markAsRead(notif.id);
								if (notif.link) {
									window.location.href = notif.link;
									close();
								}
							}}
							class="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
								{notif.read ? 'opacity-60' : ''}"
						>
							<div class="flex gap-3">
								<div class="flex-shrink-0 mt-0.5">
									<svelte:component
										this={getSeverityIcon(notif.severity)}
										class="w-4 h-4 {getSeverityColor(notif.severity)}"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate {notif.read ? '' : 'font-semibold'}">
											{notif.title}
										</p>
										{#if !notif.read}
											<span class="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></span>
										{/if}
									</div>
									<p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
									<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
										{formatDistanceToNow(new Date(notif.created), { addSuffix: true })}
									</p>
								</div>
								{#if notif.link}
									<ExternalLink class="w-3.5 h-3.5 text-gray-300 dark:text-gray-500 flex-shrink-0 mt-1" />
								{/if}
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
