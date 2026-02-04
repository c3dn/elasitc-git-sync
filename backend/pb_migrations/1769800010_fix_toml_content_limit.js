/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Fix: max=0 defaulted to 5000 in PocketBase. Set to 5000000 (5MB) explicitly.
  const pending = app.findCollectionByNameOrId("pending_changes");
  const pendingField = pending.fields.find(f => f.name === "toml_content");
  if (pendingField) {
    pendingField.max = 5000000;
  }
  app.save(pending);

  const snapshots = app.findCollectionByNameOrId("rule_snapshots");
  const snapshotField = snapshots.fields.find(f => f.name === "toml_content");
  if (snapshotField) {
    snapshotField.max = 5000000;
  }
  app.save(snapshots);
}, (app) => {
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
