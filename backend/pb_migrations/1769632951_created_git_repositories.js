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
        "id": "text2001",
        "max": 255,
        "min": 1,
        "name": "name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "exceptDomains": null,
        "hidden": false,
        "id": "url2002",
        "name": "url",
        "onlyDomains": null,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "url"
      },
      {
        "hidden": false,
        "id": "select2003",
        "maxSelect": 1,
        "name": "provider",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "gitlab",
          "github",
          "generic"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": true,
        "id": "text2004",
        "max": 0,
        "min": 1,
        "name": "access_token",
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
        "id": "text2005",
        "max": 255,
        "min": 1,
        "name": "default_branch",
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
        "id": "text2006",
        "max": 500,
        "min": 0,
        "name": "base_path",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "bool2007",
        "name": "is_active",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "date2008",
        "max": "",
        "min": "",
        "name": "last_connection_test",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "select2009",
        "maxSelect": 1,
        "name": "connection_status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "unknown",
          "success",
          "failed"
        ]
      }
    ],
    "id": "pbc_2750346650",
    "indexes": [],
    "listRule": "",
    "name": "git_repositories",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2750346650");

  return app.delete(collection);
})
