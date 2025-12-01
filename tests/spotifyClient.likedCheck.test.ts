import { checkIfTrackIsLiked } from '../src/spotifyClient';
import { spotifyApi } from '../src/auth';
import { logger } from '../src/utils/logger';

// Mock dependencies
jest.mock('../src/auth', () => ({
    spotifyApi: {
        containsMySavedTracks: jest.fn(),
    },
}));
jest.mock('../src/utils/logger');

describe('checkIfTrackIsLiked', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns true when track is liked', async () => {
        (spotifyApi.containsMySavedTracks as jest.Mock).mockResolvedValue({
            body: [true],
        });

        const result = await checkIfTrackIsLiked('spotify:track:123abc');
        expect(result).toBe(true);
        expect(spotifyApi.containsMySavedTracks).toHaveBeenCalledWith(['123abc']);
    });

    test('returns false when track is not liked', async () => {
        (spotifyApi.containsMySavedTracks as jest.Mock).mockResolvedValue({
            body: [false],
        });

        const result = await checkIfTrackIsLiked('spotify:track:456def');
        expect(result).toBe(false);
        expect(spotifyApi.containsMySavedTracks).toHaveBeenCalledWith(['456def']);
    });

    test('strips spotify:track: prefix from full URI', async () => {
        (spotifyApi.containsMySavedTracks as jest.Mock).mockResolvedValue({
            body: [true],
        });

        await checkIfTrackIsLiked('spotify:track:abc123xyz');
        expect(spotifyApi.containsMySavedTracks).toHaveBeenCalledWith(['abc123xyz']);
    });

    test('works with bare track ID (no prefix)', async () => {
        (spotifyApi.containsMySavedTracks as jest.Mock).mockResolvedValue({
            body: [true],
        });

        await checkIfTrackIsLiked('bareTrackId789');
        expect(spotifyApi.containsMySavedTracks).toHaveBeenCalledWith(['bareTrackId789']);
    });

    test('handles API errors gracefully and returns false', async () => {
        const error = new Error('API Error');
        (spotifyApi.containsMySavedTracks as jest.Mock).mockRejectedValue(error);

        const result = await checkIfTrackIsLiked('spotify:track:errorTrack');
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            'Failed to check if track is liked: spotify:track:errorTrack',
            { error }
        );
    });

    test('handles network errors gracefully', async () => {
        const networkError = new Error('Network timeout');
        (spotifyApi.containsMySavedTracks as jest.Mock).mockRejectedValue(networkError);

        const result = await checkIfTrackIsLiked('spotify:track:networkIssue');
        expect(result).toBe(false);
    });

    test('returns false when response body is undefined', async () => {
        (spotifyApi.containsMySavedTracks as jest.Mock).mockResolvedValue({
            body: [undefined],
        });

        const result = await checkIfTrackIsLiked('spotify:track:undefinedResponse');
        expect(result).toBe(false);
    });

    test('returns false when response body is null', async () => {
        (spotifyApi.containsMySavedTracks as jest.Mock).mockResolvedValue({
            body: [null],
        });

        const result = await checkIfTrackIsLiked('spotify:track:nullResponse');
        expect(result).toBe(false);
    });

    test('handles 401 unauthorized errors', async () => {
        const authError = { statusCode: 401, message: 'Unauthorized' };
        (spotifyApi.containsMySavedTracks as jest.Mock).mockRejectedValue(authError);

        const result = await checkIfTrackIsLiked('spotify:track:authError');
        expect(result).toBe(false);
    });

    test('handles 429 rate limit errors', async () => {
        const rateLimitError = { statusCode: 429, message: 'Too Many Requests' };
        (spotifyApi.containsMySavedTracks as jest.Mock).mockRejectedValue(rateLimitError);

        const result = await checkIfTrackIsLiked('spotify:track:rateLimit');
        expect(result).toBe(false);
    });

    test('handles malformed response gracefully', async () => {
        (spotifyApi.containsMySavedTracks as jest.Mock).mockResolvedValue({
            body: 'not an array',
        });

        const result = await checkIfTrackIsLiked('spotify:track:malformed');
        // Should handle the malformed response and not throw
        expect(result).toBe(false);
    });

    test('handles empty response body', async () => {
        (spotifyApi.containsMySavedTracks as jest.Mock).mockResolvedValue({
            body: [],
        });

        const result = await checkIfTrackIsLiked('spotify:track:emptyResponse');
        expect(result).toBe(false);
    });
});
