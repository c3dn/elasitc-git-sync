/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Add missing created/updated autodate fields to all 4 new collections
  const collections = [
    "pending_changes",
    "rule_snapshots",
    "notifications",
    "webhook_configs"
  ];

  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name);
    const fields = collection.fields;

    // Check if created field already exists
    let hasCreated = false;
    let hasUpdated = false;
    for (const f of fields) {
      if (f.name === "created") hasCreated = true;
      if (f.name === "updated") hasUpdated = true;
    }

    if (!hasCreated) {
      fields.push(new Field({
        "hidden": false,
        "id": "autodate_created_" + name.substring(0, 6),
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }));
    }

    if (!hasUpdated) {
      fields.push(new Field({
        "hidden": false,
        "id": "autodate_updated_" + name.substring(0, 6),
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }));
    }

    collection.fields = fields;
    app.save(collection);
  }
}, (app) => {
  // Down migration: no-op (removing autodate fields would lose data)
})
