using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using FractalUpkeep.Core;
using FractalUpkeep.Levels;

namespace FractalUpkeep.UI
{
    /// <summary>
    /// Manages the level selection screen
    /// </summary>
    public class LevelSelectUI : MonoBehaviour
    {
        [Header("Level Grid")]
        [SerializeField] private Transform levelGridContainer;
        [SerializeField] private GameObject levelButtonPrefab;

        [Header("Level Info Panel")]
        [SerializeField] private GameObject levelInfoPanel;
        [SerializeField] private TextMeshProUGUI levelNameText;
        [SerializeField] private TextMeshProUGUI levelDescriptionText;
        [SerializeField] private TextMeshProUGUI objectiveText;
        [SerializeField] private TextMeshProUGUI rewardText;
        [SerializeField] private TextMeshProUGUI bestScoreText;
        [SerializeField] private Image levelThumbnail;
        [SerializeField] private Button startButton;
        [SerializeField] private Button backButton;

        [Header("Tier Tabs")]
        [SerializeField] private Transform tierTabContainer;
        [SerializeField] private GameObject tierTabPrefab;

        private LevelData selectedLevel;
        private List<LevelButtonUI> levelButtons = new List<LevelButtonUI>();
        private int currentTier = 1;

        private void Start()
        {
            SetupTierTabs();
            PopulateLevelGrid(1);
            SetupButtons();
            HideLevelInfo();
        }

        private void OnEnable()
        {
            RefreshLevelStates();
        }

        private void SetupTierTabs()
        {
            if (tierTabContainer == null) return;

            // Clear existing tabs
            foreach (Transform child in tierTabContainer)
            {
                Destroy(child.gameObject);
            }

            // Get unique tiers
            var levels = GameManager.Instance?.Levels?.GetAllLevels();
            if (levels == null) return;

            HashSet<int> tiers = new HashSet<int>();
            foreach (var level in levels)
            {
                tiers.Add(level.Tier);
            }

            // Create tab for each tier
            foreach (int tier in tiers)
            {
                int tierIndex = tier;
                GameObject tabObj;

                if (tierTabPrefab != null)
                {
                    tabObj = Instantiate(tierTabPrefab, tierTabContainer);
                }
                else
                {
                    tabObj = new GameObject($"Tier_{tier}");
                    tabObj.transform.SetParent(tierTabContainer);
                    tabObj.AddComponent<Image>();
                    tabObj.AddComponent<Button>();
                    var text = new GameObject("Text").AddComponent<TextMeshProUGUI>();
                    text.transform.SetParent(tabObj.transform);
                    text.text = $"Tier {tier}";
                }

                var button = tabObj.GetComponent<Button>();
                if (button != null)
                {
                    button.onClick.AddListener(() => OnTierSelected(tierIndex));
                }

                var tabText = tabObj.GetComponentInChildren<TextMeshProUGUI>();
                if (tabText != null)
                {
                    tabText.text = $"Tier {tier}";
                }
            }
        }

        private void PopulateLevelGrid(int tier)
        {
            if (levelGridContainer == null) return;

            currentTier = tier;

            // Clear existing buttons
            foreach (Transform child in levelGridContainer)
            {
                Destroy(child.gameObject);
            }
            levelButtons.Clear();

            // Get levels for this tier
            var levels = GameManager.Instance?.Levels?.GetLevelsByTier(tier);
            if (levels == null) return;

            foreach (var level in levels)
            {
                GameObject buttonObj;

                if (levelButtonPrefab != null)
                {
                    buttonObj = Instantiate(levelButtonPrefab, levelGridContainer);
                }
                else
                {
                    buttonObj = CreateDefaultLevelButton();
                    buttonObj.transform.SetParent(levelGridContainer);
                }

                var levelButton = buttonObj.GetComponent<LevelButtonUI>();
                if (levelButton == null)
                {
                    levelButton = buttonObj.AddComponent<LevelButtonUI>();
                }

                levelButton.Setup(level, OnLevelSelected);
                levelButtons.Add(levelButton);
            }
        }

        private GameObject CreateDefaultLevelButton()
        {
            var buttonObj = new GameObject("LevelButton");

            var image = buttonObj.AddComponent<Image>();
            image.color = new Color(0.2f, 0.2f, 0.2f);

            var button = buttonObj.AddComponent<Button>();

            var textObj = new GameObject("Text");
            textObj.transform.SetParent(buttonObj.transform);
            var text = textObj.AddComponent<TextMeshProUGUI>();
            text.alignment = TextAlignmentOptions.Center;
            text.fontSize = 24;

            var rect = buttonObj.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(150, 150);

            return buttonObj;
        }

        private void SetupButtons()
        {
            if (startButton != null)
            {
                startButton.onClick.AddListener(OnStartLevel);
            }

            if (backButton != null)
            {
                backButton.onClick.AddListener(OnBackButton);
            }
        }

        private void OnTierSelected(int tier)
        {
            PopulateLevelGrid(tier);
            HideLevelInfo();
        }

        private void OnLevelSelected(LevelData level)
        {
            selectedLevel = level;
            ShowLevelInfo(level);
        }

        private void ShowLevelInfo(LevelData level)
        {
            if (levelInfoPanel != null) levelInfoPanel.SetActive(true);

            if (levelNameText != null) levelNameText.text = level.Name;
            if (levelDescriptionText != null) levelDescriptionText.text = level.Description;
            if (objectiveText != null) objectiveText.text = level.GetObjectiveDescription();

            if (rewardText != null)
            {
                rewardText.text = $"Rewards: {level.SporeReward} Spores";
                if (level.PigmentBonus > 0)
                {
                    rewardText.text += $", +{level.PigmentBonus:F0} Pigment";
                }
            }

            if (levelThumbnail != null && level.Thumbnail != null)
            {
                levelThumbnail.sprite = level.Thumbnail;
            }

            var progression = GameManager.Instance?.Progression;
            if (bestScoreText != null && progression != null)
            {
                int bestScore = progression.GetLevelBestScore(level.Id);
                bestScoreText.text = bestScore > 0 ? $"Best: {bestScore}" : "Not completed";
            }

            var levels = GameManager.Instance?.Levels;
            if (startButton != null && levels != null)
            {
                startButton.interactable = levels.IsLevelUnlocked(level);
            }
        }

        private void HideLevelInfo()
        {
            if (levelInfoPanel != null) levelInfoPanel.SetActive(false);
            selectedLevel = null;
        }

        private void OnStartLevel()
        {
            if (selectedLevel == null) return;

            GameManager.Instance?.StartLevel(selectedLevel);
        }

        private void OnBackButton()
        {
            GameManager.Instance?.OpenMainMenu();
        }

        private void RefreshLevelStates()
        {
            foreach (var button in levelButtons)
            {
                button.RefreshState();
            }
        }
    }

    /// <summary>
    /// Individual level button in the selection grid
    /// </summary>
    public class LevelButtonUI : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI levelNumberText;
        [SerializeField] private TextMeshProUGUI levelNameText;
        [SerializeField] private Image thumbnailImage;
        [SerializeField] private Image completedIcon;
        [SerializeField] private Image lockedIcon;
        [SerializeField] private Button button;

        private LevelData levelData;
        private System.Action<LevelData> onSelected;

        public void Setup(LevelData level, System.Action<LevelData> callback)
        {
            levelData = level;
            onSelected = callback;

            if (button == null) button = GetComponent<Button>();
            if (button != null)
            {
                button.onClick.AddListener(OnClick);
            }

            UpdateDisplay();
        }

        private void UpdateDisplay()
        {
            if (levelData == null) return;

            if (levelNumberText != null) levelNumberText.text = levelData.Number.ToString();
            if (levelNameText != null) levelNameText.text = levelData.Name;
            if (thumbnailImage != null && levelData.Thumbnail != null)
            {
                thumbnailImage.sprite = levelData.Thumbnail;
            }

            RefreshState();
        }

        public void RefreshState()
        {
            if (levelData == null) return;

            var progression = GameManager.Instance?.Progression;
            var levels = GameManager.Instance?.Levels;

            bool isUnlocked = levels != null && levels.IsLevelUnlocked(levelData);
            bool isCompleted = progression != null && progression.IsLevelCompleted(levelData.Id);

            if (button != null) button.interactable = isUnlocked;
            if (completedIcon != null) completedIcon.gameObject.SetActive(isCompleted);
            if (lockedIcon != null) lockedIcon.gameObject.SetActive(!isUnlocked);
        }

        private void OnClick()
        {
            onSelected?.Invoke(levelData);
        }
    }
}
