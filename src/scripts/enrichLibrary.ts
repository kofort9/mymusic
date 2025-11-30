import { PrismaClient } from '@prisma/client';
import { CustomApiProvider } from '../providers/customApiProvider';
import { ApiUsageTracker } from '../utils/apiUsageTracker';
import { convertToCamelot } from '../camelot';
import readline from 'readline';

const prisma = new PrismaClient();
const provider = new CustomApiProvider();
const tracker = ApiUsageTracker.getInstance();

interface EnrichmentOptions {
    limit?: number;
    interactive?: boolean;
}

/**
 * Query tracks that need enrichment (missing BPM or Key)
 */
async function getIncompleteTracks() {
    return prisma.track.findMany({
        where: {
            OR: [{ bpm: 0 }, { key: -1 }],
        },
        select: {
            id: true,
            spotifyId: true,
            title: true,
            artist: true,
            bpm: true,
            key: true,
            mode: true,
        },
    });
}

/**
 * Enrich a single track
 */
async function enrichTrack(track: any): Promise<boolean> {
    try {
        console.log(`Enriching: ${track.title} - ${track.artist}`);

        const features = await provider.getAudioFeatures(track.spotifyId, track.title, track.artist);

        if (!features) {
            console.log(`  ❌ No features found`);
            return false;
        }

        const camelotKey = convertToCamelot(features.key, features.mode);

        await prisma.track.update({
            where: { id: track.id },
            data: {
                bpm: features.tempo,
                key: features.key,
                mode: features.mode,
                camelotKey,
                timeSignature: features.time_signature || 4,
            },
        });

        console.log(`  ✅ Updated: BPM=${features.tempo}, Key=${camelotKey}`);
        return true;
    } catch (error) {
        console.error(`  ❌ Error: ${(error as Error).message}`);
        return false;
    }
}

/**
 * Prompt user for input
 */
function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * Main enrichment function
 */
export async function enrichLibrary(options: EnrichmentOptions = {}): Promise<void> {
    console.log('🔍 Scanning library for incomplete tracks...\n');

    const incompleteTracks = await getIncompleteTracks();

    if (incompleteTracks.length === 0) {
        console.log('✅ All tracks have complete audio features!');
        return;
    }

    console.log(`Found ${incompleteTracks.length} track(s) missing features\n`);
    console.log(`📊 API Status: ${tracker.getCount()}/${tracker.getLimit()} used\n`);

    if (!tracker.canMakeRequest()) {
        console.log(
            `❌ API limit reached! Resets on ${tracker.getResetDate().toLocaleDateString()}\n`
        );
        return;
    }

    // Determine how many we can enrich
    const remaining = tracker.getRemaining();
    const maxEnrich = Math.min(incompleteTracks.length, remaining);

    if (options.interactive !== false) {
        console.log(`Batch Options:`);
        console.log(`[1] Enrich all ${incompleteTracks.length} tracks (uses ${incompleteTracks.length} API calls)`);
        console.log(`[2] Enrich top ${Math.min(10, maxEnrich)} tracks`);
        console.log(`[3] Cancel\n`);

        const choice = await prompt('Select option: ');

        if (choice === '3' || choice.toLowerCase() === 'c') {
            console.log('Cancelled.');
            return;
        }

        if (choice === '2') {
            options.limit = Math.min(10, maxEnrich);
        } else if (choice !== '1') {
            console.log('Invalid choice.');
            return;
        }
    }

    const tracksToProcess = options.limit
        ? incompleteTracks.slice(0, options.limit)
        : incompleteTracks;

    console.log(`\n📥 Enriching ${tracksToProcess.length} track(s)...\n`);

    let enriched = 0;
    let failed = 0;

    for (let i = 0; i < tracksToProcess.length; i++) {
        const track = tracksToProcess[i];
        const progress = Math.round(((i + 1) / tracksToProcess.length) * 100);
        const bar = '='.repeat(Math.floor(progress / 5)) + '>';
        const spaces = ' '.repeat(20 - bar.length);

        console.log(`\n[${bar}${spaces}] ${i + 1}/${tracksToProcess.length} (${progress}%)`);
        console.log(`API: ${tracker.getCount()}/${tracker.getLimit()} used\n`);

        const success = await enrichTrack(track);
        if (success) {
            enriched++;
        } else {
            failed++;
        }

        // Check if we've hit the limit
        if (!tracker.canMakeRequest()) {
            console.log('\n⚠️  API limit reached! Stopping enrichment.');
            break;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Enrichment Summary:');
    console.log(`✅ Enriched: ${enriched}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💾 API Calls Used: ${tracker.getCount()}/${tracker.getLimit()}`);
    console.log(`📊 Remaining: ${tracker.getRemaining()}`);
    console.log('='.repeat(50) + '\n');
}

// CLI usage
if (require.main === module) {
    enrichLibrary()
        .then(async () => {
            await prisma.$disconnect();
            process.exit(0);
        })
        .catch(async error => {
            console.error('Fatal error:', error);
            await prisma.$disconnect();
            process.exit(1);
        });
}
