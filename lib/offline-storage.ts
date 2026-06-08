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
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: 'create' | 'update' | 'delete';
      entity: string;
      data: any;
      timestamp: number;
      synced: boolean;
    };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<OfflineData> | null = null;
  private readonly dbName = 'sifex-offline';
  private readonly version = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineData>(this.dbName, this.version, {
      upgrade(db) {
        // Shipments store
        if (!db.objectStoreNames.contains('shipments')) {
          db.createObjectStore('shipments', { keyPath: 'id' });
        }

        // Invoices store
        if (!db.objectStoreNames.contains('invoices')) {
          db.createObjectStore('invoices', { keyPath: 'id' });
        }

        // Deliveries store
        if (!db.objectStoreNames.contains('deliveries')) {
          db.createObjectStore('deliveries', { keyPath: 'id' });
        }

        // Inventory store
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory', { keyPath: 'id' });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }

  async saveShipment(shipment: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.put('shipments', {
      id: shipment.id,
      awb: shipment.awb,
      status: shipment.status,
      lastSynced: Date.now(),
      data: shipment,
    });
  }

  async getShipment(id: string): Promise<any | undefined> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const record = await this.db.get('shipments', id);
    return record?.data;
  }

  async getAllShipments(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const records = await this.db.getAll('shipments');
    return records.map((r) => r.data);
  }

  async deleteShipment(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('shipments', id);
  }

  async saveInvoice(invoice: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.put('invoices', {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      lastSynced: Date.now(),
      data: invoice,
    });
  }

  async getInvoice(id: string): Promise<any | undefined> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const record = await this.db.get('invoices', id);
    return record?.data;
  }

  async getAllInvoices(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const records = await this.db.getAll('invoices');
    return records.map((r) => r.data);
  }

  async saveDelivery(delivery: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.put('deliveries', {
      id: delivery.id,
      trackingNumber: delivery.trackingNumber,
      status: delivery.status,
      lastSynced: Date.now(),
      data: delivery,
    });
  }

  async getDelivery(id: string): Promise<any | undefined> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const record = await this.db.get('deliveries', id);
    return record?.data;
  }

  async getAllDeliveries(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const records = await this.db.getAll('deliveries');
    return records.map((r) => r.data);
  }

  async queueSync(action: 'create' | 'update' | 'delete', entity: string, data: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.add('syncQueue', {
      id: undefined as any,
      action,
      entity,
      data,
      timestamp: Date.now(),
      synced: false,
    });
  }

  async getPendingSyncs(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const records = await this.db.getAll('syncQueue');
    return records.filter((r) => !r.synced);
  }

  async markSynced(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const record = await this.db.get('syncQueue', id);
    if (record) {
      record.synced = true;
      await this.db.put('syncQueue', record);
    }
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.clear('shipments');
    await this.db.clear('invoices');
    await this.db.clear('deliveries');
    await this.db.clear('inventory');
    await this.db.clear('syncQueue');
  }
}

export const offlineStorage = new OfflineStorage();
