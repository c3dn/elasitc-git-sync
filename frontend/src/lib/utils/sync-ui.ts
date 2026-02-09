import type { SyncJob } from '$types';

export type SyncSummaryData = Record<string, unknown>;
export type UnifiedSyncUiState = 'success' | 'partial' | 'failed' | 'in_progress' | 'queued' | 'conflict';

type SyncLike = Pick<SyncJob, 'status' | 'direction' | 'error_message'> & {
	changes_summary?: unknown;
};

export function parseSyncSummary(rawSummary: unknown): SyncSummaryData {
	if (!rawSummary) return {};
	if (typeof rawSummary === 'string') {
		try {
			const parsed = JSON.parse(rawSummary);
			return parsed && typeof parsed === 'object' ? (parsed as SyncSummaryData) : {};
		} catch {
			return {};
		}
	}
	return typeof rawSummary === 'object' ? (rawSummary as SyncSummaryData) : {};
}

export function asCount(value: unknown): number {
	const num = Number(value);
	return Number.isFinite(num) && num > 0 ? num : 0;
}

export function getSummaryWarningCount(summary: SyncSummaryData): number {
	return asCount(summary.import_errors) + asCount(summary.delete_errors) + asCount(summary.errors);
}

export function isExportDirection(direction: SyncJob['direction']): boolean {
	return direction === 'elastic_to_git' || direction === 'bidirectional';
}

export function isImportDirection(direction: SyncJob['direction']): boolean {
	return direction === 'git_to_elastic' || direction === 'bidirectional';
}

export function getUnifiedSyncUiState(job: SyncLike): UnifiedSyncUiState {
	if (job.status === 'running') return 'in_progress';
	if (job.status === 'pending') return 'queued';
	if (job.status === 'failed') return 'failed';
	if (job.status === 'conflict') return 'conflict';
	if (job.status === 'completed') {
		const summary = parseSyncSummary(job.changes_summary);
		if (getSummaryWarningCount(summary) > 0 || Boolean(job.error_message)) return 'partial';
		return 'success';
	}
	return 'queued';
}

export function getUnifiedSyncLabel(job: SyncLike): string {
	const state = getUnifiedSyncUiState(job);
	switch (state) {
		case 'success':
			return 'Success';
		case 'partial':
			return 'Partial Success';
		case 'failed':
			return 'Failed';
		case 'in_progress':
			return 'In Progress';
		case 'queued':
			return 'Queued';
		case 'conflict':
			return 'Conflict';
		default:
			return 'Queued';
	}
}

export function getUnifiedSyncBadgeClasses(job: SyncLike): string {
	const state = getUnifiedSyncUiState(job);
	switch (state) {
		case 'success':
			return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
		case 'partial':
			return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
		case 'failed':
			return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
		case 'in_progress':
			return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
		case 'conflict':
			return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
		default:
			return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
	}
}

export function getDirectionLabel(direction: SyncJob['direction']): string {
	if (direction === 'elastic_to_git') return 'Elastic -> Git';
	if (direction === 'git_to_elastic') return 'Git -> Elastic';
	return 'Bidirectional';
}

export function formatSyncSummary(job: SyncLike, summaryInput?: SyncSummaryData): string {
	const summary = summaryInput || parseSyncSummary(job.changes_summary);
	const parts: string[] = [];
	const changesDetected = asCount(summary.changes_detected);
	const pendingCreated = asCount(summary.pending_created);
	const pendingUpdated = asCount(summary.pending_updated);
	const exported = asCount(summary.exported);
	const imported = asCount(summary.imported);
	const deleted = asCount(summary.deleted);
	const warningCount = getSummaryWarningCount(summary);

	if (changesDetected > 0) {
		parts.push(`${changesDetected} ${changesDetected === 1 ? 'change' : 'changes'} detected`);
	}
	if (pendingCreated > 0) {
		parts.push(`${pendingCreated} pending review`);
	}
	if (pendingUpdated > 0) {
		parts.push(`${pendingUpdated} review item${pendingUpdated === 1 ? '' : 's'} updated`);
	}
	if (exported > 0) {
		parts.push(`${exported} exported`);
	}
	if (imported > 0) {
		parts.push(`${imported} imported`);
	}
	if (deleted > 0) {
		parts.push(`${deleted} deleted`);
	}
	if (warningCount > 0) {
		parts.push(`${warningCount} ${warningCount === 1 ? 'warning' : 'warnings'}`);
	}

	if (parts.length === 0) {
		if (job.status === 'failed') return 'Sync failed before processing finished';
		if (job.status === 'running') return 'Sync in progress';
		return 'No changes';
	}

	return parts.join(', ');
}
