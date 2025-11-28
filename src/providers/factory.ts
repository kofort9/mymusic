import { AudioFeatureProvider } from './types';
import { SpotifyProvider } from './spotifyProvider';
import { CustomApiProvider } from './customApiProvider';
import { Logger } from '../logger';

/**
 * Provider Factory
 * 
 * Creates and configures audio feature providers based on environment configuration.
 * Supports fallback chains for redundancy.
 */
export class ProviderFactory {
  private static providers: Map<string, AudioFeatureProvider> = new Map();

  /**
   * Get or create a provider by name
   */
  static getProvider(name: string): AudioFeatureProvider | null {
    const normalized = name.toLowerCase();
    
    // Return cached provider if available
    if (this.providers.has(normalized)) {
      return this.providers.get(normalized)!;
    }

    // Create new provider
    let provider: AudioFeatureProvider | null = null;

    switch (normalized) {
      case 'spotify':
        provider = new SpotifyProvider();
        break;
      case 'custom':
      case 'customapi':
      case 'songbpm':
        provider = new CustomApiProvider();
        break;
      default:
        Logger.error(`Unknown provider: ${name}`);
        return null;
    }

    // Cache and return
    this.providers.set(normalized, provider);
    return provider;
  }

  /**
   * Create a provider chain with fallbacks
   * @param providerNames Array of provider names, first is primary
   */
  static async createProviderChain(providerNames: string[]): Promise<AudioFeatureProvider[]> {
    const providers: AudioFeatureProvider[] = [];

    for (const name of providerNames) {
      const provider = this.getProvider(name);
      if (provider) {
        const available = await provider.isAvailable();
        if (available) {
          providers.push(provider);
          Logger.log(`Provider ${provider.getName()} is available`);
        } else {
          Logger.log(`Provider ${provider.getName()} is not available, skipping`);
        }
      }
    }

    return providers;
  }

  /**
   * Get default provider from environment or use Spotify as fallback
   */
  static getDefaultProvider(): AudioFeatureProvider {
    const providerName = process.env.AUDIO_FEATURE_PROVIDER || 'spotify';
    const provider = this.getProvider(providerName);
    
    if (!provider) {
      Logger.log(`Failed to load ${providerName}, falling back to Spotify`);
      return this.getProvider('spotify')!;
    }

    return provider;
  }
}

