/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_484305853",
        "hidden": false,
        "id": "relation8001",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "project",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_2578508855",
        "hidden": false,
        "id": "relation8002",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "environment",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text8003",
        "max": 255,
        "min": 1,
        "name": "detection_batch",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text8004",
        "max": 255,
        "min": 1,
        "name": "rule_id",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text8005",
        "max": 500,
        "min": 1,
        "name": "rule_name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select8006",
        "maxSelect": 1,
        "name": "change_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "new_rule",
          "modified_rule",
          "deleted_rule",
          "rule_enabled",
          "rule_disabled",
          "exception_added",
          "exception_removed",
          "exception_modified",
          "severity_changed",
          "tags_changed",
          "query_changed"
        ]
      },
      {
        "hidden": false,
        "id": "json8007",
        "maxSize": 0,
        "name": "previous_state",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "json8008",
        "maxSize": 0,
        "name": "current_state",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text8009",
        "max": 2000,
        "min": 0,
        "name": "diff_summary",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text8010",
        "max": 50000,
        "min": 0,
        "name": "toml_content",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select8011",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "pending",
          "approved",
          "rejected"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text8012",
        "max": 255,
        "min": 0,
        "name": "reviewed_by",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date8013",
        "max": "",
        "min": "",
        "name": "reviewed_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "bool8014",
        "name": "reverted",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      }
    ],
    "id": "pbc_800000001",
    "indexes": [
      "CREATE INDEX idx_pending_status ON pending_changes (status)",
      "CREATE INDEX idx_pending_batch ON pending_changes (detection_batch)",
      "CREATE INDEX idx_pending_project ON pending_changes (project)"
    ],
    "listRule": "",
    "name": "pending_changes",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_800000001");

  return app.delete(collection);
})
