# FractalUpkeep

A level-based art game for iOS featuring particle-ink brushing, automation units, and fade decay mechanics. Players create art while battling entropy through painting and strategic unit placement.

## Overview

FractalUpkeep is an idle/clicker-style art game where players:
- Paint on a digital canvas using touch controls
- Battle against fade decay that slowly erases their work
- Unlock and deploy automation units (Seeds, Moths) to help maintain art
- Progress through levels with increasing difficulty and unlock new tools
- Earn currencies (Pigment and Spores) to upgrade abilities and unlock content

## Requirements

- **Unity Version**: 2022.3 LTS or 2023.x LTS
- **Target Platform**: iOS (iPhone/iPad)
- **Minimum iOS Version**: 13.0

## Project Structure

```
FractalUpkeep/
├── Assets/
│   ├── Core/           # Core systems, managers, events, constants
│   ├── Canvas/         # RenderTexture canvas, brush controller, particle system
│   ├── Sim/            # Simulation, decay, beauty calculation
│   ├── Units/          # Automation units (Seed, Moth)
│   ├── Levels/         # Level system, data, gallery manager
│   ├── UI/             # All UI screens and components
│   ├── Content/        # ScriptableObject assets (levels, brushes, palettes, upgrades)
│   ├── Resources/      # Runtime-loaded assets
│   ├── Scenes/         # Unity scenes
│   ├── Editor/         # Editor-only scripts
│   └── Tests/          # Play-mode smoke tests
├── ProjectSettings/    # Unity project configuration
├── Packages/           # Package manifest
└── README.md
```

## Building for iOS

### Prerequisites

1. macOS with Xcode installed (14.0+ recommended)
2. Apple Developer account (for device deployment)
3. iOS device or simulator for testing

### Build Steps

1. **Open the Project**
   ```bash
   # Open Unity Hub and add the FractalUpkeep folder
   # Or open directly with Unity 2022.3+
   ```

2. **Configure Build Settings**
   - Go to `File > Build Settings`
   - Select `iOS` platform
   - Click `Switch Platform` if needed

3. **Configure Player Settings**
   - Go to `Edit > Project Settings > Player`
   - iOS tab settings:
     - Bundle Identifier: `com.yourcompany.fractalupkeep`
     - Version: `1.0.0`
     - Target minimum iOS Version: `13.0`
     - Architecture: `ARM64`

4. **Build the Xcode Project**
   ```bash
   # In Unity: File > Build Settings > Build
   # Select a folder for the Xcode project output
   ```

5. **Open in Xcode and Deploy**
   ```bash
   open /path/to/build/Unity-iPhone.xcodeproj
   ```
   - Select your development team
   - Connect your iOS device
   - Build and run (Cmd+R)

### Build Configurations

- **Development Build**: Enable for debugging, profiler support
- **IL2CPP**: Required for iOS (set automatically)
- **Script Debugging**: Enable for development builds only

## How to Add a New Level

### Step 1: Create the Level Asset

1. In Unity, navigate to `Assets/Content/Levels/`
2. Right-click and select `Create > FractalUpkeep > Level Data`
3. Name it following the convention: `Level_XXX_LevelName.asset`

### Step 2: Configure Level Properties

Open the new asset and configure:

```yaml
# Identification
levelId: "level_xxx"           # Unique identifier
levelName: "Your Level Name"   # Display name
description: "Level description shown to player"
levelNumber: 11                # Sequential number
tierNumber: 1-3                # Difficulty tier

# Objectives (choose one primary objective type)
primaryObjective:
  - 0: ReachBeauty       # Reach target beauty score
  - 1: ReachCoverage     # Cover percentage of canvas
  - 2: SurviveTime       # Survive for duration
  - 3: BeautyAndCoverage # Both beauty and coverage
  - 4: MaintainBeauty    # Keep beauty above threshold for duration

targetBeauty: 50.0       # Target beauty score (0-100)
targetCoverage: 0.5      # Target coverage (0.0-1.0)
timeLimit: 120           # Time limit in seconds
hasTimeLimit: true       # Whether time limit applies

# Decay Settings
fadeIntensity: 0.01      # Decay rate (0.001-0.1)
decayEnabled: true       # Whether decay is active

# Available Tools
seedsUnlocked: true      # Can player use seeds?
mothsUnlocked: true      # Can player use moths?
sealUnlocked: false      # Can player use seals?
startingSeedSlots: 3     # Max seeds player can place
startingMothSlots: 2     # Max moths player can place

# Rewards
sporeReward: 10          # Spores awarded on completion
pigmentBonus: 100        # Bonus pigment awarded

# Color Palette (array of RGBA colors)
levelPalette:
  - { r: 0.1, g: 0.1, b: 0.1, a: 1 }
  - { r: 0.3, g: 0.2, b: 0.1, a: 1 }
  # Add 4-8 colors for the level's palette
```

### Step 3: Test the Level

1. Enter Play Mode in Unity
2. Navigate to Level Select
3. Find and play your new level
4. Iterate on difficulty settings as needed

### Level Design Tips

- **Tier 1 (Beginner)**: Low fade rate (0.005-0.01), generous time, simple objectives
- **Tier 2 (Intermediate)**: Medium fade (0.01-0.02), introduce units, combined objectives
- **Tier 3 (Advanced)**: High fade (0.02+), require strategic unit placement, tight timing

## Game Systems

### Currencies

| Currency | Earned From | Used For |
|----------|-------------|----------|
| **Pigment** | Beauty over time, level completion | Placing units, upgrades |
| **Spores** | Level completion rewards | Unlocking new content |

### Automation Units

| Unit | Behavior | Use Case |
|------|----------|----------|
| **Seed** | Stationary emitter, paints slowly in radius | Continuous coverage |
| **Moth** | Mobile unit, seeks faded areas and repaints | Maintenance/repair |

### Upgrades (Purchased with Pigment)

- Brush Size: Increase maximum brush size
- Brush Rate: Increase emission rate
- Seed Efficiency: Seeds paint faster
- Moth Speed: Moths move faster
- Fade Resistance: Reduce decay rate
- Pigment Generation: Earn more pigment from beauty

### Unlocks (Purchased with Spores)

- New brush presets
- Color palettes
- Unit types
- Level tiers

## Running Tests

### Play Mode Tests

```bash
# In Unity:
# Window > General > Test Runner
# Select PlayMode tab
# Click "Run All"
```

### Test Coverage

The smoke tests verify:
- ✅ Save/Load system preserves data correctly
- ✅ Levels load and start properly
- ✅ Decay reduces beauty over time
- ✅ Brush painting increases beauty
- ✅ Currency add/spend operations work
- ✅ Canvas operations (paint, clear, sample)
- ✅ Seal mechanic placement and expiration

## Architecture

### Core Pattern

The game uses a singleton-based manager pattern with event-driven communication:

```
GameManager (singleton)
├── CanvasManager      # RenderTexture-based painting
├── SimulationManager  # Decay, beauty calculation
├── LevelManager       # Level loading, objectives
├── UnitManager        # Seed/Moth automation
├── CurrencyManager    # Pigment/Spores
├── ProgressionManager # Upgrades/Unlocks
└── SaveManager        # Persistence
```

### Event System

`GameEvents.cs` provides centralized events:
```csharp
GameEvents.OnBeautyChanged += (float beauty) => { };
GameEvents.OnLevelCompleted += (LevelData level) => { };
GameEvents.OnPigmentEarned += (float amount) => { };
```

### Data-Driven Design

All content uses ScriptableObjects:
- `LevelData` - Level configuration
- `UpgradeDefinition` - Upgrade stats and costs
- `UnlockDefinition` - Unlock requirements
- `BrushPreset` - Brush properties
- `PaletteDefinition` - Color palettes

## Performance Notes

### iOS Optimization

- Target 60 FPS on modern iPhones
- Canvas uses RenderTexture (GPU-friendly)
- Particle system has configurable max count
- Beauty calculation uses downsampled grid
- Decay applied at configurable intervals

### Memory Management

- Snapshots saved as compressed PNGs
- Gallery limits stored images (default: 100)
- RenderTextures properly disposed

## Known Limitations

- Pinch zoom is not implemented in MVP
- Custom compute shaders for particle GPU path not included
- Paper grain post-effect requires custom shader
- Bloom effect requires URP post-processing setup

## License

Copyright (c) 2024. All rights reserved.
