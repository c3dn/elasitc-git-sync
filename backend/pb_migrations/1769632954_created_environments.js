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
        "id": "relation4001",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "project",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select4002",
        "maxSelect": 1,
        "name": "name",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "test",
          "staging",
          "production"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text4003",
        "max": 255,
        "min": 1,
        "name": "elastic_space",
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
        "id": "text4004",
        "max": 255,
        "min": 1,
        "name": "git_branch",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "bool4005",
        "name": "requires_approval",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "bool4006",
        "name": "auto_deploy",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      }
    ],
    "id": "pbc_2578508855",
    "indexes": [],
    "listRule": "",
    "name": "environments",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2578508855");

  return app.delete(collection);
})
