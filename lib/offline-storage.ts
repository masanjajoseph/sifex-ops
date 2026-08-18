'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineData extends DBSchema {
  shipments: {
    key: string;
    value: {
      id: string;
      awb: string;
      status: string;
      lastSynced: number;
      data: any;
    };
    indexes: { 'by-awb': string; 'by-status': string };
  };
  invoices: {
    key: string;
    value: {
      id: string;
      number: string;
      status: string;
      lastSynced: number;
      data: any;
    };
    indexes: { 'by-number': string; 'by-status': string };
  };
  deliveries: {
    key: string;
    value: {
      id: string;
      trackingNumber: string;
      status: string;
      lastSynced: number;
      data: any;
    };
    indexes: { 'by-tracking': string; 'by-status': string };
  };
  inventory: {
    key: string;
    value: {
      id: string;
      sku: string;
      quantity: number;
      lastSynced: number;
      data: any;
    };
    indexes: { 'by-sku': string };
  };
  customers: {
    key: string;
    value: {
      id: string;
      name: string;
      code: string;
      lastSynced: number;
      data: any;
    };
    indexes: { 'by-code': string; 'by-name': string };
  };
  documents: {
    key: string;
    value: {
      id: string;
      documentNumber: string;
      documentType: string;
      lastSynced: number;
      data: any;
    };
    indexes: { 'by-type': string; 'by-number': string };
  };
  scans: {
    key: string;
    value: {
      id: string;
      barcode: string;
      eventType: string;
      timestamp: number;
      synced: boolean;
      data: any;
    };
    indexes: { 'by-barcode': string; 'by-synced': number };
  };
  assignments: {
    key: string;
    value: {
      id: string;
      taskId: string;
      status: string;
      lastSynced: number;
      data: any;
    };
    indexes: { 'by-status': string; 'by-task': string };
  };
  syncQueue: {
    key: string;
    value: {
      id?: string;
      action: 'create' | 'update' | 'delete';
      entity: string;
      data: any;
      timestamp: number;
      synced: boolean;
      retryCount: number;
      lastError?: string;
    };
    indexes: { 'by-synced': number; 'by-entity': string };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<OfflineData> | null = null;
  private readonly dbName = 'sifex-offline';
  private readonly version = 2;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.db = await openDB<OfflineData>(this.dbName, this.version, {
        upgrade(db, oldVersion, newVersion, transaction) {
          if (oldVersion < 1) {
            db.createObjectStore('shipments', { keyPath: 'id' });
            db.createObjectStore('invoices', { keyPath: 'id' });
            db.createObjectStore('deliveries', { keyPath: 'id' });
            db.createObjectStore('inventory', { keyPath: 'id' });
            db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          }
          if (oldVersion < 2) {
            if (!db.objectStoreNames.contains('customers')) {
              db.createObjectStore('customers', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('documents')) {
              db.createObjectStore('documents', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('scans')) {
              const scanStore = db.createObjectStore('scans', { keyPath: 'id', autoIncrement: true });
              scanStore.createIndex('by-synced', 'synced');
            }
            if (!db.objectStoreNames.contains('assignments')) {
              db.createObjectStore('assignments', { keyPath: 'id' });
            }
          }
        },
      });
    })();

    return this.initPromise;
  }

  private async ensureInit(): Promise<IDBPDatabase<OfflineData>> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  async saveShipment(shipment: any): Promise<void> {
    const db = await this.ensureInit();
    await db.put('shipments', {
      id: shipment.id,
      awb: shipment.awb || shipment.trackingNumber || shipment.id,
      status: shipment.status || shipment.workflowStatus || 'UNKNOWN',
      lastSynced: Date.now(),
      data: shipment,
    });
  }

  async getShipment(id: string): Promise<any | undefined> {
    const db = await this.ensureInit();
    const record = await db.get('shipments', id);
    return record?.data;
  }

  async getAllShipments(): Promise<any[]> {
    const db = await this.ensureInit();
    const records = await db.getAll('shipments');
    return records.map((r) => r.data);
  }

  async deleteShipment(id: string): Promise<void> {
    const db = await this.ensureInit();
    await db.delete('shipments', id);
  }

  async saveInvoice(invoice: any): Promise<void> {
    const db = await this.ensureInit();
    await db.put('invoices', {
      id: invoice.id,
      number: invoice.invoiceNumber || invoice.documentNumber || invoice.id,
      status: invoice.status || 'UNKNOWN',
      lastSynced: Date.now(),
      data: invoice,
    });
  }

  async getInvoice(id: string): Promise<any | undefined> {
    const db = await this.ensureInit();
    const record = await db.get('invoices', id);
    return record?.data;
  }

  async getAllInvoices(): Promise<any[]> {
    const db = await this.ensureInit();
    const records = await db.getAll('invoices');
    return records.map((r) => r.data);
  }

  async saveDelivery(delivery: any): Promise<void> {
    const db = await this.ensureInit();
    await db.put('deliveries', {
      id: delivery.id,
      trackingNumber: delivery.trackingNumber || delivery.taskNumber || delivery.id,
      status: delivery.status || 'UNKNOWN',
      lastSynced: Date.now(),
      data: delivery,
    });
  }

  async getDelivery(id: string): Promise<any | undefined> {
    const db = await this.ensureInit();
    const record = await db.get('deliveries', id);
    return record?.data;
  }

  async getAllDeliveries(): Promise<any[]> {
    const db = await this.ensureInit();
    const records = await db.getAll('deliveries');
    return records.map((r) => r.data);
  }

  async saveCustomer(customer: any): Promise<void> {
    const db = await this.ensureInit();
    await db.put('customers', {
      id: customer.id,
      name: customer.name || 'Unknown',
      code: customer.code || customer.id,
      lastSynced: Date.now(),
      data: customer,
    });
  }

  async saveDocument(doc: any): Promise<void> {
    const db = await this.ensureInit();
    await db.put('documents', {
      id: doc.id,
      documentNumber: doc.documentNumber || doc.id,
      documentType: doc.documentType || 'DOCUMENT',
      lastSynced: Date.now(),
      data: doc,
    });
  }

  async saveScan(scan: any): Promise<void> {
    const db = await this.ensureInit();
    await db.add('scans', {
      id: undefined as any,
      barcode: scan.barcode,
      eventType: scan.eventType,
      timestamp: Date.now(),
      synced: false,
      data: scan,
    });
  }

  async getUnsyncedScans(): Promise<any[]> {
    const db = await this.ensureInit();
    const index = db.transaction('scans', 'readonly').store.index('by-synced');
    return index.getAll(0);
  }

  async markScansSynced(ids: string[]): Promise<void> {
    const db = await this.ensureInit();
    const tx = db.transaction('scans', 'readwrite');
    for (const id of ids) {
      const record = await tx.store.get(id);
      if (record) {
        record.synced = true;
        await tx.store.put(record);
      }
    }
    await tx.done;
  }

  async saveAssignment(assignment: any): Promise<void> {
    const db = await this.ensureInit();
    await db.put('assignments', {
      id: assignment.id,
      taskId: assignment.taskId || assignment.deliveryTaskId || assignment.id,
      status: assignment.status || 'UNKNOWN',
      lastSynced: Date.now(),
      data: assignment,
    });
  }

  async queueSync(action: 'create' | 'update' | 'delete', entity: string, data: any): Promise<void> {
    const db = await this.ensureInit();
    await db.add('syncQueue', {
      action,
      entity,
      data,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    });
  }

  async getPendingSyncs(): Promise<any[]> {
    const db = await this.ensureInit();
    const records = await db.getAll('syncQueue');
    return records.filter((r) => !r.synced);
  }

  async getPendingSyncsByEntity(entity: string): Promise<any[]> {
    const all = await this.getPendingSyncs();
    return all.filter((r) => r.entity === entity);
  }

  async markSynced(id: string): Promise<void> {
    const db = await this.ensureInit();
    const record = await db.get('syncQueue', id);
    if (record) {
      record.synced = true;
      await db.put('syncQueue', record);
    }
  }

  async markSyncedBulk(ids: string[]): Promise<void> {
    const db = await this.ensureInit();
    const tx = db.transaction('syncQueue', 'readwrite');
    for (const id of ids) {
      const record = await tx.store.get(id);
      if (record) {
        record.synced = true;
        await tx.store.put(record);
      }
    }
    await tx.done;
  }

  async clearSynced(): Promise<number> {
    const db = await this.ensureInit();
    const records = await db.getAll('syncQueue');
    const syncedRecords = records.filter(r => r.synced);
    const tx = db.transaction('syncQueue', 'readwrite');
    for (const record of syncedRecords) {
      if (record.id != null) await tx.store.delete(record.id);
    }
    await tx.done;
    return syncedRecords.length;
  }

  getSyncQueueLength(): Promise<number> {
    return this.ensureInit().then(async (db) => {
      const records = await db.getAll('syncQueue');
      return records.filter(r => !r.synced).length;
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureInit();
    const storeNames = ['shipments', 'invoices', 'deliveries', 'inventory', 'customers', 'documents', 'scans', 'assignments', 'syncQueue'] as const;
    const tx = db.transaction(storeNames, 'readwrite');
    for (const store of storeNames) {
      await tx.objectStore(store).clear();
    }
    await tx.done;
  }

  async processSyncQueue(syncFn: (action: string, entity: string, data: any) => Promise<boolean>): Promise<{ synced: number; failed: number; errors: string[] }> {
    const pending = await this.getPendingSyncs();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of pending) {
      try {
        const success = await syncFn(item.action, item.entity, item.data);
        if (success) {
          await this.markSynced(item.id);
          synced++;
        } else {
          failed++;
          errors.push(`Failed to sync ${item.entity} action ${item.action}`);
        }
      } catch (error: any) {
        failed++;
        errors.push(error.message);
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = error.message;
        const db = await this.ensureInit();
        await db.put('syncQueue', item);
      }
    }

    return { synced, failed, errors };
  }
}

export const offlineStorage = new OfflineStorage();

export async function isOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    await fetch('/api/health', { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export async function syncOfflineData(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const online = await isOnline();
  if (!online) return { synced: 0, failed: 0, errors: ['Offline'] };

  const syncFn = async (action: string, entity: string, data: any): Promise<boolean> => {
    let endpoint = `/api/${entity.toLowerCase()}`;
    if (data.id) endpoint += `/${data.id}`;

    const response = await fetch(endpoint, {
      method: action === 'create' ? 'POST' : action === 'update' ? 'PATCH' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return response.ok;
  };

  return offlineStorage.processSyncQueue(syncFn);
}

export async function startAutoSync(intervalMs = 30000): Promise<() => void> {
  const interval = setInterval(async () => {
    try {
      await syncOfflineData();
    } catch {
      // Silently retry on next interval
    }
  }, intervalMs);

  return () => clearInterval(interval);
}
