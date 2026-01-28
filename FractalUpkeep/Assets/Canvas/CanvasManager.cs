using System;
using UnityEngine;
using FractalUpkeep.Core;

namespace FractalUpkeep.Canvas
{
    /// <summary>
    /// Manages the main painting canvas using RenderTexture
    /// </summary>
    public class CanvasManager : MonoBehaviour
    {
        [Header("Canvas Settings")]
        [SerializeField] private int canvasWidth = GameConstants.DEFAULT_CANVAS_WIDTH;
        [SerializeField] private int canvasHeight = GameConstants.DEFAULT_CANVAS_HEIGHT;
        [SerializeField] private Color backgroundColor = new Color(0.95f, 0.93f, 0.9f, 1f);

        [Header("References")]
        [SerializeField] private RenderTexture canvasTexture;
        [SerializeField] private Material canvasMaterial;
        [SerializeField] private SpriteRenderer canvasRenderer;

        [Header("Post Processing")]
        [SerializeField] private bool enableBloom = true;
        [SerializeField] private bool enablePaperGrain = true;
        [SerializeField] private float bloomIntensity = 0.3f;
        [SerializeField] private float paperGrainIntensity = 0.05f;

        [Header("Brush")]
        [SerializeField] private Texture2D brushTexture;
        [SerializeField] private Material brushMaterial;

        public RenderTexture CanvasTexture => canvasTexture;
        public int Width => canvasWidth;
        public int Height => canvasHeight;
        public bool BloomEnabled { get => enableBloom; set => enableBloom = value; }
        public bool PaperGrainEnabled { get => enablePaperGrain; set => enablePaperGrain = value; }

        private Texture2D readableTexture;
        private RenderTexture tempRT;

        private void Awake()
        {
            InitializeCanvas();
        }

        private void OnDestroy()
        {
            CleanupResources();
        }

        private void InitializeCanvas()
        {
            // Create main canvas RenderTexture
            canvasTexture = new RenderTexture(canvasWidth, canvasHeight, 0, RenderTextureFormat.ARGB32)
            {
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                useMipMap = false,
                autoGenerateMips = false
            };
            canvasTexture.Create();

            // Create temp RT for blitting operations
            tempRT = new RenderTexture(canvasWidth, canvasHeight, 0, RenderTextureFormat.ARGB32);
            tempRT.Create();

            // Create readable texture for CPU operations
            readableTexture = new Texture2D(canvasWidth, canvasHeight, TextureFormat.ARGB32, false);

            // Clear to background color
            ClearCanvas();

            // Setup canvas material
            if (canvasMaterial != null)
            {
                canvasMaterial.mainTexture = canvasTexture;
            }

            // Setup sprite renderer if using that approach
            if (canvasRenderer != null)
            {
                var sprite = Sprite.Create(
                    readableTexture,
                    new Rect(0, 0, canvasWidth, canvasHeight),
                    new Vector2(0.5f, 0.5f),
                    100f
                );
                canvasRenderer.sprite = sprite;
            }

            // Create default brush texture if not assigned
            if (brushTexture == null)
            {
                brushTexture = CreateDefaultBrushTexture();
            }

            // Create brush material
            if (brushMaterial == null)
            {
                brushMaterial = new Material(Shader.Find("Unlit/Transparent"));
            }
        }

        private Texture2D CreateDefaultBrushTexture()
        {
            int size = 64;
            var texture = new Texture2D(size, size, TextureFormat.ARGB32, false);
            Color[] pixels = new Color[size * size];

            float center = size / 2f;
            float radius = size / 2f;

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float distance = Vector2.Distance(new Vector2(x, y), new Vector2(center, center));
                    float alpha = Mathf.Clamp01(1f - (distance / radius));
                    alpha = Mathf.Pow(alpha, 2f); // Soft falloff
                    pixels[y * size + x] = new Color(1f, 1f, 1f, alpha);
                }
            }

            texture.SetPixels(pixels);
            texture.Apply();
            return texture;
        }

        public void ClearCanvas()
        {
            RenderTexture.active = canvasTexture;
            GL.Clear(true, true, backgroundColor);
            RenderTexture.active = null;

            GameEvents.InvokeCanvasCleared();
        }

        public void PaintAt(Vector2 position, Color color, float size)
        {
            if (brushMaterial == null || brushTexture == null) return;

            // Convert position to UV space (0-1)
            Vector2 uv = new Vector2(position.x / canvasWidth, position.y / canvasHeight);

            // Calculate brush rect in UV space
            float brushSizeNormalized = size / canvasWidth;
            Rect brushRect = new Rect(
                uv.x - brushSizeNormalized / 2f,
                uv.y - brushSizeNormalized / 2f,
                brushSizeNormalized,
                brushSizeNormalized
            );

            // Set brush color
            brushMaterial.color = color;
            brushMaterial.mainTexture = brushTexture;

            // Blit brush onto canvas
            RenderTexture.active = canvasTexture;
            GL.PushMatrix();
            GL.LoadOrtho();

            brushMaterial.SetPass(0);
            GL.Begin(GL.QUADS);
            GL.Color(color);
            GL.TexCoord2(0, 0);
            GL.Vertex3(brushRect.xMin, brushRect.yMin, 0);
            GL.TexCoord2(1, 0);
            GL.Vertex3(brushRect.xMax, brushRect.yMin, 0);
            GL.TexCoord2(1, 1);
            GL.Vertex3(brushRect.xMax, brushRect.yMax, 0);
            GL.TexCoord2(0, 1);
            GL.Vertex3(brushRect.xMin, brushRect.yMax, 0);
            GL.End();

            GL.PopMatrix();
            RenderTexture.active = null;

            GameEvents.InvokeBrushStroke(position, color, size);
        }

        public void PaintLine(Vector2 from, Vector2 to, Color color, float size, float spacing = 0.5f)
        {
            float distance = Vector2.Distance(from, to);
            int steps = Mathf.Max(1, Mathf.CeilToInt(distance / (size * spacing)));

            for (int i = 0; i <= steps; i++)
            {
                float t = (float)i / steps;
                Vector2 pos = Vector2.Lerp(from, to, t);
                PaintAt(pos, color, size);
            }
        }

        public Color SampleAt(Vector2 position)
        {
            // Copy canvas to readable texture
            RenderTexture.active = canvasTexture;
            readableTexture.ReadPixels(new Rect(0, 0, canvasWidth, canvasHeight), 0, 0);
            readableTexture.Apply();
            RenderTexture.active = null;

            int x = Mathf.Clamp((int)position.x, 0, canvasWidth - 1);
            int y = Mathf.Clamp((int)position.y, 0, canvasHeight - 1);

            return readableTexture.GetPixel(x, y);
        }

        public Color[] GetAllPixels()
        {
            RenderTexture.active = canvasTexture;
            readableTexture.ReadPixels(new Rect(0, 0, canvasWidth, canvasHeight), 0, 0);
            readableTexture.Apply();
            RenderTexture.active = null;

            return readableTexture.GetPixels();
        }

        public void ApplyFade(float fadeAmount)
        {
            // Create fade material if not exists
            Material fadeMaterial = new Material(Shader.Find("Custom/FadeShader"));
            if (fadeMaterial == null)
            {
                // Fallback: manual fade via CPU (slower but works without custom shader)
                ApplyFadeCPU(fadeAmount);
                return;
            }

            fadeMaterial.SetFloat("_FadeAmount", fadeAmount);
            fadeMaterial.SetColor("_BackgroundColor", backgroundColor);

            Graphics.Blit(canvasTexture, tempRT, fadeMaterial);
            Graphics.Blit(tempRT, canvasTexture);
        }

        private void ApplyFadeCPU(float fadeAmount)
        {
            RenderTexture.active = canvasTexture;
            readableTexture.ReadPixels(new Rect(0, 0, canvasWidth, canvasHeight), 0, 0);
            readableTexture.Apply();
            RenderTexture.active = null;

            Color[] pixels = readableTexture.GetPixels();
            for (int i = 0; i < pixels.Length; i++)
            {
                pixels[i] = Color.Lerp(pixels[i], backgroundColor, fadeAmount);
            }

            readableTexture.SetPixels(pixels);
            readableTexture.Apply();

            RenderTexture.active = canvasTexture;
            Graphics.Blit(readableTexture, canvasTexture);
            RenderTexture.active = null;
        }

        public Texture2D CaptureSnapshot(int width = -1, int height = -1)
        {
            if (width <= 0) width = GameConstants.SNAPSHOT_WIDTH;
            if (height <= 0) height = GameConstants.SNAPSHOT_HEIGHT;

            var snapshot = new Texture2D(width, height, TextureFormat.RGB24, false);

            // Create scaled render texture
            var scaledRT = RenderTexture.GetTemporary(width, height, 0, RenderTextureFormat.ARGB32);
            Graphics.Blit(canvasTexture, scaledRT);

            RenderTexture.active = scaledRT;
            snapshot.ReadPixels(new Rect(0, 0, width, height), 0, 0);
            snapshot.Apply();
            RenderTexture.active = null;

            RenderTexture.ReleaseTemporary(scaledRT);

            return snapshot;
        }

        public void SetPostProcessing(bool bloom, bool paperGrain)
        {
            enableBloom = bloom;
            enablePaperGrain = paperGrain;

            if (canvasMaterial != null)
            {
                canvasMaterial.SetFloat("_BloomIntensity", bloom ? bloomIntensity : 0f);
                canvasMaterial.SetFloat("_GrainIntensity", paperGrain ? paperGrainIntensity : 0f);
            }
        }

        private void CleanupResources()
        {
            if (canvasTexture != null)
            {
                canvasTexture.Release();
                Destroy(canvasTexture);
            }

            if (tempRT != null)
            {
                tempRT.Release();
                Destroy(tempRT);
            }

            if (readableTexture != null)
            {
                Destroy(readableTexture);
            }

            if (brushTexture != null && !Application.isEditor)
            {
                Destroy(brushTexture);
            }
        }
    }
}
