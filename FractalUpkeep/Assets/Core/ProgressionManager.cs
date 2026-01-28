using System;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;

namespace FractalUpkeep.Core
{
    /// <summary>
    /// Manages player progression: upgrades, unlocks, and persistent state
    /// </summary>
    public class ProgressionManager : MonoBehaviour
    {
        [Header("Upgrade Definitions")]
        [SerializeField] private List<Content.UpgradeDefinition> availableUpgrades = new List<Content.UpgradeDefinition>();
        [SerializeField] private List<Content.UnlockDefinition> availableUnlocks = new List<Content.UnlockDefinition>();

        [Header("Player State")]
        [SerializeField] private Dictionary<string, int> upgradeLevels = new Dictionary<string, int>();
        [SerializeField] private HashSet<string> unlockedItems = new HashSet<string>();
        [SerializeField] private HashSet<string> completedLevels = new HashSet<string>();
        [SerializeField] private Dictionary<string, int> levelBestScores = new Dictionary<string, int>();

        // Upgrade value getters
        public float BrushSizeMultiplier => GetUpgradeMultiplier("brush_size");
        public float BrushRateMultiplier => GetUpgradeMultiplier("brush_rate");
        public float SeedEfficiencyMultiplier => GetUpgradeMultiplier("seed_efficiency");
        public float MothSpeedMultiplier => GetUpgradeMultiplier("moth_speed");
        public float FadeResistanceMultiplier => GetUpgradeMultiplier("fade_resistance");
        public float PigmentGenerationMultiplier => GetUpgradeMultiplier("pigment_generation");

        private CurrencyManager currencyManager;

        private void Awake()
        {
            LoadUpgradeDefinitions();
            LoadUnlockDefinitions();
        }

        private void Start()
        {
            currencyManager = GameManager.Instance?.Currency;
        }

        private void LoadUpgradeDefinitions()
        {
            var upgrades = Resources.LoadAll<Content.UpgradeDefinition>(GameConstants.UPGRADES_PATH);
            availableUpgrades = new List<Content.UpgradeDefinition>(upgrades);
        }

        private void LoadUnlockDefinitions()
        {
            var unlocks = Resources.LoadAll<Content.UnlockDefinition>(GameConstants.UPGRADES_PATH);
            availableUnlocks = new List<Content.UnlockDefinition>(unlocks);
        }

        public int GetUpgradeLevel(string upgradeId)
        {
            return upgradeLevels.TryGetValue(upgradeId, out int level) ? level : 0;
        }

        public float GetUpgradeMultiplier(string upgradeId)
        {
            int level = GetUpgradeLevel(upgradeId);
            var upgrade = availableUpgrades.FirstOrDefault(u => u.Id == upgradeId);

            if (upgrade == null || level == 0) return 1f;

            return 1f + (upgrade.ValuePerLevel * level);
        }

        public float GetUpgradeCost(string upgradeId)
        {
            int level = GetUpgradeLevel(upgradeId);
            var upgrade = availableUpgrades.FirstOrDefault(u => u.Id == upgradeId);

            if (upgrade == null) return float.MaxValue;

            return upgrade.BaseCost * Mathf.Pow(GameConstants.PIGMENT_COST_MULTIPLIER, level);
        }

        public bool CanPurchaseUpgrade(string upgradeId)
        {
            var upgrade = availableUpgrades.FirstOrDefault(u => u.Id == upgradeId);
            if (upgrade == null) return false;

            int currentLevel = GetUpgradeLevel(upgradeId);
            if (currentLevel >= upgrade.MaxLevel) return false;

            float cost = GetUpgradeCost(upgradeId);
            return currencyManager != null && currencyManager.CanAffordPigment(cost);
        }

        public bool PurchaseUpgrade(string upgradeId)
        {
            if (!CanPurchaseUpgrade(upgradeId)) return false;

            float cost = GetUpgradeCost(upgradeId);
            if (!currencyManager.SpendPigment(cost)) return false;

            int newLevel = GetUpgradeLevel(upgradeId) + 1;
            upgradeLevels[upgradeId] = newLevel;

            var upgrade = availableUpgrades.FirstOrDefault(u => u.Id == upgradeId);
            if (upgrade != null)
            {
                GameEvents.InvokeUpgradePurchased(upgrade);
            }

            return true;
        }

        public bool IsItemUnlocked(string itemId)
        {
            return unlockedItems.Contains(itemId);
        }

        public int GetUnlockCost(string itemId)
        {
            var unlock = availableUnlocks.FirstOrDefault(u => u.Id == itemId);
            return unlock?.SporeCost ?? int.MaxValue;
        }

        public bool CanPurchaseUnlock(string itemId)
        {
            if (IsItemUnlocked(itemId)) return false;

            var unlock = availableUnlocks.FirstOrDefault(u => u.Id == itemId);
            if (unlock == null) return false;

            // Check prerequisites
            if (!string.IsNullOrEmpty(unlock.PrerequisiteId) && !IsItemUnlocked(unlock.PrerequisiteId))
            {
                return false;
            }

            return currencyManager != null && currencyManager.CanAffordSpores(unlock.SporeCost);
        }

        public bool PurchaseUnlock(string itemId)
        {
            if (!CanPurchaseUnlock(itemId)) return false;

            int cost = GetUnlockCost(itemId);
            if (!currencyManager.SpendSpores(cost)) return false;

            unlockedItems.Add(itemId);

            var unlock = availableUnlocks.FirstOrDefault(u => u.Id == itemId);
            if (unlock != null)
            {
                GameEvents.InvokeItemUnlocked(unlock);
            }

            return true;
        }

        public void MarkLevelCompleted(string levelId, int score)
        {
            completedLevels.Add(levelId);

            if (!levelBestScores.TryGetValue(levelId, out int bestScore) || score > bestScore)
            {
                levelBestScores[levelId] = score;
            }
        }

        public bool IsLevelCompleted(string levelId)
        {
            return completedLevels.Contains(levelId);
        }

        public int GetLevelBestScore(string levelId)
        {
            return levelBestScores.TryGetValue(levelId, out int score) ? score : 0;
        }

        public int GetCompletedLevelCount()
        {
            return completedLevels.Count;
        }

        public List<Content.UpgradeDefinition> GetAvailableUpgrades()
        {
            return availableUpgrades;
        }

        public List<Content.UnlockDefinition> GetAvailableUnlocks()
        {
            return availableUnlocks;
        }

        public ProgressionData GetSaveData()
        {
            return new ProgressionData
            {
                upgradeLevels = new Dictionary<string, int>(upgradeLevels),
                unlockedItems = new List<string>(unlockedItems),
                completedLevels = new List<string>(completedLevels),
                levelBestScores = new Dictionary<string, int>(levelBestScores)
            };
        }

        public void LoadSaveData(ProgressionData data)
        {
            if (data == null) return;

            upgradeLevels = data.upgradeLevels ?? new Dictionary<string, int>();
            unlockedItems = new HashSet<string>(data.unlockedItems ?? new List<string>());
            completedLevels = new HashSet<string>(data.completedLevels ?? new List<string>());
            levelBestScores = data.levelBestScores ?? new Dictionary<string, int>();

            GameEvents.InvokeProgressionLoaded();
        }
    }

    [Serializable]
    public class ProgressionData
    {
        public Dictionary<string, int> upgradeLevels;
        public List<string> unlockedItems;
        public List<string> completedLevels;
        public Dictionary<string, int> levelBestScores;
    }
}
