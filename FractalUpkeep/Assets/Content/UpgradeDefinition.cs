using UnityEngine;
using FractalUpkeep.Core;

namespace FractalUpkeep.Content
{
    /// <summary>
    /// Defines an upgrade that can be purchased with Pigment
    /// </summary>
    [CreateAssetMenu(fileName = "Upgrade_", menuName = "FractalUpkeep/Upgrade Definition")]
    public class UpgradeDefinition : UpgradeData
    {
        [Header("Identification")]
        [SerializeField] private string upgradeId;
        [SerializeField] private string upgradeName;
        [SerializeField] private string description;
        [SerializeField] private Sprite icon;

        [Header("Upgrade Stats")]
        [SerializeField] private UpgradeType upgradeType;
        [SerializeField] private float baseCost = 100f;
        [SerializeField] private float valuePerLevel = 0.1f;
        [SerializeField] private int maxLevel = 10;

        [Header("Requirements")]
        [SerializeField] private string prerequisiteUpgradeId;
        [SerializeField] private int prerequisiteLevel = 0;

        public string Id => upgradeId;
        public string Name => upgradeName;
        public string Description => description;
        public Sprite Icon => icon;

        public UpgradeType Type => upgradeType;
        public float BaseCost => baseCost;
        public float ValuePerLevel => valuePerLevel;
        public int MaxLevel => maxLevel;

        public string PrerequisiteId => prerequisiteUpgradeId;
        public int PrerequisiteLevel => prerequisiteLevel;

        public float GetValueAtLevel(int level)
        {
            return valuePerLevel * level;
        }

        public float GetCostAtLevel(int level)
        {
            return baseCost * Mathf.Pow(GameConstants.PIGMENT_COST_MULTIPLIER, level);
        }

        public string GetDescriptionForLevel(int level)
        {
            float currentValue = GetValueAtLevel(level);
            float nextValue = GetValueAtLevel(level + 1);

            return $"{description}\nCurrent: +{currentValue * 100:F0}%\nNext: +{nextValue * 100:F0}%";
        }

        private void OnValidate()
        {
            if (string.IsNullOrEmpty(upgradeId) && !string.IsNullOrEmpty(upgradeName))
            {
                upgradeId = upgradeName.ToLower().Replace(" ", "_");
            }
        }
    }

    public enum UpgradeType
    {
        BrushSize,
        BrushRate,
        SeedEfficiency,
        MothSpeed,
        FadeResistance,
        PigmentGeneration,
        SealDuration,
        MaxSeeds,
        MaxMoths
    }
}
