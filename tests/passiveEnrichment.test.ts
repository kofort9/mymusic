import { getAudioFeatures, resetAudioProcessor } from '../src/audioProcessor';
import { checkIfTrackIsLiked } from '../src/spotifyClient';
import { ProviderFactory } from '../src/providers/factory';
import { AudioFeatureProvider } from '../src/providers/types';
import { prisma } from '../src/dbClient';

// Mock dependencies
jest.mock('../src/spotifyClient');
jest.mock('../src/providers/factory');
jest.mock('../src/dbClient', () => ({
    prisma: {
        track: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
    },
}));

describe('Passive Enrichment - Liked Songs Filtering', () => {
    let mockProvider: jest.Mocked<AudioFeatureProvider>;
    const mockTrackId = 'spotify:track:test123';
    const mockTrackName = 'Test Song';
    const mockArtist = 'Test Artist';
    const mockFeatures = {
        tempo: 128.0,
        key: 5,
        mode: 1,
        energy: 0.8,
        valence: 0.6,
        danceability: 0.7,
        acousticness: 0.1,
        instrumentalness: 0.0,
        liveness: 0.2,
        speechiness: 0.05,
        time_signature: 4,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        resetAudioProcessor();

        mockProvider = {
            getName: jest.fn().mockReturnValue('MockProvider'),
            isAvailable: jest.fn().mockResolvedValue(true),
            getAudioFeatures: jest.fn(),
        };

        (ProviderFactory.createProviderChain as jest.Mock).mockResolvedValue([mockProvider]);
        (ProviderFactory.getDefaultProvider as jest.Mock).mockReturnValue(mockProvider);
    });

    describe('when track is liked', () => {
        beforeEach(() => {
            (checkIfTrackIsLiked as jest.Mock).mockResolvedValue(true);
            (prisma.track.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.track.upsert as jest.Mock).mockResolvedValue({});
        });

        test('enriches track to database', async () => {
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);

            // Wait for passive enrichment to complete (it's async)
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(checkIfTrackIsLiked).toHaveBeenCalledWith(mockTrackId);
            expect(prisma.track.findUnique).toHaveBeenCalledWith({
                where: { spotifyId: mockTrackId },
            });
            expect(prisma.track.upsert).toHaveBeenCalled();
        });

        test('includes all audio features in database upsert', async () => {
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            await new Promise(resolve => setTimeout(resolve, 100));

            const upsertCall = (prisma.track.upsert as jest.Mock).mock.calls[0][0];
            expect(upsertCall.create.bpm).toBe(128.0);
            expect(upsertCall.create.key).toBe(5);
            expect(upsertCall.create.mode).toBe(1);
            expect(upsertCall.create.energy).toBe(0.8);
        });
    });

    describe('when track is NOT liked', () => {
        beforeEach(() => {
            (checkIfTrackIsLiked as jest.Mock).mockResolvedValue(false);
        });

        test('skips database enrichment', async () => {
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(checkIfTrackIsLiked).toHaveBeenCalledWith(mockTrackId);
            expect(prisma.track.findUnique).not.toHaveBeenCalled();
            expect(prisma.track.upsert).not.toHaveBeenCalled();
        });

        test('still returns features to caller', async () => {
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            const result = await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);

            expect(result).toEqual(mockFeatures);
        });

        test('still caches features in memory', async () => {
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            // First call
            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            expect(mockProvider.getAudioFeatures).toHaveBeenCalledTimes(1);

            jest.clearAllMocks();

            // Second call - should use cache
            const cachedResult = await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            expect(mockProvider.getAudioFeatures).not.toHaveBeenCalled();
            expect(cachedResult).toEqual(mockFeatures);
        });
    });

    describe('when checkIfTrackIsLiked fails', () => {
        beforeEach(() => {
            (checkIfTrackIsLiked as jest.Mock).mockRejectedValue(new Error('API error'));
        });

        test('does not enrich to database (safe default)', async () => {
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            await new Promise(resolve => setTimeout(resolve, 100));

            // checkIfTrackIsLiked returns false on error, so no DB write
            expect(prisma.track.upsert).not.toHaveBeenCalled();
        });

        test('still returns features to caller', async () => {
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            const result = await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            expect(result).toEqual(mockFeatures);
        });
    });

    describe('when track already exists in DB', () => {
        beforeEach(() => {
            (checkIfTrackIsLiked as jest.Mock).mockResolvedValue(true);
        });

        test('skips enrichment if track has complete features', async () => {
            (prisma.track.findUnique as jest.Mock).mockResolvedValue({
                spotifyId: mockTrackId,
                bpm: 128.0,
                key: 5,
                camelotKey: '8B',
            });
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(prisma.track.upsert).not.toHaveBeenCalled();
        });

        test('updates if track has incomplete BPM', async () => {
            (prisma.track.findUnique as jest.Mock).mockResolvedValue({
                spotifyId: mockTrackId,
                bpm: 0, // Incomplete
                key: 5,
            });
            (prisma.track.upsert as jest.Mock).mockResolvedValue({});
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(prisma.track.upsert).toHaveBeenCalled();
        });

        test('updates if track has incomplete key', async () => {
            (prisma.track.findUnique as jest.Mock).mockResolvedValue({
                spotifyId: mockTrackId,
                bpm: 128.0,
                key: -1, // Incomplete
            });
            (prisma.track.upsert as jest.Mock).mockResolvedValue({});
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(prisma.track.upsert).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        test('handles missing track name gracefully', async () => {
            (checkIfTrackIsLiked as jest.Mock).mockResolvedValue(true);
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, undefined, mockArtist);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should not attempt DB write without track name
            expect(prisma.track.upsert).not.toHaveBeenCalled();
        });

        test('handles missing artist gracefully', async () => {
            (checkIfTrackIsLiked as jest.Mock).mockResolvedValue(true);
            mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

            await getAudioFeatures(mockTrackId, mockTrackName, undefined);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should not attempt DB write without artist
            expect(prisma.track.upsert).not.toHaveBeenCalled();
        });

        test('handles missing features gracefully', async () => {
            (checkIfTrackIsLiked as jest.Mock).mockResolvedValue(true);
            mockProvider.getAudioFeatures.mockResolvedValue(null);

            await getAudioFeatures(mockTrackId, mockTrackName, mockArtist);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should not attempt DB write without features
            expect(prisma.track.upsert).not.toHaveBeenCalled();
        });
    });
});
