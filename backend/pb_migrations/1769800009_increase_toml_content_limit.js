/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Increase toml_content limit on pending_changes (was 50000, now unlimited)
  const pending = app.findCollectionByNameOrId("pending_changes");
  const pendingField = pending.fields.find(f => f.name === "toml_content");
  if (pendingField) {
    pendingField.max = 0;
  }
  app.save(pending);

  // Increase toml_content limit on rule_snapshots (was 50000, now unlimited)
  const snapshots = app.findCollectionByNameOrId("rule_snapshots");
  const snapshotField = snapshots.fields.find(f => f.name === "toml_content");
  if (snapshotField) {
    snapshotField.max = 0;
  }
  app.save(snapshots);
}, (app) => {
  // Revert: set toml_content back to 50000 on both collections
  const pending = app.findCollectionByNameOrId("pending_changes");
  const pendingField = pending.fields.find(f => f.name === "toml_content");
  if (pendingField) {
    pendingField.max = 50000;
  }
  app.save(pending);

  const snapshots = app.findCollectionByNameOrId("rule_snapshots");
  const snapshotField = snapshots.fields.find(f => f.name === "toml_content");
  if (snapshotField) {
    snapshotField.max = 50000;
  }
  app.save(snapshots);
})
