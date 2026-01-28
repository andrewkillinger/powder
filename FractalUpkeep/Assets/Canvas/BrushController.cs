using System;
using System.Collections.Generic;
using UnityEngine;
using FractalUpkeep.Core;

namespace FractalUpkeep.Canvas
{
    /// <summary>
    /// Handles touch input for brush painting
    /// </summary>
    public class BrushController : MonoBehaviour
    {
        [Header("Brush Settings")]
        [SerializeField] private float brushSize = GameConstants.DEFAULT_BRUSH_SIZE;
        [SerializeField] private float emissionRate = GameConstants.DEFAULT_EMISSION_RATE;
        [SerializeField] private Color currentColor = Color.black;
        [SerializeField] private float strokeSpacing = 0.3f;

        [Header("References")]
        [SerializeField] private CanvasManager canvasManager;
        [SerializeField] private Camera canvasCamera;

        [Header("Particle Settings")]
        [SerializeField] private bool useParticles = true;
        [SerializeField] private ParticleSystem brushParticles;
        [SerializeField] private int particlesPerStroke = 5;

        public float BrushSize
        {
            get => brushSize;
            set => brushSize = Mathf.Clamp(value, GameConstants.MIN_BRUSH_SIZE, GameConstants.MAX_BRUSH_SIZE);
        }

        public float EmissionRate
        {
            get => emissionRate;
            set => emissionRate = Mathf.Clamp(value, GameConstants.MIN_EMISSION_RATE, GameConstants.MAX_EMISSION_RATE);
        }

        public Color CurrentColor
        {
            get => currentColor;
            set => currentColor = value;
        }

        private Vector2 lastPosition;
        private bool isPainting;
        private float paintTimer;
        private float paintInterval => 1f / emissionRate;

        private List<Color> colorPalette = new List<Color>();
        private int currentPaletteIndex = 0;

        private void Start()
        {
            if (canvasManager == null)
            {
                canvasManager = FindObjectOfType<CanvasManager>();
            }

            if (canvasCamera == null)
            {
                canvasCamera = Camera.main;
            }

            InitializeDefaultPalette();
            InitializeParticles();
        }

        private void InitializeDefaultPalette()
        {
            colorPalette = new List<Color>
            {
                new Color(0.1f, 0.1f, 0.1f),      // Dark charcoal
                new Color(0.2f, 0.15f, 0.1f),     // Brown
                new Color(0.4f, 0.2f, 0.3f),      // Dusty rose
                new Color(0.15f, 0.25f, 0.35f),   // Deep blue
                new Color(0.25f, 0.35f, 0.25f),   // Forest green
                new Color(0.5f, 0.3f, 0.15f),     // Sienna
                new Color(0.35f, 0.25f, 0.4f),    // Purple
                new Color(0.3f, 0.35f, 0.4f)      // Slate
            };
            currentColor = colorPalette[0];
        }

        private void InitializeParticles()
        {
            if (brushParticles == null && useParticles)
            {
                // Create particle system dynamically
                var particleGO = new GameObject("BrushParticles");
                particleGO.transform.SetParent(transform);
                brushParticles = particleGO.AddComponent<ParticleSystem>();

                var main = brushParticles.main;
                main.loop = false;
                main.playOnAwake = false;
                main.startLifetime = 0.5f;
                main.startSpeed = 0f;
                main.startSize = 0.1f;
                main.simulationSpace = ParticleSystemSimulationSpace.World;

                var emission = brushParticles.emission;
                emission.enabled = false;

                var shape = brushParticles.shape;
                shape.shapeType = ParticleSystemShapeType.Circle;
                shape.radius = 0.1f;

                var renderer = brushParticles.GetComponent<ParticleSystemRenderer>();
                renderer.material = new Material(Shader.Find("Particles/Standard Unlit"));
            }
        }

        private void Update()
        {
            HandleInput();
        }

        private void HandleInput()
        {
            if (!GameManager.Instance.IsPlaying) return;

#if UNITY_IOS || UNITY_ANDROID
            HandleTouchInput();
#else
            HandleMouseInput();
#endif
        }

        private void HandleTouchInput()
        {
            if (Input.touchCount == 0)
            {
                if (isPainting)
                {
                    EndStroke();
                }
                return;
            }

            Touch touch = Input.GetTouch(0);

            // Ignore multi-touch (could be pinch zoom)
            if (Input.touchCount > 1)
            {
                if (isPainting)
                {
                    EndStroke();
                }
                return;
            }

            Vector2 canvasPos = ScreenToCanvasPosition(touch.position);

            switch (touch.phase)
            {
                case TouchPhase.Began:
                    StartStroke(canvasPos);
                    break;

                case TouchPhase.Moved:
                case TouchPhase.Stationary:
                    ContinueStroke(canvasPos);
                    break;

                case TouchPhase.Ended:
                case TouchPhase.Canceled:
                    EndStroke();
                    break;
            }
        }

        private void HandleMouseInput()
        {
            Vector2 canvasPos = ScreenToCanvasPosition(Input.mousePosition);

            if (Input.GetMouseButtonDown(0))
            {
                StartStroke(canvasPos);
            }
            else if (Input.GetMouseButton(0) && isPainting)
            {
                ContinueStroke(canvasPos);
            }
            else if (Input.GetMouseButtonUp(0))
            {
                EndStroke();
            }
        }

        private void StartStroke(Vector2 position)
        {
            isPainting = true;
            lastPosition = position;
            paintTimer = 0f;

            Paint(position);
            EmitParticles(position);
        }

        private void ContinueStroke(Vector2 position)
        {
            if (!isPainting) return;

            paintTimer += Time.deltaTime;

            float distance = Vector2.Distance(position, lastPosition);
            float minDistance = brushSize * strokeSpacing;

            if (distance >= minDistance || paintTimer >= paintInterval)
            {
                canvasManager?.PaintLine(lastPosition, position, currentColor, brushSize, strokeSpacing);
                EmitParticlesAlongLine(lastPosition, position);
                lastPosition = position;
                paintTimer = 0f;
            }
        }

        private void EndStroke()
        {
            isPainting = false;
        }

        private void Paint(Vector2 position)
        {
            canvasManager?.PaintAt(position, currentColor, brushSize);
        }

        private void EmitParticles(Vector2 position)
        {
            if (!useParticles || brushParticles == null) return;

            Vector3 worldPos = CanvasToWorldPosition(position);
            brushParticles.transform.position = worldPos;

            var emitParams = new ParticleSystem.EmitParams
            {
                startColor = currentColor,
                startSize = brushSize * 0.01f
            };

            brushParticles.Emit(emitParams, particlesPerStroke);
        }

        private void EmitParticlesAlongLine(Vector2 from, Vector2 to)
        {
            if (!useParticles || brushParticles == null) return;

            int count = Mathf.CeilToInt(Vector2.Distance(from, to) / (brushSize * 0.5f));
            for (int i = 0; i <= count; i++)
            {
                float t = count > 0 ? (float)i / count : 0;
                Vector2 pos = Vector2.Lerp(from, to, t);
                EmitParticles(pos);
            }
        }

        private Vector2 ScreenToCanvasPosition(Vector2 screenPos)
        {
            if (canvasCamera == null || canvasManager == null)
            {
                return screenPos;
            }

            // Convert screen position to world position
            Vector3 worldPos = canvasCamera.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, 10f));

            // Convert world position to canvas position (0 to canvasWidth/Height)
            // Assuming canvas is centered and scaled appropriately
            float canvasX = (worldPos.x + canvasManager.Width * 0.005f) * 100f;
            float canvasY = (worldPos.y + canvasManager.Height * 0.005f) * 100f;

            return new Vector2(
                Mathf.Clamp(canvasX, 0, canvasManager.Width),
                Mathf.Clamp(canvasY, 0, canvasManager.Height)
            );
        }

        private Vector3 CanvasToWorldPosition(Vector2 canvasPos)
        {
            if (canvasManager == null) return Vector3.zero;

            float worldX = (canvasPos.x / 100f) - canvasManager.Width * 0.005f;
            float worldY = (canvasPos.y / 100f) - canvasManager.Height * 0.005f;

            return new Vector3(worldX, worldY, 0);
        }

        public void SetPaletteColor(int index)
        {
            if (index >= 0 && index < colorPalette.Count)
            {
                currentPaletteIndex = index;
                currentColor = colorPalette[index];
            }
        }

        public void SetPalette(List<Color> palette)
        {
            if (palette != null && palette.Count > 0)
            {
                colorPalette = new List<Color>(palette);
                currentPaletteIndex = 0;
                currentColor = colorPalette[0];
            }
        }

        public List<Color> GetPalette() => new List<Color>(colorPalette);

        public void NextColor()
        {
            currentPaletteIndex = (currentPaletteIndex + 1) % colorPalette.Count;
            currentColor = colorPalette[currentPaletteIndex];
        }

        public void PreviousColor()
        {
            currentPaletteIndex = (currentPaletteIndex - 1 + colorPalette.Count) % colorPalette.Count;
            currentColor = colorPalette[currentPaletteIndex];
        }

        public void ApplyProgressionBonuses()
        {
            var progression = GameManager.Instance?.Progression;
            if (progression == null) return;

            float sizeMultiplier = progression.BrushSizeMultiplier;
            float rateMultiplier = progression.BrushRateMultiplier;

            // Apply multipliers to max values
            BrushSize = Mathf.Min(brushSize * sizeMultiplier, GameConstants.MAX_BRUSH_SIZE * sizeMultiplier);
            EmissionRate = Mathf.Min(emissionRate * rateMultiplier, GameConstants.MAX_EMISSION_RATE * rateMultiplier);
        }
    }
}
