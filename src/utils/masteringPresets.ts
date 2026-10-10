// src/utils/masteringPresets.ts

export interface UserMasteringPreset {
  id: string;
  name: string;
  createdAt: number;
  // Paramètres
  loudness: number;
  presence: number;
  width: number;
  saturation: number;
  // EQ 5 bandes
  eqBands: {
    frequency: number;
    gain: number;
    q: number;
  }[];
  // Mono-Maker
  monoMakerEnabled: boolean;
  monoMakerFreq: number;
}

const DB_NAME = 'waveforge-mastering-presets';
const STORE_NAME = 'presets';
const DB_VERSION = 1;

class MasteringPresetsManager {
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
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async save(preset: UserMasteringPreset): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(preset);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(): Promise<UserMasteringPreset[]> {
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

  // Export en JSON
  async exportAll(): Promise<string> {
    const presets = await this.getAll();
    return JSON.stringify(presets, null, 2);
  }

  // Import depuis JSON
  async importFromJson(json: string): Promise<number> {
    try {
      const presets = JSON.parse(json) as UserMasteringPreset[];
      let imported = 0;
      for (const preset of presets) {
        // Regénère un ID pour éviter les collisions
        await this.save({
          ...preset,
          id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
        imported++;
      }
      return imported;
    } catch (e) {
      throw new Error('Fichier JSON invalide');
    }
  }
}

export const masteringPresets = new MasteringPresetsManager();