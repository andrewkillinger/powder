using UnityEngine;
using FractalUpkeep.Core;

namespace FractalUpkeep.Content
{
    /// <summary>
    /// Defines an unlockable item purchased with Spores
    /// </summary>
    [CreateAssetMenu(fileName = "Unlock_", menuName = "FractalUpkeep/Unlock Definition")]
    public class UnlockDefinition : UnlockData
    {
        [Header("Identification")]
        [SerializeField] private string unlockId;
        [SerializeField] private string unlockName;
        [SerializeField] private string description;
        [SerializeField] private Sprite icon;
        [SerializeField] private Sprite lockedIcon;

        [Header("Unlock Settings")]
        [SerializeField] private UnlockType unlockType;
        [SerializeField] private int sporeCost = 10;
        [SerializeField] private string prerequisiteId;

        [Header("Unlock Content")]
        [SerializeField] private BrushPreset brushPreset;
        [SerializeField] private PaletteDefinition paletteDefinition;
        [SerializeField] private UnitType unitType;

        public string Id => unlockId;
        public string Name => unlockName;
        public string Description => description;
        public Sprite Icon => icon;
        public Sprite LockedIcon => lockedIcon;

        public UnlockType Type => unlockType;
        public int SporeCost => sporeCost;
        public string PrerequisiteId => prerequisiteId;

        public BrushPreset Brush => brushPreset;
        public PaletteDefinition Palette => paletteDefinition;
        public UnitType Unit => unitType;

        private void OnValidate()
        {
            if (string.IsNullOrEmpty(unlockId) && !string.IsNullOrEmpty(unlockName))
            {
                unlockId = unlockName.ToLower().Replace(" ", "_");
            }
        }
    }

    public enum UnlockType
    {
        Brush,
        Palette,
        Unit,
        LevelTier,
        Feature
    }
}
