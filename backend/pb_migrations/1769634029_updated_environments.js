/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2578508855")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "autodate9910",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "autodate9911",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2578508855")

  // remove field
  collection.fields.removeById("autodate9910")

  // remove field
  collection.fields.removeById("autodate9911")

  return app.save(collection)
})
