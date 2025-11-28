import { getAudioFeatures, resetAudioProcessor } from './audioProcessor';

async function testProviders() {
  console.log('=== Testing Audio Feature Providers ===\n');

  // Reset to ensure fresh provider initialization
  resetAudioProcessor();

  console.log('Environment:');
  console.log(`AUDIO_FEATURE_PROVIDER=${process.env.AUDIO_FEATURE_PROVIDER || 'not set'}`);
  console.log(`DATABASE_URL=${process.env.DATABASE_URL || 'not set'}`);
  console.log('');

  // Test with a track that should be in the database
  const testTrackId = 'spotify:track:2uuJs2nltcYFh9pkKP7bW4'; // "Show Me" by Joey Bada$$

  console.log(`Testing with track ID: ${testTrackId}`);
  console.log('Expected: Should find in database first\n');

  const features = await getAudioFeatures(testTrackId, 'Show Me', 'Joey Bada$$');

  if (features) {
    console.log('\n✅ Success! Got features:');
    console.log(`  BPM: ${features.tempo}`);
    console.log(`  Key: ${features.key}`);
    console.log(`  Mode: ${features.mode}`);
  } else {
    console.log('\n❌ Failed to get features');
  }

  console.log('\n=== END TEST ===');
}

testProviders()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .then(() => process.exit(0));
