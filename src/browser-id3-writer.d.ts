declare module 'browser-id3-writer' {
  export class ID3Writer {
    constructor(buffer: ArrayBuffer);
    setFrame(name: string, value: unknown): void;
    addTag(): void;
    getBlob(): Blob;
  }
}
