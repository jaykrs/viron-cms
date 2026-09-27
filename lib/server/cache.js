/**
 * Lightweight caching layer.
 * Tries to use Redis (ioredis) when REDIS_URL / REDIS_HOST is reachable.
 * Falls back transparently to an in-process Map-based cache with TTL
 * so the whole app keeps working even with no Redis server running
 * (useful for local demos / sandboxes).
 */
const Redis = require('ioredis');

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '60', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

class MemoryCache {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  async set(key, value, ttlSeconds = DEFAULT_TTL) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }
  async del(pattern) {
    if (!pattern.includes('*')) {
      this.store.delete(pattern);
      return;
    }
    const prefix = pattern.replace('*', '');
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
  get backend() {
    return 'memory';
  }
}

class RedisCache {
  constructor(client) {
    this.client = client;
  }
  async get(key) {
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  async set(key, value, ttlSeconds = DEFAULT_TTL) {
    const raw = JSON.stringify(value);
    if (ttlSeconds) await this.client.set(key, raw, 'EX', ttlSeconds);
    else await this.client.set(key, raw);
  }
  async del(pattern) {
    if (!pattern.includes('*')) {
      await this.client.del(pattern);
      return;
    }
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    const keys = [];
    for await (const chunk of stream) keys.push(...chunk);
    if (keys.length) await this.client.del(keys);
  }
  get backend() {
    return 'redis';
  }
}

// Singleton, resolved lazily so the server can boot instantly and swap
// to Redis in the background if/when it becomes available.
let activeCache = new MemoryCache();
let attempted = false;

function tryConnectRedis() {
  if (attempted) return;
  attempted = true;
  try {
    const client = new Redis(REDIS_URL, {
      lazyConnect: true,
      retryStrategy: () => null, // don't keep retrying in a sandbox with no redis
      reconnectOnError: () => false,
      maxRetriesPerRequest: 1,
    });
    client.on('error', () => {
      /* swallow - we silently stay on MemoryCache */
    });
    client
      .connect()
      .then(() => {
        activeCache = new RedisCache(client);
        console.log('[cache] connected to Redis at', REDIS_URL);
      })
      .catch(() => {
        console.log('[cache] Redis unavailable, using in-memory cache');
      });
  } catch {
    console.log('[cache] Redis unavailable, using in-memory cache');
  }
}

tryConnectRedis();

module.exports = {
  get: (key) => activeCache.get(key),
  set: (key, value, ttl) => activeCache.set(key, value, ttl),
  del: (pattern) => activeCache.del(pattern),
  backend: () => activeCache.backend,
};
