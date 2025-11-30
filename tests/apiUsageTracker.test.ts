import { ApiUsageTracker } from '../src/utils/apiUsageTracker';
import fs from 'fs';
import path from 'path';

describe('ApiUsageTracker', () => {
    let tracker: ApiUsageTracker;
    let testFilePath: string;

    beforeEach(() => {
        // Use a test-specific file path
        testFilePath = path.join(process.cwd(), '.api_usage_test.json');

        // Clean up any existing test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        // Reset singleton
        ApiUsageTracker.resetInstance();

        // Create tracker with test file path
        tracker = ApiUsageTracker.getInstance(testFilePath);
    });

    afterEach(() => {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
        ApiUsageTracker.resetInstance();
    });

    describe('Initialization', () => {
        it('should create a new tracker with default values', () => {
            expect(tracker.getCount()).toBe(0);
            expect(tracker.getLimit()).toBe(100);
            expect(tracker.getRemaining()).toBe(100);
        });

        it('should persist data to file', () => {
            expect(fs.existsSync(testFilePath)).toBe(true);
            const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
            expect(data.count).toBe(0);
            expect(data.limit).toBe(100);
        });

        it('should load existing data from file', () => {
            // Record some requests
            tracker.recordRequest();
            tracker.recordRequest();

            // Reset and create new instance
            ApiUsageTracker.resetInstance();
            const newTracker = ApiUsageTracker.getInstance(testFilePath);

            expect(newTracker.getCount()).toBe(2);
        });
    });

    describe('Request Recording', () => {
        it('should increment count on recordRequest', () => {
            tracker.recordRequest();
            expect(tracker.getCount()).toBe(1);

            tracker.recordRequest();
            expect(tracker.getCount()).toBe(2);
        });

        it('should update remaining count', () => {
            expect(tracker.getRemaining()).toBe(100);

            tracker.recordRequest();
            expect(tracker.getRemaining()).toBe(99);

            tracker.recordRequest();
            expect(tracker.getRemaining()).toBe(98);
        });

        it('should persist updates to file', () => {
            tracker.recordRequest();

            const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
            expect(data.count).toBe(1);
        });
    });

    describe('Limit Enforcement', () => {
        it('should allow requests when under limit', () => {
            expect(tracker.canMakeRequest()).toBe(true);
        });

        it('should block requests when at limit', () => {
            // Set limit to 5 for easier testing
            tracker.setLimit(5);

            for (let i = 0; i < 5; i++) {
                tracker.recordRequest();
            }

            expect(tracker.canMakeRequest()).toBe(false);
            expect(tracker.getRemaining()).toBe(0);
        });

        it('should calculate usage percentage correctly', () => {
            tracker.setLimit(100);

            expect(tracker.getUsagePercentage()).toBe(0);

            for (let i = 0; i < 50; i++) {
                tracker.recordRequest();
            }

            expect(tracker.getUsagePercentage()).toBe(50);
        });

        it('should warn at 80% usage', () => {
            tracker.setLimit(10);

            for (let i = 0; i < 7; i++) {
                tracker.recordRequest();
            }

            expect(tracker.shouldWarn()).toBe(false);

            tracker.recordRequest(); // 80%
            expect(tracker.shouldWarn()).toBe(true);
        });
    });

    describe('Monthly Reset', () => {
        it('should reset count on manual reset', () => {
            tracker.recordRequest();
            tracker.recordRequest();

            expect(tracker.getCount()).toBe(2);

            tracker.reset();

            expect(tracker.getCount()).toBe(0);
            expect(tracker.getRemaining()).toBe(100);
        });

        it('should set new reset date on reset', async () => {
            const initialResetDate = tracker.getResetDate();

            // Wait a bit to ensure different timestamp
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(100); // Increased delay for reliable test

            tracker.reset();
            const newResetDate = tracker.getResetDate();

            expect(newResetDate.getTime()).toBeGreaterThanOrEqual(initialResetDate.getTime());
        });

        it('should auto-reset when reset date is in the past', () => {
            // Manually write a file with past reset date
            const pastData = {
                count: 50,
                resetDate: new Date(2020, 0, 1).toISOString(),
                limit: 100,
            };

            fs.writeFileSync(testFilePath, JSON.stringify(pastData));

            // Reset and load
            ApiUsageTracker.resetInstance();
            const newTracker = ApiUsageTracker.getInstance(testFilePath);

            // Should have auto-reset
            expect(newTracker.getCount()).toBe(0);
        });
    });

    describe('Custom Limits', () => {
        it('should allow setting custom limit', () => {
            tracker.setLimit(200);

            expect(tracker.getLimit()).toBe(200);
            expect(tracker.getRemaining()).toBe(200);
        });

        it('should persist custom limit', () => {
            tracker.setLimit(150);

            const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
            expect(data.limit).toBe(150);
        });
    });

    describe('Edge Cases', () => {
        it('should handle corrupted file gracefully', () => {
            fs.writeFileSync(testFilePath, 'invalid json');

            ApiUsageTracker.resetInstance();
            const newTracker = ApiUsageTracker.getInstance(testFilePath);

            expect(newTracker.getCount()).toBe(0);
        });

        it('should never return negative remaining count', () => {
            tracker.setLimit(2);

            for (let i = 0; i < 5; i++) {
                tracker.recordRequest();
            }

            expect(tracker.getRemaining()).toBe(0);
            expect(tracker.getRemaining()).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance on multiple calls', () => {
            const instance1 = ApiUsageTracker.getInstance(testFilePath);
            const instance2 = ApiUsageTracker.getInstance(testFilePath);

            expect(instance1).toBe(instance2);
        });

        it('should maintain state across getInstance calls', () => {
            const instance1 = ApiUsageTracker.getInstance(testFilePath);
            instance1.recordRequest();

            const instance2 = ApiUsageTracker.getInstance(testFilePath);
            expect(instance2.getCount()).toBe(1);
        });
    });
});
