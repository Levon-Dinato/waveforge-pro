// src/utils/audioTransfer.ts

export type TransferTarget = 'studio' | 'mastering';

interface PendingTransfer {
  id: string;
  blob: Blob;
  filename: string;
  target: TransferTarget;
  timestamp: number;
}

const DB_NAME = 'waveforge-transfer';
const STORE_NAME = 'pending';
const DB_VERSION = 1;
const EXPIRATION_MS = 30000; // 30 secondes

class AudioTransfer {
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
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Sauvegarde un blob pour transfert vers une autre page
   */
  async save(blob: Blob, filename: string, target: TransferTarget): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry: PendingTransfer = {
        id: 'pending',
        blob,
        filename,
        target,
        timestamp: Date.now(),
      };
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Consomme le transfert en attente pour la cible demandée.
   * Retourne null si rien, supprime l'entrée après lecture.
   */
  async consume(target: TransferTarget): Promise<{ blob: Blob; filename: string } | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('pending');

      req.onsuccess = () => {
        const data = req.result as PendingTransfer | undefined;

        if (!data || data.target !== target) {
          resolve(null);
          return;
        }

        // Vérifie l'expiration
        if (Date.now() - data.timestamp > EXPIRATION_MS) {
          store.delete('pending');
          resolve(null);
          return;
        }

        // Supprime l'entrée après lecture
        store.delete('pending');
        resolve({ blob: data.blob, filename: data.filename });
      };

      req.onerror = () => reject(req.error);
    });
  }
}

export const audioTransfer = new AudioTransfer();