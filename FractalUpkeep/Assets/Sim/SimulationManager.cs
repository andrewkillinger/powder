using System;
using System.Collections.Generic;
using UnityEngine;
using FractalUpkeep.Core;
using FractalUpkeep.Canvas;

namespace FractalUpkeep.Sim
{
    /// <summary>
    /// Manages the simulation: decay, beauty calculation, and seals
    /// </summary>
    public class SimulationManager : MonoBehaviour
    {
        [Header("Decay Settings")]
        [SerializeField] private float fadeRate = GameConstants.DEFAULT_FADE_RATE;
        [SerializeField] private float fadeInterval = 0.1f;
        [SerializeField] private bool decayEnabled = true;

        [Header("Beauty Calculation")]
        [SerializeField] private float beautySampleInterval = GameConstants.BEAUTY_SAMPLE_INTERVAL;
        [SerializeField] private int beautySampleGridSize = GameConstants.BEAUTY_SAMPLE_GRID_SIZE;

        [Header("Current Values")]
        [SerializeField] private float currentBeauty = 0f;
        [SerializeField] private float currentCoverage = 0f;

        [Header("References")]
        [SerializeField] private CanvasManager canvasManager;

        public float CurrentBeauty => currentBeauty;
        public float CurrentCoverage => currentCoverage;
        public float FadeRate { get => fadeRate; set => fadeRate = Mathf.Clamp(value, GameConstants.MIN_FADE_RATE, GameConstants.MAX_FADE_RATE); }
        public bool DecayEnabled { get => decayEnabled; set => decayEnabled = value; }

        private float fadeTimer = 0f;
        private float beautyTimer = 0f;

        private List<Seal> activeSeals = new List<Seal>();
        private Color backgroundColor;

        private void Start()
        {
            if (canvasManager == null)
            {
                canvasManager = FindObjectOfType<CanvasManager>();
            }

            backgroundColor = new Color(0.95f, 0.93f, 0.9f, 1f);
        }

        private void Update()
        {
            if (!GameManager.Instance.IsPlaying) return;

            UpdateDecay();
            UpdateBeauty();
            UpdateSeals();
        }

        private void UpdateDecay()
        {
            if (!decayEnabled || canvasManager == null) return;

            fadeTimer += Time.deltaTime;
            if (fadeTimer >= fadeInterval)
            {
                ApplyDecay();
                fadeTimer = 0f;
            }
        }

        private void ApplyDecay()
        {
            float effectiveFadeRate = fadeRate * fadeInterval;

            // Apply progression bonus
            var progression = GameManager.Instance?.Progression;
            if (progression != null)
            {
                effectiveFadeRate *= (1f / progression.FadeResistanceMultiplier);
            }

            // Apply seal reductions
            // Note: Seals reduce fade locally, but for simplicity we apply global fade
            // In a full implementation, seals would mask areas of the canvas

            canvasManager.ApplyFade(effectiveFadeRate);
        }

        private void UpdateBeauty()
        {
            if (canvasManager == null) return;

            beautyTimer += Time.deltaTime;
            if (beautyTimer >= beautySampleInterval)
            {
                CalculateBeauty();
                beautyTimer = 0f;
            }
        }

        private void CalculateBeauty()
        {
            Color[] pixels = canvasManager.GetAllPixels();
            if (pixels == null || pixels.Length == 0) return;

            int totalPixels = pixels.Length;
            float totalColorVariance = 0f;
            float totalCoverage = 0f;
            float totalSaturation = 0f;

            int sampleStep = Mathf.Max(1, totalPixels / (beautySampleGridSize * beautySampleGridSize));

            int sampledCount = 0;
            Color prevColor = backgroundColor;

            for (int i = 0; i < totalPixels; i += sampleStep)
            {
                Color pixel = pixels[i];

                // Coverage: how different from background
                float bgDiff = ColorDistance(pixel, backgroundColor);
                if (bgDiff > 0.05f) // Threshold for "painted"
                {
                    totalCoverage += 1f;
                }

                // Color variance (local contrast)
                if (sampledCount > 0)
                {
                    totalColorVariance += ColorDistance(pixel, prevColor);
                }

                // Saturation
                Color.RGBToHSV(pixel, out _, out float s, out _);
                totalSaturation += s;

                prevColor = pixel;
                sampledCount++;
            }

            if (sampledCount == 0) return;

            // Normalize values
            currentCoverage = totalCoverage / sampledCount;
            float avgVariance = totalColorVariance / sampledCount;
            float avgSaturation = totalSaturation / sampledCount;

            // Beauty formula: combination of coverage, variance, and saturation
            // Higher coverage = more beauty
            // Moderate variance = more interesting compositions
            // Some saturation = visual interest

            float coverageScore = currentCoverage * 50f;
            float varianceScore = Mathf.Clamp01(avgVariance * 5f) * 30f;
            float saturationScore = avgSaturation * 20f;

            currentBeauty = Mathf.Clamp(coverageScore + varianceScore + saturationScore, 0f, 100f);

            GameEvents.InvokeBeautyChanged(currentBeauty);
            GameEvents.InvokeCoverageChanged(currentCoverage);
        }

        private float ColorDistance(Color a, Color b)
        {
            return Mathf.Sqrt(
                (a.r - b.r) * (a.r - b.r) +
                (a.g - b.g) * (a.g - b.g) +
                (a.b - b.b) * (a.b - b.b)
            );
        }

        private void UpdateSeals()
        {
            for (int i = activeSeals.Count - 1; i >= 0; i--)
            {
                var seal = activeSeals[i];
                seal.remainingTime -= Time.deltaTime;

                if (seal.remainingTime <= 0)
                {
                    GameEvents.InvokeSealExpired(seal.position);
                    activeSeals.RemoveAt(i);
                }
                else
                {
                    activeSeals[i] = seal;
                }
            }
        }

        public void PlaceSeal(Vector2 position, float radius, float duration)
        {
            var seal = new Seal
            {
                position = position,
                radius = radius,
                remainingTime = duration,
                fadeReduction = GameConstants.SEAL_FADE_REDUCTION
            };

            activeSeals.Add(seal);
            GameEvents.InvokeSealPlaced(position, radius, duration);
        }

        public bool IsPositionSealed(Vector2 position)
        {
            foreach (var seal in activeSeals)
            {
                if (Vector2.Distance(position, seal.position) <= seal.radius)
                {
                    return true;
                }
            }
            return false;
        }

        public float GetSealedFadeReduction(Vector2 position)
        {
            float maxReduction = 0f;

            foreach (var seal in activeSeals)
            {
                float distance = Vector2.Distance(position, seal.position);
                if (distance <= seal.radius)
                {
                    float falloff = 1f - (distance / seal.radius);
                    float reduction = seal.fadeReduction * falloff;
                    maxReduction = Mathf.Max(maxReduction, reduction);
                }
            }

            return maxReduction;
        }

        public void SetFadeRate(float rate)
        {
            fadeRate = Mathf.Clamp(rate, GameConstants.MIN_FADE_RATE, GameConstants.MAX_FADE_RATE);
        }

        public void ResetSimulation()
        {
            currentBeauty = 0f;
            currentCoverage = 0f;
            activeSeals.Clear();
            fadeTimer = 0f;
            beautyTimer = 0f;

            GameEvents.InvokeBeautyChanged(0f);
            GameEvents.InvokeCoverageChanged(0f);
        }

        public void PauseDecay()
        {
            decayEnabled = false;
        }

        public void ResumeDecay()
        {
            decayEnabled = true;
        }

        public int ActiveSealCount => activeSeals.Count;

        public List<Seal> GetActiveSeals() => new List<Seal>(activeSeals);
    }

    [Serializable]
    public struct Seal
    {
        public Vector2 position;
        public float radius;
        public float remainingTime;
        public float fadeReduction;
    }
}
