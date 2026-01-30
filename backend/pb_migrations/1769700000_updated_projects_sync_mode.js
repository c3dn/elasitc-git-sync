/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("projects");

  collection.fields.push(new Field({
    "hidden": false,
    "id": "select3010",
    "maxSelect": 1,
    "name": "sync_mode",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["full", "export_only"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("projects");

  const field = collection.fields.find(f => f.name === "sync_mode");
  if (field) {
    collection.fields.splice(collection.fields.indexOf(field), 1);
  }

  return app.save(collection);
})
