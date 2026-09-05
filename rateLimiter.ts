// Enforces a minimum delay between outbound calls, regardless of how many
// concurrent requests hit our own /api/geocode endpoint. This is what
// keeps us compliant with Nominatim's usage policy (max 1 req/sec):
// https://operations.osmfoundation.org/policies/nominatim/
//
// This throttles OUR calls to Nominatim. It is not a limiter on inbound
// traffic to this server — add express-rate-limit in front of the
// /api/geocode routes too if this ever goes properly public.

type QueuedTask<T> = () => Promise<T>;

class RateLimitedQueue {
  private queue: Array<() => Promise<void>> = [];
  private lastRun = 0;
  private running = false;

  constructor(private minDelayMs: number) {}

  enqueue<T>(task: QueuedTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task());
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const wait = Math.max(0, this.minDelayMs - (Date.now() - this.lastRun));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const job = this.queue.shift();
      this.lastRun = Date.now();
      if (job) await job();
    }
    this.running = false;
  }
}

// 1100ms, not 1000ms — stay safely under the policy's ceiling rather than
// right at it.
export const nominatimQueue = new RateLimitedQueue(1100);
