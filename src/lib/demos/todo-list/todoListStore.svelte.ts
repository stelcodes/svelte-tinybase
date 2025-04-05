import { createStore } from "tinybase/with-schemas";
import { createIndexedDbPersister } from "tinybase/persisters/persister-indexed-db/with-schemas";

export const todoListStore = createStore().setTablesSchema({
  tasks: {
    title: {
      type: "string",
    },
    completed: {
      type: "boolean",
      default: false,
    },
  },
});

const persister = createIndexedDbPersister(todoListStore, "todoListStore");

persister.startAutoLoad();
persister.startAutoSave();

export function destroy() {
  persister.stopAutoLoad();
  persister.stopAutoSave();
}
