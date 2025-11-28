/**
 * Animation utilities for train board flip-clock effect
 */

const ANIMATION_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*-+=?';
const ANIMATION_FRAMES = 8;
const FRAME_DURATION_MS = 60;

/**
 * Generate a random character for animation
 */
function randomChar(): string {
  return ANIMATION_CHARS[Math.floor(Math.random() * ANIMATION_CHARS.length)];
}

/**
 * Generate animated version of text that progressively reveals the final text
 * @param finalText The final text to display
 * @param frame Current animation frame (0 to ANIMATION_FRAMES)
 * @returns Partially animated text
 */
export function animateText(finalText: string, frame: number): string {
  if (frame >= ANIMATION_FRAMES) {
    return finalText;
  }

  const progress = frame / ANIMATION_FRAMES;
  const revealUpTo = Math.floor(finalText.length * progress);

  let result = '';
  for (let i = 0; i < finalText.length; i++) {
    if (i < revealUpTo) {
      // Already revealed
      result += finalText[i];
    } else if (finalText[i] === ' ' || finalText[i] === '-' || finalText[i] === ',') {
      // Keep punctuation and spaces
      result += finalText[i];
    } else {
      // Still animating
      result += randomChar();
    }
  }

  return result;
}

/**
 * Run flip-clock animation for track name and artist
 * @param trackName Final track name
 * @param artist Final artist name
 * @param onFrame Callback for each animation frame
 * @returns Promise that resolves when animation completes
 */
export async function runFlipClockAnimation(
  trackName: string,
  artist: string,
  onFrame: (animatedTrack: string, animatedArtist: string) => void
): Promise<void> {
  for (let frame = 0; frame <= ANIMATION_FRAMES; frame++) {
    const animatedTrack = animateText(trackName, frame);
    const animatedArtist = animateText(artist, frame);
    
    onFrame(animatedTrack, animatedArtist);
    
    if (frame < ANIMATION_FRAMES) {
      await new Promise(resolve => setTimeout(resolve, FRAME_DURATION_MS));
    }
  }
}

