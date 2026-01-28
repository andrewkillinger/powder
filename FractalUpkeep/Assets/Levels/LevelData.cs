using System;
using System.Collections.Generic;
using UnityEngine;
using FractalUpkeep.Core;

namespace FractalUpkeep.Levels
{
    /// <summary>
    /// ScriptableObject defining a level's configuration
    /// </summary>
    [CreateAssetMenu(fileName = "Level_", menuName = "FractalUpkeep/Level Data")]
    public class LevelData : Core.LevelData
    {
        [Header("Identification")]
        [SerializeField] private string levelId;
        [SerializeField] private string levelName;
        [SerializeField] private string description;
        [SerializeField] private int levelNumber;
        [SerializeField] private int tierNumber = 1;

        [Header("Objectives")]
        [SerializeField] private LevelObjectiveType primaryObjective = LevelObjectiveType.ReachBeauty;
        [SerializeField] private float targetBeauty = 50f;
        [SerializeField] private float targetCoverage = 0.5f;
        [SerializeField] private float timeLimit = 120f;
        [SerializeField] private bool hasTimeLimit = true;

        [Header("Decay Settings")]
        [SerializeField] private float fadeIntensity = GameConstants.DEFAULT_FADE_RATE;
        [SerializeField] private bool decayEnabled = true;

        [Header("Starting Tools")]
        [SerializeField] private List<string> unlockedBrushes = new List<string>();
        [SerializeField] private List<string> unlockedPalettes = new List<string>();
        [SerializeField] private bool seedsUnlocked = false;
        [SerializeField] private bool mothsUnlocked = false;
        [SerializeField] private bool sealUnlocked = false;
        [SerializeField] private int startingSeedSlots = 0;
        [SerializeField] private int startingMothSlots = 0;

        [Header("Constraints")]
        [SerializeField] private float maxBrushSize = GameConstants.MAX_BRUSH_SIZE;
        [SerializeField] private int maxColors = 8;
        [SerializeField] private bool allowUndo = true;

        [Header("Rewards")]
        [SerializeField] private int sporeReward = GameConstants.SPORES_PER_LEVEL_COMPLETION;
        [SerializeField] private float pigmentBonus = 0f;
        [SerializeField] private List<string> unlockRewards = new List<string>();

        [Header("Visuals")]
        [SerializeField] private Sprite thumbnailSprite;
        [SerializeField] private Color[] levelPalette;
        [SerializeField] private Texture2D backgroundTexture;

        // Properties
        public string Id => levelId;
        public string Name => levelName;
        public string Description => description;
        public int Number => levelNumber;
        public int Tier => tierNumber;

        public LevelObjectiveType PrimaryObjective => primaryObjective;
        public float TargetBeauty => targetBeauty;
        public float TargetCoverage => targetCoverage;
        public float TimeLimit => timeLimit;
        public bool HasTimeLimit => hasTimeLimit;

        public float FadeIntensity => fadeIntensity;
        public bool DecayEnabled => decayEnabled;

        public List<string> UnlockedBrushes => unlockedBrushes;
        public List<string> UnlockedPalettes => unlockedPalettes;
        public bool SeedsUnlocked => seedsUnlocked;
        public bool MothsUnlocked => mothsUnlocked;
        public bool SealUnlocked => sealUnlocked;
        public int StartingSeedSlots => startingSeedSlots;
        public int StartingMothSlots => startingMothSlots;

        public float MaxBrushSize => maxBrushSize;
        public int MaxColors => maxColors;
        public bool AllowUndo => allowUndo;

        public int SporeReward => sporeReward;
        public float PigmentBonus => pigmentBonus;
        public List<string> UnlockRewards => unlockRewards;

        public Sprite Thumbnail => thumbnailSprite;
        public Color[] Palette => levelPalette;
        public Texture2D Background => backgroundTexture;

        public bool CheckObjectiveComplete(float currentBeauty, float currentCoverage, float elapsedTime)
        {
            switch (primaryObjective)
            {
                case LevelObjectiveType.ReachBeauty:
                    return currentBeauty >= targetBeauty;

                case LevelObjectiveType.ReachCoverage:
                    return currentCoverage >= targetCoverage;

                case LevelObjectiveType.SurviveTime:
                    return elapsedTime >= timeLimit && currentBeauty > 0;

                case LevelObjectiveType.BeautyAndCoverage:
                    return currentBeauty >= targetBeauty && currentCoverage >= targetCoverage;

                case LevelObjectiveType.MaintainBeauty:
                    return elapsedTime >= timeLimit && currentBeauty >= targetBeauty;

                default:
                    return false;
            }
        }

        public string GetObjectiveDescription()
        {
            switch (primaryObjective)
            {
                case LevelObjectiveType.ReachBeauty:
                    return $"Reach {targetBeauty:F0} Beauty";

                case LevelObjectiveType.ReachCoverage:
                    return $"Cover {targetCoverage * 100:F0}% of the canvas";

                case LevelObjectiveType.SurviveTime:
                    return $"Survive for {timeLimit:F0} seconds";

                case LevelObjectiveType.BeautyAndCoverage:
                    return $"Reach {targetBeauty:F0} Beauty with {targetCoverage * 100:F0}% coverage";

                case LevelObjectiveType.MaintainBeauty:
                    return $"Maintain {targetBeauty:F0} Beauty for {timeLimit:F0} seconds";

                default:
                    return "Unknown objective";
            }
        }

        public int CalculateScore(float finalBeauty, float finalCoverage, float timeRemaining)
        {
            float beautyScore = finalBeauty * 10f;
            float coverageScore = finalCoverage * 500f;
            float timeScore = hasTimeLimit ? (timeRemaining / timeLimit) * 200f : 0f;

            return Mathf.RoundToInt(beautyScore + coverageScore + timeScore);
        }

        private void OnValidate()
        {
            if (string.IsNullOrEmpty(levelId))
            {
                levelId = $"level_{levelNumber:D3}";
            }
        }
    }

    public enum LevelObjectiveType
    {
        ReachBeauty,
        ReachCoverage,
        SurviveTime,
        BeautyAndCoverage,
        MaintainBeauty
    }
}
