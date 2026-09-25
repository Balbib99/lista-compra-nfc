/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("items");

  collection.fields.add(
    new TextField({
      name: "comment",
      required: false,
      max: 300,
    }),
  );

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("items");
  collection.fields.removeByName("comment");
  return app.save(collection);
});
