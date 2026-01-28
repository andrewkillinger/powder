using System.Collections.Generic;
using UnityEngine;

namespace FractalUpkeep.Content
{
    /// <summary>
    /// Defines a color palette that can be unlocked
    /// </summary>
    [CreateAssetMenu(fileName = "Palette_", menuName = "FractalUpkeep/Palette Definition")]
    public class PaletteDefinition : ScriptableObject
    {
        [Header("Identification")]
        [SerializeField] private string paletteId;
        [SerializeField] private string paletteName;
        [SerializeField] private string description;
        [SerializeField] private Sprite icon;

        [Header("Colors")]
        [SerializeField] private Color[] colors = new Color[8];
        [SerializeField] private PaletteStyle style = PaletteStyle.Mixed;

        [Header("Properties")]
        [SerializeField] private float saturationRange = 0.3f;
        [SerializeField] private float brightnessRange = 0.3f;
        [SerializeField] private bool allowCustomColors = false;

        public string Id => paletteId;
        public string Name => paletteName;
        public string Description => description;
        public Sprite Icon => icon;

        public Color[] Colors => colors;
        public PaletteStyle Style => style;

        public float SaturationRange => saturationRange;
        public float BrightnessRange => brightnessRange;
        public bool AllowCustomColors => allowCustomColors;

        public List<Color> GetColorList()
        {
            return new List<Color>(colors);
        }

        public Color GetRandomColor()
        {
            if (colors == null || colors.Length == 0) return Color.black;
            return colors[Random.Range(0, colors.Length)];
        }

        public Color GetColorWithVariation(int index)
        {
            if (colors == null || colors.Length == 0) return Color.black;

            Color baseColor = colors[index % colors.Length];

            Color.RGBToHSV(baseColor, out float h, out float s, out float v);

            s = Mathf.Clamp01(s + Random.Range(-saturationRange, saturationRange));
            v = Mathf.Clamp01(v + Random.Range(-brightnessRange, brightnessRange));

            return Color.HSVToRGB(h, s, v);
        }

        private void OnValidate()
        {
            if (string.IsNullOrEmpty(paletteId) && !string.IsNullOrEmpty(paletteName))
            {
                paletteId = paletteName.ToLower().Replace(" ", "_");
            }

            if (colors == null || colors.Length == 0)
            {
                colors = new Color[]
                {
                    Color.black,
                    new Color(0.2f, 0.2f, 0.2f),
                    new Color(0.4f, 0.4f, 0.4f),
                    new Color(0.6f, 0.6f, 0.6f),
                    Color.white,
                    new Color(0.3f, 0.2f, 0.1f),
                    new Color(0.1f, 0.2f, 0.3f),
                    new Color(0.2f, 0.3f, 0.2f)
                };
            }
        }
    }

    public enum PaletteStyle
    {
        Monochrome,
        Complementary,
        Analogous,
        Triadic,
        Mixed,
        Warm,
        Cool,
        Earth,
        Pastel,
        Vibrant
    }
}
