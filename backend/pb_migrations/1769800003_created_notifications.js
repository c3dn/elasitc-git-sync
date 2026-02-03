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
        "id": "text10001",
        "max": 255,
        "min": 1,
        "name": "title",
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
        "id": "text10002",
        "max": 2000,
        "min": 1,
        "name": "message",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select10003",
        "maxSelect": 1,
        "name": "type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "change_detected",
          "review_required",
          "change_approved",
          "change_rejected",
          "revert_failed",
          "sync_error"
        ]
      },
      {
        "hidden": false,
        "id": "select10004",
        "maxSelect": 1,
        "name": "severity",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "info",
          "warning",
          "error"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text10005",
        "max": 500,
        "min": 0,
        "name": "link",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "bool10006",
        "name": "read",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_484305853",
        "hidden": false,
        "id": "relation10007",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "project",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      }
    ],
    "id": "pbc_800000003",
    "indexes": [
      "CREATE INDEX idx_notification_read ON notifications (read)"
    ],
    "listRule": "",
    "name": "notifications",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_800000003");

  return app.delete(collection);
})
