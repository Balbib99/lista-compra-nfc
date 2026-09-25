/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "items",
    fields: [
      {
        type: "text",
        name: "name",
        required: true,
        max: 200,
      },
      {
        type: "select",
        name: "importance",
        required: true,
        values: ["normal", "importante", "opcional"],
        maxSelect: 1,
      },
      {
        type: "file",
        name: "photo",
        required: false,
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      {
        type: "bool",
        name: "purchased",
      },
      {
        type: "text",
        name: "added_by",
        max: 60,
      },
      {
        type: "text",
        name: "list_id",
        required: true,
        max: 60,
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("items");
  return app.delete(collection);
});
