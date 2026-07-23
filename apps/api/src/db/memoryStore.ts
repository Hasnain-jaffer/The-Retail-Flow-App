/**
 * Demo-mode in-memory collections.
 *
 * WHY this exists: without a real MongoDB connection, routes still need
 * something to read/write that behaves like a real database — not a
 * mock that fakes a success response without actually storing anything
 * (that was the previous Drizzle-based demo mode's failure mode: writes
 * "succeeded" but never persisted, so the dashboard/reports never
 * reflected anything you'd just created).
 *
 * This is deliberately NOT trying to emulate Mongoose's/MongoDB's query
 * API generically — that's a lot of surface area for little benefit.
 * Instead, each collection is just a plain array plus a handful of
 * ordinary array methods (`.filter()`, `.sort()`, `.slice()`), and each
 * route's demo-mode branch uses plain JS directly against it. That's
 * simple enough to trust, and easy to verify by reading it.
 *
 * IDs here are simple incrementing strings, not real Mongo ObjectIds —
 * demo mode is for exploring the app's features without a database, not
 * for byte-for-byte replicating what MongoDB itself would return.
 */

class MemoryCollection<T extends { id: string }> {
  private items: T[] = [];
  private counter = 1;

  private nextId() {
    return String(this.counter++);
  }

  all(): T[] {
    return this.items;
  }

  find(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  findOne(predicate: (item: T) => boolean): T | null {
    return this.items.find(predicate) || null;
  }

  findById(id: string): T | null {
    return this.items.find((i) => i.id === id) || null;
  }

  insert(data: Omit<T, "id" | "createdAt" | "updatedAt"> & Partial<Pick<T, "id">>): T {
    const now = new Date().toISOString();
    const item = { id: this.nextId(), createdAt: now, updatedAt: now, ...data } as unknown as T;
    this.items.push(item);
    return item;
  }

  update(id: string, patch: Partial<T>): T | null {
    const item = this.findById(id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    return item;
  }

  delete(id: string): boolean {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    return this.items.length < before;
  }

  count(predicate?: (item: T) => boolean): number {
    return predicate ? this.items.filter(predicate).length : this.items.length;
  }
}

export const demoUsers = new MemoryCollection<any>();
export const demoProducts = new MemoryCollection<any>();
export const demoCustomers = new MemoryCollection<any>();
export const demoOrders = new MemoryCollection<any>();
