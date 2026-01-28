using UnityEngine;

namespace FractalUpkeep.Core
{
    /// <summary>
    /// Central constants and configuration values for the game
    /// </summary>
    public static class GameConstants
    {
        // Canvas Settings
        public const int DEFAULT_CANVAS_WIDTH = 1024;
        public const int DEFAULT_CANVAS_HEIGHT = 1024;
        public const int MIN_CANVAS_SIZE = 256;
        public const int MAX_CANVAS_SIZE = 2048;

        // Brush Settings
        public const float MIN_BRUSH_SIZE = 5f;
        public const float MAX_BRUSH_SIZE = 100f;
        public const float DEFAULT_BRUSH_SIZE = 20f;
        public const float MIN_EMISSION_RATE = 10f;
        public const float MAX_EMISSION_RATE = 500f;
        public const float DEFAULT_EMISSION_RATE = 100f;

        // Decay Settings
        public const float MIN_FADE_RATE = 0.001f;
        public const float MAX_FADE_RATE = 0.1f;
        public const float DEFAULT_FADE_RATE = 0.01f;

        // Currency Settings
        public const float PIGMENT_PER_BEAUTY_SECOND = 0.1f;
        public const int SPORES_PER_LEVEL_COMPLETION = 10;
        public const float PIGMENT_COST_MULTIPLIER = 1.15f;

        // Beauty Calculation
        public const float BEAUTY_SAMPLE_INTERVAL = 0.5f;
        public const int BEAUTY_SAMPLE_GRID_SIZE = 32;

        // Unit Settings
        public const float SEED_BASE_RADIUS = 30f;
        public const float SEED_BASE_RATE = 5f;
        public const float MOTH_BASE_SPEED = 50f;
        public const float MOTH_SEARCH_RADIUS = 100f;

        // Seal Mechanic
        public const float SEAL_DEFAULT_DURATION = 30f;
        public const float SEAL_FADE_REDUCTION = 0.8f;

        // Save System
        public const string SAVE_FILE_NAME = "fractal_save.json";
        public const int SAVE_VERSION = 1;

        // Gallery
        public const string GALLERY_FOLDER = "Gallery";
        public const int SNAPSHOT_WIDTH = 512;
        public const int SNAPSHOT_HEIGHT = 512;

        // Upgrade Costs (base values, scaled by PIGMENT_COST_MULTIPLIER)
        public const float BRUSH_SIZE_UPGRADE_BASE = 50f;
        public const float BRUSH_RATE_UPGRADE_BASE = 75f;
        public const float SEED_UPGRADE_BASE = 100f;
        public const float MOTH_UPGRADE_BASE = 150f;

        // Paths
        public const string LEVELS_PATH = "Levels/";
        public const string BRUSHES_PATH = "Brushes/";
        public const string PALETTES_PATH = "Palettes/";
        public const string UPGRADES_PATH = "Upgrades/";
    }
}
