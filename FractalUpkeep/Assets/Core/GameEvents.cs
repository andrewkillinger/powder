using System;
using UnityEngine;

namespace FractalUpkeep.Core
{
    /// <summary>
    /// Central event system for game-wide communication
    /// </summary>
    public static class GameEvents
    {
        // Canvas Events
        public static event Action<Vector2, Color, float> OnBrushStroke;
        public static event Action OnCanvasCleared;
        public static event Action<float> OnBeautyChanged;
        public static event Action<float> OnCoverageChanged;

        // Currency Events
        public static event Action<float> OnPigmentChanged;
        public static event Action<int> OnSporesChanged;
        public static event Action<float> OnPigmentEarned;
        public static event Action<int> OnSporesEarned;

        // Level Events
        public static event Action<LevelData> OnLevelStarted;
        public static event Action<LevelData, bool> OnLevelEnded;
        public static event Action<LevelData> OnLevelCompleted;
        public static event Action<float> OnLevelTimeUpdated;
        public static event Action<string> OnObjectiveProgress;

        // Unit Events
        public static event Action<UnitType, Vector2> OnUnitPlaced;
        public static event Action<UnitType, int> OnUnitUpgraded;
        public static event Action<UnitType> OnUnitUnlocked;

        // Progression Events
        public static event Action<UpgradeData> OnUpgradePurchased;
        public static event Action<UnlockData> OnItemUnlocked;
        public static event Action OnProgressionLoaded;

        // UI Events
        public static event Action OnPauseRequested;
        public static event Action OnResumeRequested;
        public static event Action<string> OnScreenChanged;

        // Save Events
        public static event Action OnSaveRequested;
        public static event Action OnLoadCompleted;

        // Seal Events
        public static event Action<Vector2, float, float> OnSealPlaced;
        public static event Action<Vector2> OnSealExpired;

        // Gallery Events
        public static event Action<string, Texture2D> OnSnapshotTaken;

        // Invoke Methods
        public static void InvokeBrushStroke(Vector2 position, Color color, float size)
            => OnBrushStroke?.Invoke(position, color, size);

        public static void InvokeCanvasCleared()
            => OnCanvasCleared?.Invoke();

        public static void InvokeBeautyChanged(float beauty)
            => OnBeautyChanged?.Invoke(beauty);

        public static void InvokeCoverageChanged(float coverage)
            => OnCoverageChanged?.Invoke(coverage);

        public static void InvokePigmentChanged(float amount)
            => OnPigmentChanged?.Invoke(amount);

        public static void InvokeSporesChanged(int amount)
            => OnSporesChanged?.Invoke(amount);

        public static void InvokePigmentEarned(float amount)
            => OnPigmentEarned?.Invoke(amount);

        public static void InvokeSporesEarned(int amount)
            => OnSporesEarned?.Invoke(amount);

        public static void InvokeLevelStarted(LevelData level)
            => OnLevelStarted?.Invoke(level);

        public static void InvokeLevelEnded(LevelData level, bool completed)
            => OnLevelEnded?.Invoke(level, completed);

        public static void InvokeLevelCompleted(LevelData level)
            => OnLevelCompleted?.Invoke(level);

        public static void InvokeLevelTimeUpdated(float time)
            => OnLevelTimeUpdated?.Invoke(time);

        public static void InvokeObjectiveProgress(string message)
            => OnObjectiveProgress?.Invoke(message);

        public static void InvokeUnitPlaced(UnitType type, Vector2 position)
            => OnUnitPlaced?.Invoke(type, position);

        public static void InvokeUnitUpgraded(UnitType type, int level)
            => OnUnitUpgraded?.Invoke(type, level);

        public static void InvokeUnitUnlocked(UnitType type)
            => OnUnitUnlocked?.Invoke(type);

        public static void InvokeUpgradePurchased(UpgradeData upgrade)
            => OnUpgradePurchased?.Invoke(upgrade);

        public static void InvokeItemUnlocked(UnlockData unlock)
            => OnItemUnlocked?.Invoke(unlock);

        public static void InvokeProgressionLoaded()
            => OnProgressionLoaded?.Invoke();

        public static void InvokePauseRequested()
            => OnPauseRequested?.Invoke();

        public static void InvokeResumeRequested()
            => OnResumeRequested?.Invoke();

        public static void InvokeScreenChanged(string screenName)
            => OnScreenChanged?.Invoke(screenName);

        public static void InvokeSaveRequested()
            => OnSaveRequested?.Invoke();

        public static void InvokeLoadCompleted()
            => OnLoadCompleted?.Invoke();

        public static void InvokeSealPlaced(Vector2 position, float radius, float duration)
            => OnSealPlaced?.Invoke(position, radius, duration);

        public static void InvokeSealExpired(Vector2 position)
            => OnSealExpired?.Invoke(position);

        public static void InvokeSnapshotTaken(string levelId, Texture2D snapshot)
            => OnSnapshotTaken?.Invoke(levelId, snapshot);
    }

    // Forward declarations for data types
    public class LevelData : ScriptableObject { }
    public class UpgradeData : ScriptableObject { }
    public class UnlockData : ScriptableObject { }

    public enum UnitType
    {
        Seed,
        Moth
    }
}
