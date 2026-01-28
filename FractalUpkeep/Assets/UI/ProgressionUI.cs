using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using FractalUpkeep.Core;
using FractalUpkeep.Content;

namespace FractalUpkeep.UI
{
    /// <summary>
    /// Manages the progression/upgrades screen
    /// </summary>
    public class ProgressionUI : MonoBehaviour
    {
        [Header("Tabs")]
        [SerializeField] private Button upgradesTabButton;
        [SerializeField] private Button unlocksTabButton;
        [SerializeField] private GameObject upgradesPanel;
        [SerializeField] private GameObject unlocksPanel;

        [Header("Upgrades")]
        [SerializeField] private Transform upgradesContainer;
        [SerializeField] private GameObject upgradeItemPrefab;

        [Header("Unlocks")]
        [SerializeField] private Transform unlocksContainer;
        [SerializeField] private GameObject unlockItemPrefab;

        [Header("Currency Display")]
        [SerializeField] private TextMeshProUGUI pigmentText;
        [SerializeField] private TextMeshProUGUI sporesText;

        [Header("Navigation")]
        [SerializeField] private Button backButton;

        private List<UpgradeItemUI> upgradeItems = new List<UpgradeItemUI>();
        private List<UnlockItemUI> unlockItems = new List<UnlockItemUI>();

        private void Start()
        {
            SetupTabs();
            SetupButtons();
            PopulateUpgrades();
            PopulateUnlocks();
            ShowUpgradesTab();
        }

        private void OnEnable()
        {
            GameEvents.OnPigmentChanged += UpdatePigmentDisplay;
            GameEvents.OnSporesChanged += UpdateSporesDisplay;
            GameEvents.OnUpgradePurchased += OnUpgradePurchased;
            GameEvents.OnItemUnlocked += OnItemUnlocked;

            RefreshAll();
        }

        private void OnDisable()
        {
            GameEvents.OnPigmentChanged -= UpdatePigmentDisplay;
            GameEvents.OnSporesChanged -= UpdateSporesDisplay;
            GameEvents.OnUpgradePurchased -= OnUpgradePurchased;
            GameEvents.OnItemUnlocked -= OnItemUnlocked;
        }

        private void SetupTabs()
        {
            if (upgradesTabButton != null)
            {
                upgradesTabButton.onClick.AddListener(ShowUpgradesTab);
            }
            if (unlocksTabButton != null)
            {
                unlocksTabButton.onClick.AddListener(ShowUnlocksTab);
            }
        }

        private void SetupButtons()
        {
            if (backButton != null)
            {
                backButton.onClick.AddListener(OnBackButton);
            }
        }

        private void ShowUpgradesTab()
        {
            if (upgradesPanel != null) upgradesPanel.SetActive(true);
            if (unlocksPanel != null) unlocksPanel.SetActive(false);
        }

        private void ShowUnlocksTab()
        {
            if (upgradesPanel != null) upgradesPanel.SetActive(false);
            if (unlocksPanel != null) unlocksPanel.SetActive(true);
        }

        private void PopulateUpgrades()
        {
            if (upgradesContainer == null) return;

            var progression = GameManager.Instance?.Progression;
            if (progression == null) return;

            var upgrades = progression.GetAvailableUpgrades();

            foreach (var upgrade in upgrades)
            {
                GameObject itemObj;

                if (upgradeItemPrefab != null)
                {
                    itemObj = Instantiate(upgradeItemPrefab, upgradesContainer);
                }
                else
                {
                    itemObj = CreateDefaultUpgradeItem();
                    itemObj.transform.SetParent(upgradesContainer);
                }

                var upgradeItem = itemObj.GetComponent<UpgradeItemUI>();
                if (upgradeItem == null)
                {
                    upgradeItem = itemObj.AddComponent<UpgradeItemUI>();
                }

                upgradeItem.Setup(upgrade);
                upgradeItems.Add(upgradeItem);
            }
        }

        private void PopulateUnlocks()
        {
            if (unlocksContainer == null) return;

            var progression = GameManager.Instance?.Progression;
            if (progression == null) return;

            var unlocks = progression.GetAvailableUnlocks();

            foreach (var unlock in unlocks)
            {
                GameObject itemObj;

                if (unlockItemPrefab != null)
                {
                    itemObj = Instantiate(unlockItemPrefab, unlocksContainer);
                }
                else
                {
                    itemObj = CreateDefaultUnlockItem();
                    itemObj.transform.SetParent(unlocksContainer);
                }

                var unlockItem = itemObj.GetComponent<UnlockItemUI>();
                if (unlockItem == null)
                {
                    unlockItem = itemObj.AddComponent<UnlockItemUI>();
                }

                unlockItem.Setup(unlock);
                unlockItems.Add(unlockItem);
            }
        }

        private GameObject CreateDefaultUpgradeItem()
        {
            var itemObj = new GameObject("UpgradeItem");

            var image = itemObj.AddComponent<Image>();
            image.color = new Color(0.15f, 0.15f, 0.15f);

            var layout = itemObj.AddComponent<HorizontalLayoutGroup>();
            layout.padding = new RectOffset(10, 10, 10, 10);
            layout.spacing = 10;

            var rect = itemObj.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(400, 80);

            return itemObj;
        }

        private GameObject CreateDefaultUnlockItem()
        {
            var itemObj = new GameObject("UnlockItem");

            var image = itemObj.AddComponent<Image>();
            image.color = new Color(0.15f, 0.15f, 0.2f);

            var rect = itemObj.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(150, 150);

            return itemObj;
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

        private void OnUpgradePurchased(UpgradeData upgrade)
        {
            RefreshUpgrades();
        }

        private void OnItemUnlocked(UnlockData unlock)
        {
            RefreshUnlocks();
        }

        private void RefreshAll()
        {
            RefreshUpgrades();
            RefreshUnlocks();

            var currency = GameManager.Instance?.Currency;
            if (currency != null)
            {
                UpdatePigmentDisplay(currency.Pigment);
                UpdateSporesDisplay(currency.Spores);
            }
        }

        private void RefreshUpgrades()
        {
            foreach (var item in upgradeItems)
            {
                item.Refresh();
            }
        }

        private void RefreshUnlocks()
        {
            foreach (var item in unlockItems)
            {
                item.Refresh();
            }
        }

        private void OnBackButton()
        {
            GameManager.Instance?.OpenMainMenu();
        }
    }

    /// <summary>
    /// Individual upgrade item in the progression screen
    /// </summary>
    public class UpgradeItemUI : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI nameText;
        [SerializeField] private TextMeshProUGUI descriptionText;
        [SerializeField] private TextMeshProUGUI levelText;
        [SerializeField] private TextMeshProUGUI costText;
        [SerializeField] private Image iconImage;
        [SerializeField] private Button purchaseButton;
        [SerializeField] private Slider progressBar;

        private UpgradeDefinition upgradeData;

        public void Setup(UpgradeDefinition upgrade)
        {
            upgradeData = upgrade;

            if (nameText != null) nameText.text = upgrade.Name;
            if (descriptionText != null) descriptionText.text = upgrade.Description;
            if (iconImage != null && upgrade.Icon != null) iconImage.sprite = upgrade.Icon;

            if (purchaseButton != null)
            {
                purchaseButton.onClick.AddListener(OnPurchase);
            }

            Refresh();
        }

        public void Refresh()
        {
            if (upgradeData == null) return;

            var progression = GameManager.Instance?.Progression;
            if (progression == null) return;

            int currentLevel = progression.GetUpgradeLevel(upgradeData.Id);
            float cost = progression.GetUpgradeCost(upgradeData.Id);
            bool canPurchase = progression.CanPurchaseUpgrade(upgradeData.Id);
            bool maxed = currentLevel >= upgradeData.MaxLevel;

            if (levelText != null)
            {
                levelText.text = maxed ? "MAX" : $"Lv.{currentLevel}";
            }

            if (costText != null)
            {
                costText.text = maxed ? "" : $"{cost:F0} Pigment";
            }

            if (purchaseButton != null)
            {
                purchaseButton.interactable = canPurchase && !maxed;
            }

            if (progressBar != null)
            {
                progressBar.value = (float)currentLevel / upgradeData.MaxLevel;
            }
        }

        private void OnPurchase()
        {
            if (upgradeData == null) return;

            var progression = GameManager.Instance?.Progression;
            progression?.PurchaseUpgrade(upgradeData.Id);
        }
    }

    /// <summary>
    /// Individual unlock item in the progression screen
    /// </summary>
    public class UnlockItemUI : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI nameText;
        [SerializeField] private TextMeshProUGUI costText;
        [SerializeField] private Image iconImage;
        [SerializeField] private Image lockedOverlay;
        [SerializeField] private Button purchaseButton;

        private UnlockDefinition unlockData;

        public void Setup(UnlockDefinition unlock)
        {
            unlockData = unlock;

            if (nameText != null) nameText.text = unlock.Name;
            if (iconImage != null)
            {
                iconImage.sprite = unlock.Icon ?? unlock.LockedIcon;
            }

            if (purchaseButton != null)
            {
                purchaseButton.onClick.AddListener(OnPurchase);
            }

            Refresh();
        }

        public void Refresh()
        {
            if (unlockData == null) return;

            var progression = GameManager.Instance?.Progression;
            if (progression == null) return;

            bool isUnlocked = progression.IsItemUnlocked(unlockData.Id);
            bool canPurchase = progression.CanPurchaseUnlock(unlockData.Id);

            if (costText != null)
            {
                costText.text = isUnlocked ? "Owned" : $"{unlockData.SporeCost} Spores";
            }

            if (lockedOverlay != null)
            {
                lockedOverlay.gameObject.SetActive(!isUnlocked);
            }

            if (purchaseButton != null)
            {
                purchaseButton.interactable = canPurchase && !isUnlocked;
            }

            if (iconImage != null)
            {
                iconImage.sprite = isUnlocked ? unlockData.Icon : unlockData.LockedIcon;
                if (iconImage.sprite == null) iconImage.sprite = unlockData.Icon;
            }
        }

        private void OnPurchase()
        {
            if (unlockData == null) return;

            var progression = GameManager.Instance?.Progression;
            progression?.PurchaseUnlock(unlockData.Id);
        }
    }
}
