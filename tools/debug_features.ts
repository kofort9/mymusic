
import { authenticate, spotifyApi } from '../src/auth';
import { getAudioFeatures } from '../src/audioProcessor';

async function run() {
    try {
        console.log("Authenticating...");
        await authenticate();
        console.log("Authenticated.");

        const testId = "4cOdK2wGLETKBW3PvgPWqT"; // Never Gonna Give You Up
        console.log(`Fetching features for ${testId}...`);
        
        const features = await getAudioFeatures(testId);
        console.log("Features result:", features);
        
        // Also try to get currently playing to see its ID
        const current = await spotifyApi.getMyCurrentPlayingTrack();
        if (current.body && current.body.item) {
             const item = current.body.item as SpotifyApi.TrackObjectFull;
             console.log(`Currently Playing: ${item.name} (${item.id})`);
             if (item.id) {
                 const currentFeatures = await getAudioFeatures(item.id);
                 console.log("Current Track Features:", currentFeatures);
             }
        } else {
            console.log("Nothing playing or invalid response");
        }

    } catch (e) {
        console.error("Debug Script Error:", e);
    }
}

run();

