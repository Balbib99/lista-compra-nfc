/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("items");

  collection.fields.add(
    new TextField({
      name: "quantity",
      required: false,
      max: 30,
    }),
  );

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("items");
  collection.fields.removeByName("quantity");
  return app.save(collection);
});
