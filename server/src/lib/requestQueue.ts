/**
 * Request Queue - Rate limiting for external APIs
 * Prevents overwhelming Nominatim, Yr.no, etc
 */

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class RequestQueue {
  private queue: QueuedTask<any>[] = [];
  private running = false;
  private maxConcurrent: number;
  private delayMs: number;
  private activeCount = 0;

  constructor(maxConcurrent = 2, delayMs = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.running || this.activeCount >= this.maxConcurrent) return;
    
    this.running = true;

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) continue;

      this.activeCount++;
      
      try {
        const result = await task.fn();
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
        task.resolve(result);
      } catch (error) {
        task.reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.activeCount--;
      }
    }

    this.running = false;
    if (this.queue.length > 0) this.process();
  }
}

// Export singleton instances
export const nominatimQueue = new RequestQueue(2, 100);
export const weatherQueue = new RequestQueue(3, 50);
export const overpassQueue = new RequestQueue(1, 200);
