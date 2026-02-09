/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const pending = app.findCollectionByNameOrId("pending_changes");
  const syncJobs = app.findCollectionByNameOrId("sync_jobs");

  const pendingIndex = "CREATE INDEX idx_pending_lookup ON pending_changes (project, environment, rule_id, status)";
  const runningIndex = "CREATE INDEX idx_sync_running_lookup ON sync_jobs (project, environment, status, created)";

  pending.indexes = pending.indexes || [];
  syncJobs.indexes = syncJobs.indexes || [];

  if (pending.indexes.indexOf(pendingIndex) === -1) {
    pending.indexes.push(pendingIndex);
  }
  if (syncJobs.indexes.indexOf(runningIndex) === -1) {
    syncJobs.indexes.push(runningIndex);
  }

  app.save(pending);
  return app.save(syncJobs);
}, (app) => {
  const pending = app.findCollectionByNameOrId("pending_changes");
  const syncJobs = app.findCollectionByNameOrId("sync_jobs");

  const pendingIndex = "CREATE INDEX idx_pending_lookup ON pending_changes (project, environment, rule_id, status)";
  const runningIndex = "CREATE INDEX idx_sync_running_lookup ON sync_jobs (project, environment, status, created)";

  pending.indexes = (pending.indexes || []).filter((idx) => idx !== pendingIndex);
  syncJobs.indexes = (syncJobs.indexes || []).filter((idx) => idx !== runningIndex);

  app.save(pending);
  return app.save(syncJobs);
})
