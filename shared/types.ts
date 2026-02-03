/**
 * Shared TypeScript types for Elastic Git Sync
 * Used across frontend and backend
 */

// ============================================================================
// Database Models (matching PocketBase schema)
// ============================================================================

export interface ElasticInstance {
  id: string;
  name: string;
  url: string;
  api_key: string;
  spaces?: string[];
  is_active: boolean;
  last_connection_test?: string;
  connection_status?: 'unknown' | 'success' | 'failed';
  created: string;
  updated: string;
}

export interface GitRepository {
  id: string;
  name: string;
  url: string;
  provider: 'gitlab' | 'github' | 'generic';
  access_token: string;
  default_branch: string;
  base_path?: string;
  is_active: boolean;
  last_connection_test?: string;
  connection_status?: 'unknown' | 'success' | 'failed';
  created: string;
  updated: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  elastic_instance: string; // relation ID
  elastic_space: string;
  git_repository: string; // relation ID
  git_path?: string;
  is_active: boolean;
  sync_enabled: boolean;
  auto_sync_interval?: number;
  sync_mode?: 'full' | 'export_only';
  created: string;
  updated: string;
}

export interface Environment {
  id: string;
  project: string; // relation ID
  name: 'test' | 'staging' | 'production';
  elastic_space: string;
  git_branch: string;
  requires_approval: boolean;
  auto_deploy: boolean;
  created: string;
  updated: string;
}

export interface SyncJob {
  id: string;
  project: string; // relation ID
  environment?: string; // relation ID
  type: 'manual' | 'scheduled' | 'webhook';
  direction: 'elastic_to_git' | 'git_to_elastic' | 'bidirectional';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'conflict';
  started_at?: string;
  completed_at?: string;
  triggered_by?: string;
  changes_summary?: ChangeSummary;
  error_message?: string;
  git_commit_sha?: string;
  merge_request_url?: string;
  created: string;
  updated: string;
}

export interface RuleCache {
  id: string;
  project: string; // relation ID
  rule_id: string;
  rule_name: string;
  rule_type?: string;
  enabled: boolean;
  elastic_hash?: string;
  git_hash?: string;
  last_sync?: string;
  sync_status?: 'synced' | 'modified_elastic' | 'modified_git' | 'conflict' | 'new_elastic' | 'new_git';
  file_path?: string;
  created: string;
  updated: string;
}

export interface Conflict {
  id: string;
  sync_job: string; // relation ID
  rule_id: string;
  rule_name: string;
  elastic_version: any; // JSON
  git_version: any; // JSON
  resolution?: 'pending' | 'use_elastic' | 'use_git' | 'manual_merge';
  resolved_at?: string;
  resolved_by?: string;
  created: string;
  updated: string;
}

// ============================================================================
// Expanded Models (with relations populated)
// ============================================================================

export interface ProjectExpanded extends Project {
  expand?: {
    elastic_instance?: ElasticInstance;
    git_repository?: GitRepository;
  };
}

export interface SyncJobExpanded extends SyncJob {
  expand?: {
    project?: ProjectExpanded;
    environment?: Environment;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ConnectionTestRequest {
  type: 'elastic' | 'git';
  config: Partial<ElasticInstance> | Partial<GitRepository>;
}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  spaces?: string[]; // For Elastic
  branches?: string[]; // For Git
}

export interface SyncRequest {
  project_id: string;
  environment_id?: string;
  direction: 'elastic_to_git' | 'git_to_elastic' | 'bidirectional';
  rule_ids?: string[]; // optional: selective export (null/undefined = export all)
  create_merge_request?: boolean;
  merge_request_title?: string;
  merge_request_description?: string;
  target_branch?: string;
}

export interface SyncResponse {
  success: boolean;
  sync_job_id: string;
  message: string;
}

export interface ChangeSummary {
  added: number;
  modified: number;
  deleted: number;
  conflicts: number;
  total: number;
  details?: ChangeDetail[];
}

export interface ChangeDetail {
  rule_id: string;
  rule_name: string;
  change_type: 'added' | 'modified' | 'deleted' | 'conflict';
  source: 'elastic' | 'git';
  file_path?: string;
}

export interface ConflictResolutionRequest {
  conflict_id: string;
  resolution: 'use_elastic' | 'use_git' | 'manual_merge';
  merged_content?: any; // For manual merge
}

export interface MergeRequestRequest {
  project_id: string;
  source_branch: string;
  target_branch: string;
  title: string;
  description?: string;
  rules_changed: string[]; // rule IDs
}

export interface MergeRequestResponse {
  success: boolean;
  merge_request_url?: string;
  merge_request_id?: string;
  message: string;
}

// ============================================================================
// Elastic Security Rule Types
// ============================================================================

export interface ElasticRuleSummary {
  rule_id: string;
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  type: string;
  tags: string[];
  enabled: boolean;
}

export interface ElasticSecurityRule {
  id: string;
  rule_id: string;
  name: string;
  description?: string;
  enabled: boolean;
  risk_score?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: 'query' | 'eql' | 'threshold' | 'machine_learning' | 'new_terms';
  query?: string;
  language?: string;
  index?: string[];
  filters?: any[];
  threat?: any[];
  references?: string[];
  author?: string[];
  license?: string;
  tags?: string[];
  version?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  [key: string]: any; // Allow additional fields
}

// ============================================================================
// Git Types
// ============================================================================

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url?: string;
}

export interface GitBranch {
  name: string;
  commit_sha: string;
  protected: boolean;
}

export interface GitMergeRequest {
  id: string;
  iid: number;
  title: string;
  description?: string;
  state: 'opened' | 'closed' | 'merged';
  web_url: string;
  source_branch: string;
  target_branch: string;
  author?: string;
  created_at: string;
  updated_at: string;
  merged_at?: string;
}

// ============================================================================
// Dashboard/UI Types
// ============================================================================

export interface DashboardStats {
  total_projects: number;
  active_syncs: number;
  pending_conflicts: number;
  recent_syncs: SyncJobExpanded[];
  sync_success_rate: number;
}

export interface RuleDiff {
  rule_id: string;
  rule_name: string;
  change_type: 'added' | 'modified' | 'deleted';
  elastic_version?: ElasticSecurityRule;
  git_version?: ElasticSecurityRule;
  diff?: DiffLine[];
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  line_number_old?: number;
  line_number_new?: number;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SyncDirection = 'elastic_to_git' | 'git_to_elastic' | 'bidirectional';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed' | 'conflict';
export type SyncMode = 'full' | 'export_only';
export type ConflictResolution = 'pending' | 'use_elastic' | 'use_git' | 'manual_merge';
export type EnvironmentName = 'test' | 'staging' | 'production';

// ============================================================================
// Form Types (for UI)
// ============================================================================

export interface ElasticInstanceForm {
  name: string;
  url: string;
  api_key: string;
  is_active: boolean;
}

export interface GitRepositoryForm {
  name: string;
  url: string;
  provider: 'gitlab' | 'github' | 'generic';
  access_token: string;
  default_branch: string;
  base_path?: string;
  is_active: boolean;
}

export interface ProjectForm {
  name: string;
  description?: string;
  elastic_instance: string;
  elastic_space: string;
  git_repository: string;
  git_path?: string;
  is_active: boolean;
  sync_enabled: boolean;
  auto_sync_interval?: number;
  sync_mode?: 'full' | 'export_only';
}

export interface EnvironmentForm {
  project: string;
  name: EnvironmentName;
  elastic_space: string;
  git_branch: string;
  requires_approval: boolean;
  auto_deploy: boolean;
}

// ============================================================================
// Review & Change Detection Types
// ============================================================================

export type ChangeType =
  | 'new_rule'
  | 'modified_rule'
  | 'deleted_rule'
  | 'rule_enabled'
  | 'rule_disabled'
  | 'exception_added'
  | 'exception_removed'
  | 'exception_modified'
  | 'severity_changed'
  | 'tags_changed'
  | 'query_changed';

export type PendingChangeStatus = 'pending' | 'approved' | 'rejected';

export interface PendingChange {
  id: string;
  project: string;
  environment?: string;
  detection_batch: string;
  rule_id: string;
  rule_name: string;
  change_type: ChangeType;
  previous_state?: any;
  current_state?: any;
  diff_summary?: string;
  toml_content?: string;
  status: PendingChangeStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  reverted?: boolean;
  created: string;
  updated: string;
}

export interface PendingChangeExpanded extends PendingChange {
  expand?: {
    project?: Project;
    environment?: Environment;
  };
}

export interface RuleSnapshot {
  id: string;
  project: string;
  environment?: string;
  rule_id: string;
  rule_name: string;
  rule_hash?: string;
  rule_content: any;
  toml_content?: string;
  exceptions?: any;
  enabled?: boolean;
  severity?: string;
  tags?: string[];
  last_approved_at?: string;
  created: string;
  updated: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType =
  | 'change_detected'
  | 'review_required'
  | 'change_approved'
  | 'change_rejected'
  | 'revert_failed'
  | 'sync_error';

export type NotificationSeverity = 'info' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  link?: string;
  read: boolean;
  project?: string;
  created: string;
  updated: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  is_active: boolean;
  last_triggered?: string;
  last_status?: 'success' | 'failed' | 'unknown';
  headers?: Record<string, string>;
  created: string;
  updated: string;
}

export interface WebhookConfigForm {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  is_active: boolean;
  headers?: Record<string, string>;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  project: { id: string; name: string };
  summary: string;
  changes_count: number;
  review_url: string;
  changes: { rule_name: string; change_type: string }[];
}

// ============================================================================
// Review API Types
// ============================================================================

export interface ReviewRequest {
  change_id: string;
  reviewed_by?: string;
}

export interface BulkReviewRequest {
  batch_id?: string;
  change_ids?: string[];
  reviewed_by?: string;
}

export interface ReviewResponse {
  success: boolean;
  message: string;
  git_commit_sha?: string;
  revert_result?: { success: boolean; message: string };
}

// ============================================================================
// Extended Dashboard Types
// ============================================================================

export interface RecentChange {
  id: string;
  rule_name: string;
  change_type: ChangeType;
  diff_summary?: string;
  status: PendingChangeStatus;
  project_name: string;
  created: string;
}

export interface LastSyncInfo {
  id: string;
  status: string;
  completed_at: string;
  started_at: string;
  project_name: string;
  direction: string;
  error_message?: string;
}

export interface ExtendedDashboardStats extends DashboardStats {
  total_rules?: number;
  enabled_rules?: number;
  disabled_rules?: number;
  tracked_rules?: number;
  pending_reviews?: number;
  unread_notifications?: number;
  recent_changes?: RecentChange[];
  last_sync?: LastSyncInfo | null;
}

// ============================================================================
// Audit Log Types
// ============================================================================

export type AuditAction =
  | 'sync_triggered'
  | 'rule_approved'
  | 'rule_rejected'
  | 'bulk_approved'
  | 'bulk_rejected'
  | 'mr_created'
  | 'baseline_initialized'
  | 'change_detected';

export interface AuditLog {
  id: string;
  user: string;
  action: AuditAction;
  resource_type: 'rule' | 'project' | 'sync_job' | 'webhook' | 'settings' | 'baseline';
  resource_id: string;
  resource_name: string;
  project?: string;
  project_name?: string;
  details?: any;
  status: 'success' | 'error';
  error_message?: string;
  created: string;
  updated: string;
}
