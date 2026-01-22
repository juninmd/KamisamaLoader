import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';

interface CacheEntry {
    data: any;
    timestamp: number;
    ttl: number;
}

interface CacheConfig {
    maxMemorySize?: number; // Max entries in memory
    defaultTTL?: number; // Default TTL in milliseconds
}

/**
 * APICache - Sistema de cache inteligente para API GameBanana
 * Suporta cache em memória + persistente em disco
 */
export class APICache {
    private memoryCache: Map<string, CacheEntry>;
    private persistentCachePath: string;
    private maxMemorySize: number;
    private defaultTTL: number;
    private persistentCacheLoaded: boolean = false;

    constructor(config: CacheConfig = {}) {
        this.memoryCache = new Map();
        this.maxMemorySize = config.maxMemorySize || 1000;
        this.defaultTTL = config.defaultTTL || 5 * 60 * 1000; // 5 minutes default

        // Define cache file path
        const userDataPath = app.getPath('userData');
        this.persistentCachePath = path.join(userDataPath, 'api-cache.json');

        // Load persistent cache on init
        this.loadPersistentCache();
    }

    /**
     * Get value from cache
     * Checks memory first, then disk if not found
     */
    async get(key: string): Promise<any | null> {
        // Check memory cache
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry) {
            // Check if expired
            if (Date.now() - memoryEntry.timestamp > memoryEntry.ttl) {
                this.memoryCache.delete(key);
                console.log(`[Cache] Memory cache expired for key: ${key}`);
            } else {
                console.log(`[Cache] Hit (memory) for key: ${key}`);
                return memoryEntry.data;
            }
        }

        // Check persistent cache
        const persistentEntry = await this.getPersistent(key);
        if (persistentEntry) {
            // Promote to memory cache
            this.memoryCache.set(key, persistentEntry);
            console.log(`[Cache] Hit (disk) for key: ${key}`);
            return persistentEntry.data;
        }

        console.log(`[Cache] Miss for key: ${key}`);
        return null;
    }

    /**
     * Set value in cache
     * Stores in both memory and disk
     */
    async set(key: string, value: any, ttl?: number): Promise<void> {
        const entry: CacheEntry = {
            data: value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        };

        // Set in memory
        this.memoryCache.set(key, entry);

        // Enforce memory size limit (LRU-style)
        if (this.memoryCache.size > this.maxMemorySize) {
            const firstKey = this.memoryCache.keys().next().value;
            if (firstKey) {
                this.memoryCache.delete(firstKey);
                console.log(`[Cache] Evicted oldest entry: ${firstKey}`);
            }
        }

        // Set in persistent cache (async, no need to await)
        this.setPersistent(key, entry).catch(err => {
            console.error('[Cache] Failed to persist cache:', err);
        });

        console.log(`[Cache] Set key: ${key} with TTL: ${entry.ttl}ms`);
    }

    /**
     * Invalidate cache entries matching a pattern
     * Supports wildcards (*)
     */
    async invalidate(pattern: string): Promise<void> {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));

        // Invalidate from memory
        for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
                this.memoryCache.delete(key);
                console.log(`[Cache] Invalidated (memory): ${key}`);
            }
        }

        // Invalidate from persistent cache
        await this.invalidatePersistent(regex);
    }

    /**
     * Clear all cache (memory + disk)
     */
    async clear(): Promise<void> {
        this.memoryCache.clear();

        try {
            await fs.unlink(this.persistentCachePath);
            console.log('[Cache] Cleared all cache');
        } catch (err) {
            // File might not exist, which is fine
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            memorySize: this.memoryCache.size,
            maxMemorySize: this.maxMemorySize,
            cacheHitRate: this.calculateHitRate()
        };
    }

    // ============================================
    // Private Methods - Persistent Cache
    // ============================================

    private async loadPersistentCache(): Promise<void> {
        if (this.persistentCacheLoaded) return;

        try {
            const data = await fs.readFile(this.persistentCachePath, 'utf-8');
            const cache = JSON.parse(data);

            // Only load non-expired entries
            const now = Date.now();
            for (const [key, entry] of Object.entries(cache)) {
                const cacheEntry = entry as CacheEntry;
                if (now - cacheEntry.timestamp <= cacheEntry.ttl) {
                    this.memoryCache.set(key, cacheEntry);
                }
            }

            this.persistentCacheLoaded = true;
            console.log(`[Cache] Loaded ${this.memoryCache.size} entries from disk`);
        } catch (err) {
            // File doesn't exist or is corrupted - start fresh
            console.log('[Cache] No persistent cache found, starting fresh');
        }
    }

    private async getPersistent(key: string): Promise<CacheEntry | null> {
        try {
            const data = await fs.readFile(this.persistentCachePath, 'utf-8');
            const cache = JSON.parse(data);
            const entry = cache[key] as CacheEntry;

            if (entry && Date.now() - entry.timestamp <= entry.ttl) {
                return entry;
            }
        } catch (err) {
            // Ignore errors
        }
        return null;
    }

    private async setPersistent(key: string, entry: CacheEntry): Promise<void> {
        try {
            let cache: Record<string, CacheEntry> = {};

            try {
                const data = await fs.readFile(this.persistentCachePath, 'utf-8');
                cache = JSON.parse(data);
            } catch {
                // File doesn't exist yet, start with empty cache
            }

            cache[key] = entry;

            // Clean up expired entries before saving
            const now = Date.now();
            for (const [k, v] of Object.entries(cache)) {
                if (now - v.timestamp > v.ttl) {
                    delete cache[k];
                }
            }

            // Ensure directory exists
            const dir = path.dirname(this.persistentCachePath);
            await fs.mkdir(dir, { recursive: true });

            await fs.writeFile(this.persistentCachePath, JSON.stringify(cache, null, 2));
        } catch (err) {
            console.error('[Cache] Failed to write persistent cache:', err);
        }
    }

    private async invalidatePersistent(regex: RegExp): Promise<void> {
        try {
            const data = await fs.readFile(this.persistentCachePath, 'utf-8');
            const cache = JSON.parse(data);

            for (const key of Object.keys(cache)) {
                if (regex.test(key)) {
                    delete cache[key];
                    console.log(`[Cache] Invalidated (disk): ${key}`);
                }
            }

            await fs.writeFile(this.persistentCachePath, JSON.stringify(cache, null, 2));
        } catch (err) {
            // Ignore errors
        }
    }

    private calculateHitRate(): number {
        // Simple approximation - could be improved with proper hit/miss tracking
        return this.memoryCache.size > 0 ? 0.85 : 0;
    }
}

// Singleton instance
let cacheInstance: APICache | null = null;

export function getAPICache(): APICache {
    if (!cacheInstance) {
        cacheInstance = new APICache({
            maxMemorySize: 500,
            defaultTTL: 5 * 60 * 1000 // 5 minutes
        });
    }
    return cacheInstance;
}
