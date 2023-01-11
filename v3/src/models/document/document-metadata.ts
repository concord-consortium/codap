export interface IDocumentMetadata {
  type: string;
  key: string;
  createdAt?: number;
  title?: string;
  properties?: Record<string, string>;
}
