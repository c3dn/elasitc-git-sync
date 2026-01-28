/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2750346650")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "autodate2910",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "autodate2911",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2750346650")

  // remove field
  collection.fields.removeById("autodate2910")

  // remove field
  collection.fields.removeById("autodate2911")

  return app.save(collection)
})
