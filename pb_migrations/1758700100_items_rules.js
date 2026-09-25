/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("items");

  // El list_id es la única "contraseña": sin él (o con uno incorrecto)
  // como parámetro de consulta, la API no devuelve ni modifica nada.
  collection.listRule = "list_id != \"\" && list_id = @request.query.list_id";
  collection.viewRule = "list_id != \"\" && list_id = @request.query.list_id";
  collection.createRule = "@request.body.list_id != \"\" && @request.body.name != \"\"";
  collection.updateRule = "list_id != \"\" && list_id = @request.query.list_id";
  collection.deleteRule = "list_id != \"\" && list_id = @request.query.list_id";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("items");

  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  return app.save(collection);
});
