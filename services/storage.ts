// File storage abstraction layer

export interface StorageProvider {
  upload(file: File, path: string): Promise<string>;
  download(path: string): Promise<Blob>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export enum StorageType {
  LOCAL = "local",
  S3 = "s3",
  CLOUDINARY = "cloudinary",
}

class LocalStorageProvider implements StorageProvider {
  async upload(file: File, path: string): Promise<string> {
    // Implementation for local storage
    throw new Error("Local storage not implemented");
  }

  async download(path: string): Promise<Blob> {
    throw new Error("Local storage not implemented");
  }

  async delete(path: string): Promise<void> {
    throw new Error("Local storage not implemented");
  }

  getUrl(path: string): string {
    return `/uploads/${path}`;
  }
}

class S3StorageProvider implements StorageProvider {
  async upload(file: File, path: string): Promise<string> {
    // Implementation for S3
    throw new Error("S3 storage not implemented");
  }

  async download(path: string): Promise<Blob> {
    throw new Error("S3 storage not implemented");
  }

  async delete(path: string): Promise<void> {
    throw new Error("S3 storage not implemented");
  }

  getUrl(path: string): string {
    return `https://s3.amazonaws.com/bucket/${path}`;
  }
}

class StorageService {
  private provider: StorageProvider;

  constructor(type: StorageType = StorageType.LOCAL) {
    switch (type) {
      case StorageType.S3:
        this.provider = new S3StorageProvider();
        break;
      case StorageType.LOCAL:
      default:
        this.provider = new LocalStorageProvider();
    }
  }

  async uploadFile(file: File, folder: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const path = `${folder}/${filename}`;
    return this.provider.upload(file, path);
  }

  async downloadFile(path: string): Promise<Blob> {
    return this.provider.download(path);
  }

  async deleteFile(path: string): Promise<void> {
    return this.provider.delete(path);
  }

  getFileUrl(path: string): string {
    return this.provider.getUrl(path);
  }
}

export const storageService = new StorageService(
  (process.env.STORAGE_TYPE as StorageType) || StorageType.LOCAL
);
