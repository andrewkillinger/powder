using System;
using System.Collections.Generic;
using UnityEngine;
using FractalUpkeep.Core;
using FractalUpkeep.Canvas;
using FractalUpkeep.Sim;

namespace FractalUpkeep.Units
{
    /// <summary>
    /// Manages automation units (Seeds, Moths)
    /// </summary>
    public class UnitManager : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private CanvasManager canvasManager;
        [SerializeField] private SimulationManager simulationManager;

        [Header("Unit Limits")]
        [SerializeField] private int maxSeeds = 10;
        [SerializeField] private int maxMoths = 5;

        [Header("Active Units")]
        [SerializeField] private List<SeedUnit> activeSeeds = new List<SeedUnit>();
        [SerializeField] private List<MothUnit> activeMoths = new List<MothUnit>();

        public int ActiveSeedCount => activeSeeds.Count;
        public int ActiveMothCount => activeMoths.Count;

        private void Start()
        {
            if (canvasManager == null)
            {
                canvasManager = FindObjectOfType<CanvasManager>();
            }
            if (simulationManager == null)
            {
                simulationManager = FindObjectOfType<SimulationManager>();
            }
        }

        private void Update()
        {
            if (!GameManager.Instance.IsPlaying) return;

            UpdateSeeds();
            UpdateMoths();
        }

        private void UpdateSeeds()
        {
            foreach (var seed in activeSeeds)
            {
                seed.Update(Time.deltaTime, canvasManager);
            }
        }

        private void UpdateMoths()
        {
            foreach (var moth in activeMoths)
            {
                moth.Update(Time.deltaTime, canvasManager, simulationManager);
            }
        }

        public bool PlaceSeed(Vector2 position, Color color, int level = 1)
        {
            if (activeSeeds.Count >= maxSeeds) return false;

            float cost = GetSeedCost(level);
            if (!GameManager.Instance.Currency.SpendPigment(cost)) return false;

            var progression = GameManager.Instance?.Progression;
            float efficiencyMultiplier = progression?.SeedEfficiencyMultiplier ?? 1f;

            var seed = new SeedUnit
            {
                position = position,
                color = color,
                level = level,
                radius = GameConstants.SEED_BASE_RADIUS * level * 0.5f,
                paintRate = GameConstants.SEED_BASE_RATE * level * efficiencyMultiplier,
                paintTimer = 0f
            };

            activeSeeds.Add(seed);
            GameEvents.InvokeUnitPlaced(UnitType.Seed, position);

            return true;
        }

        public bool PlaceMoth(Vector2 position, Color color, int level = 1)
        {
            if (activeMoths.Count >= maxMoths) return false;

            float cost = GetMothCost(level);
            if (!GameManager.Instance.Currency.SpendPigment(cost)) return false;

            var progression = GameManager.Instance?.Progression;
            float speedMultiplier = progression?.MothSpeedMultiplier ?? 1f;

            var moth = new MothUnit
            {
                position = position,
                color = color,
                level = level,
                speed = GameConstants.MOTH_BASE_SPEED * level * speedMultiplier,
                searchRadius = GameConstants.MOTH_SEARCH_RADIUS * level,
                targetPosition = position,
                hasTarget = false,
                paintTimer = 0f
            };

            activeMoths.Add(moth);
            GameEvents.InvokeUnitPlaced(UnitType.Moth, position);

            return true;
        }

        public float GetSeedCost(int level)
        {
            float baseCost = GameConstants.SEED_UPGRADE_BASE;
            return baseCost * Mathf.Pow(GameConstants.PIGMENT_COST_MULTIPLIER, level - 1) * activeSeeds.Count;
        }

        public float GetMothCost(int level)
        {
            float baseCost = GameConstants.MOTH_UPGRADE_BASE;
            return baseCost * Mathf.Pow(GameConstants.PIGMENT_COST_MULTIPLIER, level - 1) * activeMoths.Count;
        }

        public void RemoveSeed(int index)
        {
            if (index >= 0 && index < activeSeeds.Count)
            {
                activeSeeds.RemoveAt(index);
            }
        }

        public void RemoveMoth(int index)
        {
            if (index >= 0 && index < activeMoths.Count)
            {
                activeMoths.RemoveAt(index);
            }
        }

        public void ClearUnits()
        {
            activeSeeds.Clear();
            activeMoths.Clear();
        }

        public List<SeedUnit> GetSeeds() => new List<SeedUnit>(activeSeeds);
        public List<MothUnit> GetMoths() => new List<MothUnit>(activeMoths);

        public void UpgradeSeed(int index)
        {
            if (index < 0 || index >= activeSeeds.Count) return;

            var seed = activeSeeds[index];
            float cost = GetSeedCost(seed.level + 1);

            if (GameManager.Instance.Currency.SpendPigment(cost))
            {
                seed.level++;
                seed.radius = GameConstants.SEED_BASE_RADIUS * seed.level * 0.5f;
                seed.paintRate = GameConstants.SEED_BASE_RATE * seed.level;
                activeSeeds[index] = seed;

                GameEvents.InvokeUnitUpgraded(UnitType.Seed, seed.level);
            }
        }

        public void UpgradeMoth(int index)
        {
            if (index < 0 || index >= activeMoths.Count) return;

            var moth = activeMoths[index];
            float cost = GetMothCost(moth.level + 1);

            if (GameManager.Instance.Currency.SpendPigment(cost))
            {
                moth.level++;
                moth.speed = GameConstants.MOTH_BASE_SPEED * moth.level;
                moth.searchRadius = GameConstants.MOTH_SEARCH_RADIUS * moth.level;
                activeMoths[index] = moth;

                GameEvents.InvokeUnitUpgraded(UnitType.Moth, moth.level);
            }
        }
    }

    [Serializable]
    public struct SeedUnit
    {
        public Vector2 position;
        public Color color;
        public int level;
        public float radius;
        public float paintRate;
        public float paintTimer;

        public void Update(float deltaTime, CanvasManager canvas)
        {
            if (canvas == null) return;

            paintTimer += deltaTime;
            float interval = 1f / paintRate;

            if (paintTimer >= interval)
            {
                // Paint in a small area around the seed
                Vector2 offset = UnityEngine.Random.insideUnitCircle * radius;
                canvas.PaintAt(position + offset, color, radius * 0.2f);
                paintTimer = 0f;
            }
        }
    }

    [Serializable]
    public struct MothUnit
    {
        public Vector2 position;
        public Color color;
        public int level;
        public float speed;
        public float searchRadius;
        public Vector2 targetPosition;
        public bool hasTarget;
        public float paintTimer;
        public float searchTimer;

        public void Update(float deltaTime, CanvasManager canvas, SimulationManager sim)
        {
            if (canvas == null) return;

            searchTimer += deltaTime;

            // Search for faded areas periodically
            if (!hasTarget || searchTimer >= 2f)
            {
                FindFadedTarget(canvas, sim);
                searchTimer = 0f;
            }

            // Move towards target
            if (hasTarget)
            {
                Vector2 direction = (targetPosition - position).normalized;
                position += direction * speed * deltaTime;

                // Check if reached target
                if (Vector2.Distance(position, targetPosition) < 10f)
                {
                    // Paint at target
                    paintTimer += deltaTime;
                    if (paintTimer >= 0.1f)
                    {
                        canvas.PaintAt(position, color, 15f);
                        paintTimer = 0f;
                    }
                }
            }
            else
            {
                // Wander randomly
                position += UnityEngine.Random.insideUnitCircle * speed * 0.2f * deltaTime;
            }

            // Clamp position to canvas bounds
            if (canvas != null)
            {
                position.x = Mathf.Clamp(position.x, 0, canvas.Width);
                position.y = Mathf.Clamp(position.y, 0, canvas.Height);
            }
        }

        private void FindFadedTarget(CanvasManager canvas, SimulationManager sim)
        {
            if (canvas == null) return;

            // Sample random positions within search radius
            float bestFade = 0f;
            Vector2 bestTarget = position;
            bool foundTarget = false;

            int samples = 8;
            Color backgroundColor = new Color(0.95f, 0.93f, 0.9f, 1f);

            for (int i = 0; i < samples; i++)
            {
                Vector2 samplePos = position + UnityEngine.Random.insideUnitCircle * searchRadius;
                samplePos.x = Mathf.Clamp(samplePos.x, 0, canvas.Width);
                samplePos.y = Mathf.Clamp(samplePos.y, 0, canvas.Height);

                Color sample = canvas.SampleAt(samplePos);

                // Calculate how "faded" this position is (closer to background = more faded)
                float fadeAmount = 1f - ColorDistance(sample, backgroundColor);

                // Prefer positions that are partially faded (not fully painted, not fully blank)
                float score = fadeAmount * (1f - fadeAmount) * 4f; // Peaks at 0.5

                if (score > bestFade)
                {
                    bestFade = score;
                    bestTarget = samplePos;
                    foundTarget = true;
                }
            }

            targetPosition = bestTarget;
            hasTarget = foundTarget && bestFade > 0.1f;
        }

        private static float ColorDistance(Color a, Color b)
        {
            return Mathf.Sqrt(
                (a.r - b.r) * (a.r - b.r) +
                (a.g - b.g) * (a.g - b.g) +
                (a.b - b.b) * (a.b - b.b)
            );
        }
    }
}
