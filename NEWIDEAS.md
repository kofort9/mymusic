🎧 Real-Time DJ Assistant (Stateless MVP)

🎯 Project Goal

To create a real-time, lightweight command-line application in TypeScript that analyzes the currently playing song on Spotify and instantly recommends harmonious and creative transition tracks.

⚙️ Architecture & Constraints

Technology Stack: TypeScript (Node.js/Bun) with a suitable Spotify Web API wrapper/SDK.

Data Flow: Stateless loop (Poll -> Process -> Filter -> Display).

Core Logic: Camelot Wheel Harmonic Mixing, BPM $\pm 10\%$ matching, and Phrase Match visualization.

⚠️ Data Source Contingency (Addressing API Deprecation)

The harmonic analysis of tracks relies entirely on the Spotify /audio-features endpoint, which is currently flagged as deprecated. To ensure project viability, the following plan is mandated:

Phase

Track Type

Primary Data Source

Contingency Plan (Required for Production)

MVP (Current)

Current Track

Spotify /audio-features (for key, mode, tempo)

None (Accepting immediate risk for quick feature development).

Production Ready

Current Track

Plan B: Replace Spotify call with a dedicated Music Analysis API (e.g., Audioscrobbler, or a specialized music DSP service).

The P1.4 Metadata Fetch function must be refactored to query the new third-party API instead of Spotify's /audio-features.

All Phases

Library Tracks

Local MOCK_LIBRARY (P3.1)

Plan C: Implement an incremental database solution (e.g., a local JSON file or Firestore) that stores the pre-analyzed camelot_key and bpm of tracks after their initial fetch.

📐 Responsiveness Rule (Window Size Handling)

The terminal UI must adapt dynamically to changes in the window size to prevent layout breaks and maintain visual clarity.

Detection: The application must listen for the Node.js process.stdout.on('resize', ...) event, which is triggered when the terminal window is resized.

Scaling: When a resize event is detected, the entire UI must be immediately redrawn. All horizontally scaled elements—specifically the main ASCII border, the Recommendations Table width, and the High-Res Progress Bar—must be recalculated based on the new process.stdout.columns value.

Minimum Width: The UI should enforce a minimum width (e.g., 80 characters) to ensure readability. If the window is smaller than the minimum, a simple warning message should be displayed instead of the full UI.

🎶 Time Signature Handling

The entire mixing engine logic (BPM, Phrase Counter) is based on the assumption of 4/4 Time Signature.

Detection: The application must read the time_signature field from the API response (or Plan B data source).

Constraint: If time_signature is not 4, the P4.3 Phrase Counter must be skipped, and a warning should be displayed, as the timing would be unreliable.

🏗️ Detailed Plan of Attack (Implementation Phases)

Phase 1: Core Setup and Data Extraction (Tasks 1.1, 1.2, 2.1)

Goal: Successfully connect to the Spotify API, handle authentication, and extract the raw metadata (tempo, key, mode) of the currently playing track.

Step

Task

Details

P1.1

Setup Environment

Initialize Node.js/TypeScript project. Install necessary libraries (spotify-web-api-node or equivalent, chalk for colors).

P1.2

Authentication

Implement the Spotify OAuth 2.0 flow. Configure the client to handle the access token and automatically manage the refresh token (using the wrapper).

P1.3

Smart Polling

Create the main poll() function that calls /me/player/currently-playing. Implement Smart Polling logic: poll frequently only when a track is about to end (duration_ms - progress_ms < 3000ms), otherwise poll every 10-15 seconds.

P1.4

Metadata Fetch

Extract the track_id from the poll response. Use it to call /audio-features and return the raw tempo, key, mode, and time_signature. (Contingency point for Plan B)

Phase 2: The Mixing Engine Brain (Tasks 2.2, 3.1)

Goal: Implement the static logic that converts raw Spotify data into actionable DJ mixing codes and defines the filtering rules.

Step

Task

Details

P2.1

Camelot Lookup Table

Implement the CAMELOT_MAPPING object/map (as discussed) to convert the 24 possible raw (key, mode) combinations into the corresponding 12A/12B Camelot Code.

P2.2

Harmonic Rule Functions

Create functions to calculate the ideal keys based on the current track's Camelot code: getSmoothKeys(K), getMoodKeys(K), and getEnergyKeys(K).

P2.3

Color Mapping

Integrate the src/camelotColors.ts map to link every Camelot code to its Hex color for UI rendering.

Phase 3: The Filter and Library (Task 3.2)

Goal: Define a static library of user tracks and run the real-time filtering process against it.

Step

Task

Details

P3.1

Static Library Mock

Create a library.ts file with the LibraryTrack interface and MOCK_LIBRARY array, containing id, title, artist, camelot_key, and bpm.

P3.2

BPM Range Function

Create a function to check if a potential match's BPM falls within the current track's BPM $\pm 10\%$.

P3.3

Filter Loop

Implement the main filtering function that iterates through the mock library, applying the Harmonic Rules (P2.2) and the BPM Range Check (P3.2). Output a list of matched tracks categorized by Shift Type (Smooth, Mood, Energy).

Phase 4: Output and Display (Tasks 4.1, 4.2)

Goal: Create the final "Train Board" UI, integrating the data, colors, and rhythmic cues.

Step

Task

Details

P4.1

UI Frame & Styling (Responsive)

Use chalk or a similar library to implement the main ASCII border and styling elements. Implement the resize listener as defined in the Responsiveness Rule.

P4.2

Now Playing Display

Render the current track's name, artist, and the centered metadata (BPM, Key). Use the Camelot Color (P2.3) to display the key.

P4.3

High-Res Progress Bar

Implement the visual progress bar (40+ characters long) and the time display. CRITICAL: Add the logic for the 32-Beat Phrase Counter display that counts down or shows the time remaining to the next perfect drop point, based on the track's BPM.

P4.4

Recommendations Table

Render the matched_tracks list (P3.3) into the clear table structure previously discussed, showing the Shift Type and Track/Artist details.

P4.5

Animation: Flip-Clock Song Transition

Implement a function that, when a new song ID is detected (in P1.3), runs a short, timed loop (e.g., 5-10 frames over 500ms). Each frame renders the new UI with the Song Title/Artist fields briefly cycling through random characters or numbers to simulate the old split-flap 'train board' changing, before settling on the final track data.