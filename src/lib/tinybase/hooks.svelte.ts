import type { Id, OptionalSchemas, Row, Store, Table, Tables } from "tinybase/with-schemas";
import type { CellIdFromSchema, TableIdFromSchema } from "./types.js";

/**
 * Creates a ProxyHandler for a TinyBase table that enables reactive updates
 * when table data is modified. This handler intercepts property access and
 * mutations to maintain synchronization with the store.
 *
 * @template T - The type of the store's schemas
 * @template TableId - The type of the table ID
 * @param store - The TinyBase store instance
 * @param tableId - The ID of the table to create a handler for
 * @returns A ProxyHandler that enables reactive table operations
 */
function createTableHandler<T extends OptionalSchemas, TableId extends TableIdFromSchema<T[0]>>(
  store: Store<T>,
  tableId: TableId,
): ProxyHandler<Table<T[0], TableId, false>> {
  return {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (!val) return val;

      // nested proxies :D
      const handler = createRowHandler(store, tableId, prop as Id);
      return new Proxy(val, handler);
    },
    set(_, prop, value) {
      if (typeof prop !== "string") {
        throw new Error("Table property must be a string");
      }

      store.setRow(tableId, prop, value);
      return true;
    },
  };
}

/**
 * Creates a ProxyHandler for a TinyBase row that enables reactive updates
 * when row data is modified. This handler intercepts property access and
 * mutations to maintain synchronization with the store.
 *
 * @template T - The type of the store's schemas
 * @template TableId - The type of the table ID
 * @param store - The TinyBase store instance
 * @param tableId - The ID of the table containing the row
 * @param rowId - The ID of the row to create a handler for
 * @returns A ProxyHandler that enables reactive row operations
 */
function createRowHandler<T extends OptionalSchemas, TableId extends TableIdFromSchema<T[0]>>(
  store: Store<T>,
  tableId: TableId,
  rowId: Id,
): ProxyHandler<Row<T[0], TableId, false>> {
  return {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value) {
      if (typeof prop !== "string") {
        throw new Error("Row property must be a string");
      }

      store.setCell(tableId, rowId, prop, value);
      return true;
    },
  };
}

/**
 * Creates a reactive hook for accessing a TinyBase table.
 * The returned object provides a reactive proxy to the table data that
 * automatically updates when the underlying store changes.
 *
 * @template T - The type of the store's schemas
 * @template TableId - The type of the table ID
 * @param store - The TinyBase store instance
 * @param tableId - The ID of the table to create a hook for
 * @returns An object with a reactive value property that provides access to the table
 */
export function useTable<T extends OptionalSchemas, TableId extends TableIdFromSchema<T[0]>>(
  store: Store<T>,
  tableId: TableId,
) {
  let table = $state(store.getTable(tableId));

  $effect(() => {
    const listener = store.addTableListener(tableId, () => {
      table = store.getTable(tableId);
    });

    return () => {
      store.delListener(listener);
    };
  });

  return {
    get value() {
      return new Proxy(table, createTableHandler(store, tableId));
    },
    set value(value) {
      store.setTable(tableId, value);
    },
  };
}

/**
 * Creates a reactive hook for accessing a specific row in a TinyBase table.
 * The returned object provides a reactive proxy to the row data that
 * automatically updates when the underlying store changes.
 *
 * @template T - The type of the store's schemas
 * @template TableId - The type of the table ID
 * @param store - The TinyBase store instance
 * @param tableId - The ID of the table containing the row
 * @param rowId - The ID of the row to create a hook for
 * @returns An object with a reactive value property that provides access to the row
 */
export function useRow<T extends OptionalSchemas, TableId extends TableIdFromSchema<T[0]>>(
  store: Store<T>,
  tableId: TableId,
  rowId: Id,
) {
  let row = $state(store.getRow(tableId, rowId));

  $effect(() => {
    const listener = store.addRowListener(tableId, rowId, () => {
      row = store.getRow(tableId, rowId);
    });

    return () => {
      store.delListener(listener);
    };
  });

  return {
    get value() {
      return new Proxy(row, createRowHandler(store, tableId, rowId));
    },
    set value(newRow) {
      store.setRow(tableId, rowId, newRow);
    },
  };
}

/**
 * Creates a reactive hook for accessing a specific cell in a TinyBase table.
 * The returned object provides a reactive value that automatically updates
 * when the underlying store changes.
 *
 * @template T - The type of the store's schemas
 * @template TableId - The type of the table ID
 * @template CellId - The type of the cell ID
 * @param store - The TinyBase store instance
 * @param tableId - The ID of the table containing the cell
 * @param rowId - The ID of the row containing the cell
 * @param cellId - The ID of the cell to create a hook for
 * @returns An object with a reactive value property that provides access to the cell
 */
export function useCell<
  T extends OptionalSchemas,
  TableId extends TableIdFromSchema<T[0]>,
  CellId extends CellIdFromSchema<T[0], TableId>,
>(store: Store<T>, tableId: TableId, rowId: Id, cellId: CellId) {
  let cell = $state(store.getCell(tableId, rowId, cellId));

  $effect(() => {
    // @ts-expect-error - cellId is a string
    const listener = store.addCellListener(tableId, rowId, cellId, () => {
      cell = store.getCell(tableId, rowId, cellId);
    });

    return () => {
      store.delListener(listener);
    };
  });

  return {
    get value() {
      return cell;
    },
    set value(value) {
      if (value === undefined) {
        store.delCell(tableId, rowId, cellId);
      } else {
        store.setCell(tableId, rowId, cellId, value);
      }
    },
  };
}

/**
 * Creates a reactive hook for accessing TinyBase store values.
 * The returned object provides a reactive value that automatically updates
 * when the underlying store values change.
 *
 * @template T - The type of the store's schemas
 * @param store - The TinyBase store instance
 * @returns An object with a reactive value property that provides access to the store values
 */
export function useValues<T extends OptionalSchemas>(store: Store<T>) {
  let values = $state(store.getValues());

  $effect(() => {
    const listener = store.addValuesListener(() => {
      values = store.getValues();
    });

    return () => {
      store.delListener(listener);
    };
  });

  return {
    get value() {
      return values;
    },
    set value(newValues) {
      store.setValues(newValues);
    },
  };
}

/**
 * Creates a ProxyHandler for a TinyBase tables object that enables reactive
 * updates when tables are modified. This handler intercepts property access and
 * mutations to maintain synchronization with the store.
 *
 * @template T - The type of the store's schemas
 * @param store - The TinyBase store instance
 * @returns A ProxyHandler that enables reactive tables operations
 */
function createTablesHandler<T extends OptionalSchemas>(
  store: Store<T>,
): ProxyHandler<Tables<T[0], false>> {
  return {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (!val) return val;

      const handler = createTableHandler(store, prop as Id);
      return new Proxy(val, handler);
    },
    set(_, prop, value) {
      if (typeof prop !== "string") {
        throw new Error("Tables property must be a string");
      }

      store.setTable(prop, value);
      return true;
    },
  };
}

/**
 * Creates a reactive hook for accessing all TinyBase tables for a given store.
 * The returned object provides a reactive proxy to the tables data that
 * automatically updates when the underlying store changes.
 *
 * @template T - The type of the store's schemas
 * @param store - The TinyBase store instance
 * @returns An object with a reactive value property that provides access to all tables
 */
export function useTables<T extends OptionalSchemas>(store: Store<T>) {
  let tables = $state(store.getTables());

  $effect(() => {
    const listener = store.addTablesListener(() => {
      tables = store.getTables();
    });

    return () => {
      store.delListener(listener);
    };
  });

  return {
    get value() {
      return new Proxy(tables, createTablesHandler(store));
    },
    set value(value) {
      store.setTables(value);
    },
  };
}
