using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using FractalUpkeep.Core;
using FractalUpkeep.Canvas;
using FractalUpkeep.Levels;

namespace FractalUpkeep.UI
{
    /// <summary>
    /// Manages gameplay UI elements during active play
    /// </summary>
    public class GameplayUI : MonoBehaviour
    {
        [Header("Brush Controls")]
        [SerializeField] private Slider brushSizeSlider;
        [SerializeField] private Slider brushRateSlider;
        [SerializeField] private TextMeshProUGUI brushSizeText;
        [SerializeField] private Transform colorPaletteContainer;
        [SerializeField] private GameObject colorButtonPrefab;

        [Header("Status Display")]
        [SerializeField] private TextMeshProUGUI beautyText;
        [SerializeField] private TextMeshProUGUI coverageText;
        [SerializeField] private TextMeshProUGUI timeText;
        [SerializeField] private Slider progressBar;
        [SerializeField] private TextMeshProUGUI objectiveText;

        [Header("Currency Display")]
        [SerializeField] private TextMeshProUGUI pigmentText;
        [SerializeField] private TextMeshProUGUI sporesText;

        [Header("Unit Buttons")]
        [SerializeField] private Button placeSeedButton;
        [SerializeField] private Button placeMothButton;
        [SerializeField] private Button placeSealButton;
        [SerializeField] private TextMeshProUGUI seedCostText;
        [SerializeField] private TextMeshProUGUI mothCostText;

        [Header("Action Buttons")]
        [SerializeField] private Button pauseButton;
        [SerializeField] private Button clearButton;

        private BrushController brushController;
        private List<Button> colorButtons = new List<Button>();

        private void Start()
        {
            brushController = FindObjectOfType<BrushController>();
            SetupSliders();
            SetupColorPalette();
            SetupButtons();
        }

        private void OnEnable()
        {
            GameEvents.OnBeautyChanged += UpdateBeautyDisplay;
            GameEvents.OnCoverageChanged += UpdateCoverageDisplay;
            GameEvents.OnLevelTimeUpdated += UpdateTimeDisplay;
            GameEvents.OnPigmentChanged += UpdatePigmentDisplay;
            GameEvents.OnSporesChanged += UpdateSporesDisplay;
            GameEvents.OnLevelStarted += OnLevelStarted;
        }

        private void OnDisable()
        {
            GameEvents.OnBeautyChanged -= UpdateBeautyDisplay;
            GameEvents.OnCoverageChanged -= UpdateCoverageDisplay;
            GameEvents.OnLevelTimeUpdated -= UpdateTimeDisplay;
            GameEvents.OnPigmentChanged -= UpdatePigmentDisplay;
            GameEvents.OnSporesChanged -= UpdateSporesDisplay;
            GameEvents.OnLevelStarted -= OnLevelStarted;
        }

        private void Update()
        {
            UpdateProgress();
            UpdateUnitButtons();
        }

        private void SetupSliders()
        {
            if (brushSizeSlider != null)
            {
                brushSizeSlider.minValue = GameConstants.MIN_BRUSH_SIZE;
                brushSizeSlider.maxValue = GameConstants.MAX_BRUSH_SIZE;
                brushSizeSlider.value = GameConstants.DEFAULT_BRUSH_SIZE;
                brushSizeSlider.onValueChanged.AddListener(OnBrushSizeChanged);
            }

            if (brushRateSlider != null)
            {
                brushRateSlider.minValue = GameConstants.MIN_EMISSION_RATE;
                brushRateSlider.maxValue = GameConstants.MAX_EMISSION_RATE;
                brushRateSlider.value = GameConstants.DEFAULT_EMISSION_RATE;
                brushRateSlider.onValueChanged.AddListener(OnBrushRateChanged);
            }
        }

        private void SetupColorPalette()
        {
            if (brushController == null || colorPaletteContainer == null) return;

            // Clear existing buttons
            foreach (Transform child in colorPaletteContainer)
            {
                Destroy(child.gameObject);
            }
            colorButtons.Clear();

            // Create color buttons
            var palette = brushController.GetPalette();
            for (int i = 0; i < palette.Count; i++)
            {
                int index = i;
                GameObject buttonObj;

                if (colorButtonPrefab != null)
                {
                    buttonObj = Instantiate(colorButtonPrefab, colorPaletteContainer);
                }
                else
                {
                    buttonObj = new GameObject($"Color_{i}");
                    buttonObj.transform.SetParent(colorPaletteContainer);
                    buttonObj.AddComponent<Image>();
                    buttonObj.AddComponent<Button>();
                }

                var image = buttonObj.GetComponent<Image>();
                var button = buttonObj.GetComponent<Button>();

                if (image != null) image.color = palette[i];
                if (button != null) button.onClick.AddListener(() => OnColorSelected(index));

                colorButtons.Add(button);
            }
        }

        private void SetupButtons()
        {
            if (pauseButton != null)
            {
                pauseButton.onClick.AddListener(() => GameEvents.InvokePauseRequested());
            }

            if (clearButton != null)
            {
                clearButton.onClick.AddListener(OnClearCanvas);
            }

            if (placeSeedButton != null)
            {
                placeSeedButton.onClick.AddListener(OnPlaceSeed);
            }

            if (placeMothButton != null)
            {
                placeMothButton.onClick.AddListener(OnPlaceMoth);
            }

            if (placeSealButton != null)
            {
                placeSealButton.onClick.AddListener(OnPlaceSeal);
            }
        }

        private void OnBrushSizeChanged(float value)
        {
            if (brushController != null)
            {
                brushController.BrushSize = value;
            }
            if (brushSizeText != null)
            {
                brushSizeText.text = $"{value:F0}";
            }
        }

        private void OnBrushRateChanged(float value)
        {
            if (brushController != null)
            {
                brushController.EmissionRate = value;
            }
        }

        private void OnColorSelected(int index)
        {
            if (brushController != null)
            {
                brushController.SetPaletteColor(index);
            }
        }

        private void OnClearCanvas()
        {
            GameManager.Instance?.Canvas?.ClearCanvas();
        }

        private void OnPlaceSeed()
        {
            // TODO: Enter seed placement mode
            var units = GameManager.Instance?.Units;
            var brush = brushController;
            if (units != null && brush != null)
            {
                // Place at center for now - full implementation would use touch
                Vector2 center = new Vector2(
                    GameConstants.DEFAULT_CANVAS_WIDTH / 2f,
                    GameConstants.DEFAULT_CANVAS_HEIGHT / 2f
                );
                units.PlaceSeed(center, brush.CurrentColor);
            }
        }

        private void OnPlaceMoth()
        {
            var units = GameManager.Instance?.Units;
            var brush = brushController;
            if (units != null && brush != null)
            {
                Vector2 center = new Vector2(
                    GameConstants.DEFAULT_CANVAS_WIDTH / 2f,
                    GameConstants.DEFAULT_CANVAS_HEIGHT / 2f
                );
                units.PlaceMoth(center, brush.CurrentColor);
            }
        }

        private void OnPlaceSeal()
        {
            var sim = GameManager.Instance?.Simulation;
            if (sim != null)
            {
                Vector2 center = new Vector2(
                    GameConstants.DEFAULT_CANVAS_WIDTH / 2f,
                    GameConstants.DEFAULT_CANVAS_HEIGHT / 2f
                );
                sim.PlaceSeal(center, 100f, GameConstants.SEAL_DEFAULT_DURATION);
            }
        }

        private void UpdateBeautyDisplay(float beauty)
        {
            if (beautyText != null)
            {
                beautyText.text = $"Beauty: {beauty:F1}";
            }
        }

        private void UpdateCoverageDisplay(float coverage)
        {
            if (coverageText != null)
            {
                coverageText.text = $"Coverage: {coverage * 100:F0}%";
            }
        }

        private void UpdateTimeDisplay(float time)
        {
            if (timeText == null) return;

            var level = GameManager.Instance?.Levels?.CurrentLevel;
            if (level != null && level.HasTimeLimit)
            {
                float remaining = Mathf.Max(0, level.TimeLimit - time);
                int minutes = (int)(remaining / 60);
                int seconds = (int)(remaining % 60);
                timeText.text = $"{minutes}:{seconds:D2}";
            }
            else
            {
                int minutes = (int)(time / 60);
                int seconds = (int)(time % 60);
                timeText.text = $"{minutes}:{seconds:D2}";
            }
        }

        private void UpdatePigmentDisplay(float amount)
        {
            if (pigmentText != null)
            {
                pigmentText.text = $"Pigment: {amount:F0}";
            }
        }

        private void UpdateSporesDisplay(int amount)
        {
            if (sporesText != null)
            {
                sporesText.text = $"Spores: {amount}";
            }
        }

        private void UpdateProgress()
        {
            if (progressBar == null) return;

            var levels = GameManager.Instance?.Levels;
            if (levels != null)
            {
                progressBar.value = levels.GetLevelProgress();
            }
        }

        private void UpdateUnitButtons()
        {
            var level = GameManager.Instance?.Levels?.CurrentLevel as LevelData;
            var units = GameManager.Instance?.Units;
            var currency = GameManager.Instance?.Currency;

            if (placeSeedButton != null)
            {
                bool available = level != null && level.SeedsUnlocked;
                placeSeedButton.gameObject.SetActive(available);

                if (available && seedCostText != null && units != null)
                {
                    float cost = units.GetSeedCost(1);
                    seedCostText.text = $"{cost:F0}";
                    placeSeedButton.interactable = currency != null && currency.CanAffordPigment(cost);
                }
            }

            if (placeMothButton != null)
            {
                bool available = level != null && level.MothsUnlocked;
                placeMothButton.gameObject.SetActive(available);

                if (available && mothCostText != null && units != null)
                {
                    float cost = units.GetMothCost(1);
                    mothCostText.text = $"{cost:F0}";
                    placeMothButton.interactable = currency != null && currency.CanAffordPigment(cost);
                }
            }

            if (placeSealButton != null)
            {
                bool available = level != null && level.SealUnlocked;
                placeSealButton.gameObject.SetActive(available);
            }
        }

        private void OnLevelStarted(Core.LevelData levelData)
        {
            if (levelData is LevelData level && objectiveText != null)
            {
                objectiveText.text = level.GetObjectiveDescription();
            }

            // Refresh color palette for level
            SetupColorPalette();
        }
    }
}
