// src/utils/musicgenHistory.ts

export interface MusicGenHistoryEntry {
  id: string;
  title?: string;         // ✅ NOUVEAU : titre personnalisé (optionnel)
  prompt: string;
  duration: number;
  temperature: number;
  generationTime: number;
  timestamp: number;
  audioBlob: Blob;
}

const DB_NAME = 'waveforge-musicgen';
const STORE_NAME = 'history';
const DB_VERSION = 1;

class MusicGenHistory {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async add(entry: MusicGenHistoryEntry): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * ✅ NOUVEAU : Met à jour une entrée (utile pour renommer)
   */
  async update(id: string, updates: Partial<MusicGenHistoryEntry>): Promise<void> {
    await this.init();
    if (!this.db) return;
    const all = await this.getAll();
    const existing = all.find((e) => e.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    return this.add(updated);
  }

  async getAll(): Promise<MusicGenHistoryEntry[]> {
    await this.init();
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const musicgenHistory = new MusicGenHistory();