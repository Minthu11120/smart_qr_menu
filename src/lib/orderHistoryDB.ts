import { Order } from '../types';

const DB_NAME = 'SmartTableOrder_CustomerHistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'past_orders';

export function openHistoryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event);
      reject(new Error('Failed to open history database.'));
    };
  });
}

export async function saveOrderToHistory(order: Order): Promise<void> {
  try {
    const db = await openHistoryDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(order);

      request.onsuccess = () => resolve();
      request.onerror = (e) => {
        console.error('saveOrderToHistory error:', e);
        reject(new Error('Failed to save order to local history.'));
      };
    });
  } catch (err) {
    console.error(err);
  }
}

export async function getOrdersFromHistory(): Promise<Order[]> {
  try {
    const db = await openHistoryDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const list = request.result as Order[];
        // Sort by createdAt descending so newest is first
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list);
      };
      request.onerror = (e) => {
        console.error('getOrdersFromHistory error:', e);
        reject(new Error('Failed to fetch local order history.'));
      };
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function deleteOrderFromHistory(id: string): Promise<void> {
  try {
    const db = await openHistoryDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (e) => {
        console.error('deleteOrderFromHistory error:', e);
        reject(new Error('Failed to delete order from local history.'));
      };
    });
  } catch (err) {
    console.error(err);
  }
}
