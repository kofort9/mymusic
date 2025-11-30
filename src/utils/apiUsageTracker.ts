import fs from 'fs';
import path from 'path';
import { logger } from './logger';

interface ApiUsageData {
    count: number;
    resetDate: string; // ISO date string
    limit: number;
}

/**
 * Track API usage for rate-limited services (e.g., SongBPM free tier: 100/month)
 */
export class ApiUsageTracker {
    private static instance: ApiUsageTracker;
    private filePath: string;
    private data: ApiUsageData;
    private readonly DEFAULT_LIMIT = 100;

    private constructor(filePath?: string) {
        this.filePath = filePath || path.join(process.cwd(), '.api_usage.json');
        this.data = this.load();
    }

    /**
     * Get singleton instance
     */
    static getInstance(filePath?: string): ApiUsageTracker {
        if (!ApiUsageTracker.instance) {
            ApiUsageTracker.instance = new ApiUsageTracker(filePath);
        }
        return ApiUsageTracker.instance;
    }

    /**
     * Reset the singleton (for testing)
     */
    static resetInstance(): void {
        ApiUsageTracker.instance = null as any;
    }

    /**
     * Load usage data from file
     */
    private load(): ApiUsageData {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const data = JSON.parse(raw) as ApiUsageData;

                // Check if we need to reset (new month)
                if (this.shouldReset(data.resetDate)) {
                    logger.info('[ApiUsageTracker] Monthly reset triggered');
                    return this.createFreshData();
                }

                return data;
            }
        } catch (error) {
            logger.error('[ApiUsageTracker] Failed to load usage data', { error });
        }

        // Create new file
        return this.createFreshData();
    }

    /**
     * Create fresh usage data
     */
    private createFreshData(): ApiUsageData {
        const data: ApiUsageData = {
            count: 0,
            resetDate: this.getNextResetDate(),
            limit: this.DEFAULT_LIMIT,
        };
        this.save(data);
        return data;
    }

    /**
     * Get the next reset date (first day of next month)
     */
    private getNextResetDate(): string {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth.toISOString();
    }

    /**
     * Check if we should reset based on reset date
     */
    private shouldReset(resetDate: string): boolean {
        const reset = new Date(resetDate);
        const now = new Date();
        return now >= reset;
    }

    /**
     * Save usage data to file
     */
    private save(data: ApiUsageData): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            logger.error('[ApiUsageTracker] Failed to save usage data', { error });
        }
    }

    /**
     * Get remaining API calls
     */
    getRemaining(): number {
        return Math.max(0, this.data.limit - this.data.count);
    }

    /**
     * Get current usage count
     */
    getCount(): number {
        return this.data.count;
    }

    /**
     * Get usage limit
     */
    getLimit(): number {
        return this.data.limit;
    }

    /**
     * Get usage percentage (0-100)
     */
    getUsagePercentage(): number {
        return Math.round((this.data.count / this.data.limit) * 100);
    }

    /**
     * Check if we can make a request
     */
    canMakeRequest(): boolean {
        return this.getRemaining() > 0;
    }

    /**
     * Check if we should warn (>= 80% usage)
     */
    shouldWarn(): boolean {
        return this.getUsagePercentage() >= 80;
    }

    /**
     * Record a successful API request
     */
    recordRequest(): void {
        this.data.count += 1;
        this.save(this.data);
        logger.info(
            `[ApiUsageTracker] Request recorded. Usage: ${this.data.count}/${this.data.limit} (${this.getUsagePercentage()}%)`
        );

        if (this.shouldWarn() && !this.canMakeRequest()) {
            logger.warn('[ApiUsageTracker] API limit reached! No more requests until next reset.');
        } else if (this.shouldWarn()) {
            logger.warn(
                `[ApiUsageTracker] Warning: ${this.getUsagePercentage()}% of API limit used. ${this.getRemaining()} calls remaining.`
            );
        }
    }

    /**
     * Manually reset the counter (admin/testing)
     */
    reset(): void {
        logger.info('[ApiUsageTracker] Manual reset triggered');
        this.data = this.createFreshData();
    }

    /**
     * Get reset date
     */
    getResetDate(): Date {
        return new Date(this.data.resetDate);
    }

    /**
     * Set a custom limit (for testing or paid tier)
     */
    setLimit(limit: number): void {
        this.data.limit = limit;
        this.save(this.data);
        logger.info(`[ApiUsageTracker] Limit updated to ${limit}`);
    }
}
