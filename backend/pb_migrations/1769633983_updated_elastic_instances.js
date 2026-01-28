/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4067523908")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "autodate1910",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "autodate1911",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4067523908")

  // remove field
  collection.fields.removeById("autodate1910")

  // remove field
  collection.fields.removeById("autodate1911")

  return app.save(collection)
})
