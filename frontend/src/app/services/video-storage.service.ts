import { Injectable } from '@angular/core';

export interface StoredVideo {
  parameter: string;
  fileName: string;
  fileBlob: Blob;
  uploadedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class VideoStorageService {
  private dbName = 'K2_Analytics_Storage';
  private storeName = 'parameter_videos';
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event: any) => {
        const db: IDBDatabase = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'parameter' });
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = (err) => {
        console.error('[VideoStorage] Error al abrir IndexedDB:', err);
        reject(err);
      };
    });

    return this.dbPromise;
  }

  /**
   * Guarda un archivo de video asociado permanentemente a un parámetro de análisis
   */
  async saveVideoForParameter(parameter: string, file: File): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);

      const record: StoredVideo = {
        parameter: parameter,
        fileName: file.name,
        fileBlob: file,
        uploadedAt: Date.now()
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  }

  /**
   * Obtiene el video almacenado para un parámetro específico
   */
  async getVideoForParameter(parameter: string): Promise<{ fileName: string, fileBlob: Blob, objectUrl: string } | null> {
    const db = await this.initDb();
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(parameter);

      req.onsuccess = () => {
        const res: StoredVideo = req.result;
        if (res && res.fileBlob) {
          const objectUrl = URL.createObjectURL(res.fileBlob);
          resolve({
            fileName: res.fileName,
            fileBlob: res.fileBlob,
            objectUrl: objectUrl
          });
        } else {
          // Si no hay video asignado directamente a este parámetro, reusar el último video subido
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const all: StoredVideo[] = allReq.result || [];
            if (all.length > 0) {
              all.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
              const latest = all[0];
              resolve({
                fileName: latest.fileName,
                fileBlob: latest.fileBlob,
                objectUrl: URL.createObjectURL(latest.fileBlob)
              });
            } else {
              resolve(null);
            }
          };
          allReq.onerror = () => resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  }

  /**
   * Verifica si ya existe un video guardado para el parámetro
   */
  async hasVideoForParameter(parameter: string): Promise<boolean> {
    const db = await this.initDb();
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(parameter);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  }

  /**
   * Elimina el video almacenado para un parámetro
   */
  async deleteVideoForParameter(parameter: string): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(parameter);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  }
}
