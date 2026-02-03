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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9001",
        "max": 255,
        "min": 1,
        "name": "user",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select9002",
        "maxSelect": 1,
        "name": "action",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "sync_triggered",
          "rule_approved",
          "rule_rejected",
          "bulk_approved",
          "bulk_rejected",
          "mr_created",
          "baseline_initialized",
          "change_detected"
        ]
      },
      {
        "hidden": false,
        "id": "select9003",
        "maxSelect": 1,
        "name": "resource_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "rule",
          "project",
          "sync_job",
          "webhook",
          "settings",
          "baseline"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9004",
        "max": 255,
        "min": 0,
        "name": "resource_id",
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
        "id": "text9005",
        "max": 500,
        "min": 0,
        "name": "resource_name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_484305853",
        "hidden": false,
        "id": "relation9006",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "project",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "json9007",
        "maxSize": 0,
        "name": "details",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "select9008",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "success",
          "error"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9009",
        "max": 2000,
        "min": 0,
        "name": "error_message",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate9010",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate9011",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_800000007",
    "indexes": [
      "CREATE INDEX idx_audit_action ON audit_logs (action)",
      "CREATE INDEX idx_audit_user ON audit_logs (user)",
      "CREATE INDEX idx_audit_project ON audit_logs (project)",
      "CREATE INDEX idx_audit_created ON audit_logs (created)"
    ],
    "listRule": "",
    "name": "audit_logs",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_800000007");

  return app.delete(collection);
})
