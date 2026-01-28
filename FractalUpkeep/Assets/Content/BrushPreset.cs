using UnityEngine;

namespace FractalUpkeep.Content
{
    /// <summary>
    /// Defines a brush preset with specific characteristics
    /// </summary>
    [CreateAssetMenu(fileName = "Brush_", menuName = "FractalUpkeep/Brush Preset")]
    public class BrushPreset : ScriptableObject
    {
        [Header("Identification")]
        [SerializeField] private string brushId;
        [SerializeField] private string brushName;
        [SerializeField] private string description;
        [SerializeField] private Sprite icon;

        [Header("Brush Settings")]
        [SerializeField] private Texture2D brushTexture;
        [SerializeField] private float defaultSize = 20f;
        [SerializeField] private float minSize = 5f;
        [SerializeField] private float maxSize = 100f;
        [SerializeField] private float defaultEmissionRate = 100f;
        [SerializeField] private float spacing = 0.3f;

        [Header("Visual Effects")]
        [SerializeField] private bool useParticles = true;
        [SerializeField] private int particlesPerStroke = 3;
        [SerializeField] private AnimationCurve opacityFalloff = AnimationCurve.EaseInOut(0, 1, 1, 0);
        [SerializeField] private bool softEdge = true;

        [Header("Special Properties")]
        [SerializeField] private BrushType brushType = BrushType.Standard;
        [SerializeField] private float pigmentMultiplier = 1f;
        [SerializeField] private float beautyBonus = 0f;

        public string Id => brushId;
        public string Name => brushName;
        public string Description => description;
        public Sprite Icon => icon;

        public Texture2D Texture => brushTexture;
        public float DefaultSize => defaultSize;
        public float MinSize => minSize;
        public float MaxSize => maxSize;
        public float DefaultEmissionRate => defaultEmissionRate;
        public float Spacing => spacing;

        public bool UseParticles => useParticles;
        public int ParticlesPerStroke => particlesPerStroke;
        public AnimationCurve OpacityFalloff => opacityFalloff;
        public bool SoftEdge => softEdge;

        public BrushType Type => brushType;
        public float PigmentMultiplier => pigmentMultiplier;
        public float BeautyBonus => beautyBonus;

        private void OnValidate()
        {
            if (string.IsNullOrEmpty(brushId) && !string.IsNullOrEmpty(brushName))
            {
                brushId = brushName.ToLower().Replace(" ", "_");
            }

            if (brushTexture == null)
            {
                // Will use default soft brush
            }
        }
    }

    public enum BrushType
    {
        Standard,
        Splatter,
        Spray,
        Ink,
        Watercolor,
        Calligraphy,
        Stipple,
        Textured
    }
}
