using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using FractalUpkeep.Core;
using FractalUpkeep.Canvas;
using FractalUpkeep.Sim;

namespace FractalUpkeep.Levels
{
    /// <summary>
    /// Manages level loading, progression, and completion
    /// </summary>
    public class LevelManager : MonoBehaviour
    {
        [Header("Level Data")]
        [SerializeField] private List<LevelData> allLevels = new List<LevelData>();
        [SerializeField] private LevelData currentLevel;

        [Header("State")]
        [SerializeField] private float elapsedTime = 0f;
        [SerializeField] private bool levelActive = false;

        [Header("References")]
        [SerializeField] private CanvasManager canvasManager;
        [SerializeField] private SimulationManager simulationManager;
        [SerializeField] private GalleryManager galleryManager;

        public LevelData CurrentLevel => currentLevel;
        public float ElapsedTime => elapsedTime;
        public float TimeRemaining => currentLevel != null && currentLevel.HasTimeLimit
            ? Mathf.Max(0, currentLevel.TimeLimit - elapsedTime)
            : float.MaxValue;
        public bool LevelActive => levelActive;

        private float lastBeauty = 0f;
        private float lastCoverage = 0f;

        private void Awake()
        {
            LoadAllLevels();
        }

        private void Start()
        {
            if (canvasManager == null) canvasManager = FindObjectOfType<CanvasManager>();
            if (simulationManager == null) simulationManager = FindObjectOfType<SimulationManager>();
            if (galleryManager == null) galleryManager = FindObjectOfType<GalleryManager>();
        }

        private void OnEnable()
        {
            GameEvents.OnBeautyChanged += OnBeautyChanged;
            GameEvents.OnCoverageChanged += OnCoverageChanged;
        }

        private void OnDisable()
        {
            GameEvents.OnBeautyChanged -= OnBeautyChanged;
            GameEvents.OnCoverageChanged -= OnCoverageChanged;
        }

        private void Update()
        {
            if (!levelActive || currentLevel == null) return;

            elapsedTime += Time.deltaTime;
            GameEvents.InvokeLevelTimeUpdated(elapsedTime);

            // Check for time limit failure
            if (currentLevel.HasTimeLimit && elapsedTime >= currentLevel.TimeLimit)
            {
                if (currentLevel.PrimaryObjective == LevelObjectiveType.SurviveTime ||
                    currentLevel.PrimaryObjective == LevelObjectiveType.MaintainBeauty)
                {
                    // Time-based objective - check if met
                    if (currentLevel.CheckObjectiveComplete(lastBeauty, lastCoverage, elapsedTime))
                    {
                        CompleteLevel();
                    }
                    else
                    {
                        FailLevel();
                    }
                }
                else
                {
                    // Time ran out for beauty/coverage objective
                    FailLevel();
                }
            }

            // Check for objective completion
            if (currentLevel.CheckObjectiveComplete(lastBeauty, lastCoverage, elapsedTime))
            {
                if (currentLevel.PrimaryObjective != LevelObjectiveType.SurviveTime &&
                    currentLevel.PrimaryObjective != LevelObjectiveType.MaintainBeauty)
                {
                    CompleteLevel();
                }
            }
        }

        private void LoadAllLevels()
        {
            var levels = Resources.LoadAll<LevelData>(GameConstants.LEVELS_PATH);
            allLevels = levels.OrderBy(l => l.Tier).ThenBy(l => l.Number).ToList();
            Debug.Log($"[LevelManager] Loaded {allLevels.Count} levels");
        }

        public void StartLevel(LevelData level)
        {
            if (level == null)
            {
                Debug.LogError("[LevelManager] Cannot start null level");
                return;
            }

            currentLevel = level;
            elapsedTime = 0f;
            lastBeauty = 0f;
            lastCoverage = 0f;
            levelActive = true;

            // Apply level settings
            if (simulationManager != null)
            {
                simulationManager.SetFadeRate(level.FadeIntensity);
                if (level.DecayEnabled)
                {
                    simulationManager.ResumeDecay();
                }
                else
                {
                    simulationManager.PauseDecay();
                }
            }

            Debug.Log($"[LevelManager] Started level: {level.Name}");
            GameEvents.InvokeLevelStarted(level);
        }

        public void EndLevel(bool completed)
        {
            if (!levelActive) return;

            levelActive = false;

            if (completed)
            {
                int score = currentLevel.CalculateScore(lastBeauty, lastCoverage, TimeRemaining);

                // Mark level completed in progression
                var progression = GameManager.Instance?.Progression;
                progression?.MarkLevelCompleted(currentLevel.Id, score);

                // Capture snapshot for gallery
                if (galleryManager != null && canvasManager != null)
                {
                    var snapshot = canvasManager.CaptureSnapshot();
                    galleryManager.SaveSnapshot(currentLevel.Id, snapshot);
                }

                GameEvents.InvokeLevelCompleted(currentLevel);
            }

            GameEvents.InvokeLevelEnded(currentLevel, completed);
        }

        private void CompleteLevel()
        {
            Debug.Log($"[LevelManager] Level completed: {currentLevel.Name}");
            EndLevel(true);
        }

        private void FailLevel()
        {
            Debug.Log($"[LevelManager] Level failed: {currentLevel.Name}");
            EndLevel(false);
        }

        private void OnBeautyChanged(float beauty)
        {
            lastBeauty = beauty;
        }

        private void OnCoverageChanged(float coverage)
        {
            lastCoverage = coverage;
        }

        public List<LevelData> GetAllLevels() => new List<LevelData>(allLevels);

        public List<LevelData> GetLevelsByTier(int tier)
        {
            return allLevels.Where(l => l.Tier == tier).ToList();
        }

        public LevelData GetLevelById(string id)
        {
            return allLevels.FirstOrDefault(l => l.Id == id);
        }

        public LevelData GetNextLevel()
        {
            if (currentLevel == null) return allLevels.FirstOrDefault();

            int currentIndex = allLevels.IndexOf(currentLevel);
            if (currentIndex < 0 || currentIndex >= allLevels.Count - 1) return null;

            return allLevels[currentIndex + 1];
        }

        public bool IsLevelUnlocked(LevelData level)
        {
            if (level == null) return false;
            if (level.Number == 1 && level.Tier == 1) return true;

            var progression = GameManager.Instance?.Progression;
            if (progression == null) return false;

            // Check if previous level in same tier is completed
            var previousLevel = allLevels.FirstOrDefault(l =>
                l.Tier == level.Tier && l.Number == level.Number - 1);

            if (previousLevel != null)
            {
                return progression.IsLevelCompleted(previousLevel.Id);
            }

            // First level of a new tier - check if previous tier is complete
            var previousTierLevels = GetLevelsByTier(level.Tier - 1);
            if (previousTierLevels.Count == 0) return true;

            return previousTierLevels.All(l => progression.IsLevelCompleted(l.Id));
        }

        public float GetLevelProgress()
        {
            if (currentLevel == null || !levelActive) return 0f;

            switch (currentLevel.PrimaryObjective)
            {
                case LevelObjectiveType.ReachBeauty:
                    return Mathf.Clamp01(lastBeauty / currentLevel.TargetBeauty);

                case LevelObjectiveType.ReachCoverage:
                    return Mathf.Clamp01(lastCoverage / currentLevel.TargetCoverage);

                case LevelObjectiveType.SurviveTime:
                case LevelObjectiveType.MaintainBeauty:
                    return Mathf.Clamp01(elapsedTime / currentLevel.TimeLimit);

                case LevelObjectiveType.BeautyAndCoverage:
                    float beautyProgress = Mathf.Clamp01(lastBeauty / currentLevel.TargetBeauty);
                    float coverageProgress = Mathf.Clamp01(lastCoverage / currentLevel.TargetCoverage);
                    return (beautyProgress + coverageProgress) / 2f;

                default:
                    return 0f;
            }
        }
    }
}
