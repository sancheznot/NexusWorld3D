/** Serializes account snapshots so an older slow write cannot replace a newer one. */
export class SerialWrites {
  private pending = new Map<string, Promise<void>>();
  run(key: string, write: () => Promise<void>): Promise<void> {
    const previous = this.pending.get(key) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(write);
    this.pending.set(key, next);
    const release = () => { if (this.pending.get(key) === next) this.pending.delete(key); };
    void next.then(release, release);
    return next;
  }
}
