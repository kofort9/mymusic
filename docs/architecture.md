# System Architecture

## Overview

The Real-Time DJ Assistant is a Node.js application that integrates with Spotify and other APIs to provide real-time harmonic mixing recommendations.

## Architecture Diagram

```mermaid
graph TD
    User[User / DJ] -->|Interacts| TUI[Terminal UI]
    TUI -->|Displays| Display[Display Module]
    
    subgraph Core Logic
        Main[Main Loop] -->|Orchestrates| AudioProc[Audio Processor]
        Main -->|Polls| SpotifyClient[Spotify Client]
        Main -->|Queries| MixingEngine[Mixing Engine]
        Main -->|Manages| Library[Library Manager]
    end
    
    subgraph Data Providers
        AudioProc -->|Fetches| ProviderFactory[Provider Factory]
        ProviderFactory -->|Uses| SpotifyProv[Spotify Provider]
        ProviderFactory -->|Uses| CustomProv[Custom API Provider]
        ProviderFactory -->|Uses| DBProv[Database Provider]
    end
    
    subgraph External Services
        SpotifyClient -->|API| SpotifyAPI[Spotify Web API]
        SpotifyProv -->|API| SpotifyAPI
        CustomProv -->|API| SongBPM[SongBPM / Parse.bot]
    end
    
    subgraph Persistence
        Library -->|Reads/Writes| CSV[Library CSV]
        DBProv -->|Reads| LocalDB[Local Database]
    end
    
    subgraph Utilities
        Logger[Winston Logger]
        CircuitBreaker[Circuit Breaker]
        RateLimiter[Rate Limiter]
    end
    
    SpotifyProv -.->|Uses| CircuitBreaker
    CustomProv -.->|Uses| CircuitBreaker
    SpotifyProv -.->|Uses| RateLimiter
    CustomProv -.->|Uses| RateLimiter
    
    Main -.->|Logs| Logger
```

## Components

- **Main Loop**: Orchestrates the application lifecycle, polling, and UI updates.
- **Spotify Client**: Handles authentication and polling current playback state.
- **Audio Processor**: Fetches and caches audio features (BPM, Key) for tracks.
- **Mixing Engine**: Calculates harmonic compatibility based on Camelot Wheel.
- **Providers**: Pluggable modules for fetching audio data from different sources.
- **TUI**: Renders the "Train Board" style interface.
