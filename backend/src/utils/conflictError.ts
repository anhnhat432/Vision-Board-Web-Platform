export class ConflictError extends Error {
  public readonly statusCode = 409;
  public readonly currentRevision: number;
  public readonly serverUpdatedAt: Date;

  constructor(currentRevision: number, serverUpdatedAt: Date) {
    super("Document was modified on another device. Latest version loaded.");
    this.name = "ConflictError";
    this.currentRevision = currentRevision;
    this.serverUpdatedAt = serverUpdatedAt;
  }
}
