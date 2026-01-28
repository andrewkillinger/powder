using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using FractalUpkeep.Core;
using FractalUpkeep.Levels;

namespace FractalUpkeep.UI
{
    /// <summary>
    /// Manages the gallery screen showing level completion snapshots
    /// </summary>
    public class GalleryUI : MonoBehaviour
    {
        [Header("Gallery Grid")]
        [SerializeField] private Transform galleryContainer;
        [SerializeField] private GameObject galleryItemPrefab;

        [Header("Preview Panel")]
        [SerializeField] private GameObject previewPanel;
        [SerializeField] private Image previewImage;
        [SerializeField] private TextMeshProUGUI levelNameText;
        [SerializeField] private TextMeshProUGUI scoreText;
        [SerializeField] private TextMeshProUGUI dateText;
        [SerializeField] private Button closePreviewButton;
        [SerializeField] private Button shareButton;
        [SerializeField] private Button deleteButton;

        [Header("Navigation")]
        [SerializeField] private Button backButton;

        [Header("Empty State")]
        [SerializeField] private GameObject emptyStatePanel;
        [SerializeField] private TextMeshProUGUI emptyStateText;

        private List<GalleryItemUI> galleryItems = new List<GalleryItemUI>();
        private GalleryManager galleryManager;
        private string selectedSnapshotId;

        private void Start()
        {
            galleryManager = FindObjectOfType<GalleryManager>();
            SetupButtons();
            PopulateGallery();
            HidePreview();
        }

        private void OnEnable()
        {
            GameEvents.OnSnapshotTaken += OnSnapshotTaken;
            RefreshGallery();
        }

        private void OnDisable()
        {
            GameEvents.OnSnapshotTaken -= OnSnapshotTaken;
        }

        private void SetupButtons()
        {
            if (backButton != null)
            {
                backButton.onClick.AddListener(OnBackButton);
            }
            if (closePreviewButton != null)
            {
                closePreviewButton.onClick.AddListener(HidePreview);
            }
            if (shareButton != null)
            {
                shareButton.onClick.AddListener(OnShareButton);
            }
            if (deleteButton != null)
            {
                deleteButton.onClick.AddListener(OnDeleteButton);
            }
        }

        private void PopulateGallery()
        {
            if (galleryContainer == null || galleryManager == null) return;

            // Clear existing items
            foreach (Transform child in galleryContainer)
            {
                Destroy(child.gameObject);
            }
            galleryItems.Clear();

            // Get all snapshots
            var snapshots = galleryManager.GetAllSnapshots();

            if (snapshots.Count == 0)
            {
                ShowEmptyState();
                return;
            }

            HideEmptyState();

            foreach (var snapshot in snapshots)
            {
                GameObject itemObj;

                if (galleryItemPrefab != null)
                {
                    itemObj = Instantiate(galleryItemPrefab, galleryContainer);
                }
                else
                {
                    itemObj = CreateDefaultGalleryItem();
                    itemObj.transform.SetParent(galleryContainer);
                }

                var galleryItem = itemObj.GetComponent<GalleryItemUI>();
                if (galleryItem == null)
                {
                    galleryItem = itemObj.AddComponent<GalleryItemUI>();
                }

                galleryItem.Setup(snapshot, OnSnapshotSelected);
                galleryItems.Add(galleryItem);
            }
        }

        private GameObject CreateDefaultGalleryItem()
        {
            var itemObj = new GameObject("GalleryItem");

            var image = itemObj.AddComponent<Image>();
            image.color = Color.white;

            var button = itemObj.AddComponent<Button>();

            var rect = itemObj.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(150, 150);

            // Add thumbnail image
            var thumbnailObj = new GameObject("Thumbnail");
            thumbnailObj.transform.SetParent(itemObj.transform);
            var thumbnail = thumbnailObj.AddComponent<Image>();
            var thumbRect = thumbnailObj.GetComponent<RectTransform>();
            thumbRect.anchorMin = Vector2.zero;
            thumbRect.anchorMax = Vector2.one;
            thumbRect.sizeDelta = Vector2.zero;

            return itemObj;
        }

        private void OnSnapshotSelected(GallerySnapshot snapshot)
        {
            selectedSnapshotId = snapshot.levelId;
            ShowPreview(snapshot);
        }

        private void ShowPreview(GallerySnapshot snapshot)
        {
            if (previewPanel != null) previewPanel.SetActive(true);

            if (previewImage != null && snapshot.texture != null)
            {
                var sprite = Sprite.Create(
                    snapshot.texture,
                    new Rect(0, 0, snapshot.texture.width, snapshot.texture.height),
                    new Vector2(0.5f, 0.5f)
                );
                previewImage.sprite = sprite;
            }

            if (levelNameText != null) levelNameText.text = snapshot.levelName;
            if (scoreText != null) scoreText.text = $"Score: {snapshot.score}";
            if (dateText != null) dateText.text = snapshot.timestamp.ToString("MMM dd, yyyy");
        }

        private void HidePreview()
        {
            if (previewPanel != null) previewPanel.SetActive(false);
            selectedSnapshotId = null;
        }

        private void ShowEmptyState()
        {
            if (emptyStatePanel != null) emptyStatePanel.SetActive(true);
            if (emptyStateText != null)
            {
                emptyStateText.text = "No snapshots yet!\nComplete levels to capture your artwork.";
            }
        }

        private void HideEmptyState()
        {
            if (emptyStatePanel != null) emptyStatePanel.SetActive(false);
        }

        private void RefreshGallery()
        {
            PopulateGallery();
        }

        private void OnSnapshotTaken(string levelId, Texture2D texture)
        {
            RefreshGallery();
        }

        private void OnBackButton()
        {
            GameManager.Instance?.OpenMainMenu();
        }

        private void OnShareButton()
        {
            if (string.IsNullOrEmpty(selectedSnapshotId)) return;

            // Platform-specific share functionality
            #if UNITY_IOS
            // iOS native share sheet would be implemented here
            Debug.Log($"[GalleryUI] Share requested for {selectedSnapshotId}");
            #endif
        }

        private void OnDeleteButton()
        {
            if (string.IsNullOrEmpty(selectedSnapshotId)) return;

            galleryManager?.DeleteSnapshot(selectedSnapshotId);
            HidePreview();
            RefreshGallery();
        }
    }

    /// <summary>
    /// Individual gallery item showing a snapshot thumbnail
    /// </summary>
    public class GalleryItemUI : MonoBehaviour
    {
        [SerializeField] private Image thumbnailImage;
        [SerializeField] private TextMeshProUGUI levelNameText;
        [SerializeField] private Button button;

        private GallerySnapshot snapshotData;
        private System.Action<GallerySnapshot> onSelected;

        public void Setup(GallerySnapshot snapshot, System.Action<GallerySnapshot> callback)
        {
            snapshotData = snapshot;
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
            if (snapshotData.texture == null) return;

            if (thumbnailImage != null)
            {
                var sprite = Sprite.Create(
                    snapshotData.texture,
                    new Rect(0, 0, snapshotData.texture.width, snapshotData.texture.height),
                    new Vector2(0.5f, 0.5f)
                );
                thumbnailImage.sprite = sprite;
            }

            if (levelNameText != null)
            {
                levelNameText.text = snapshotData.levelName;
            }
        }

        private void OnClick()
        {
            onSelected?.Invoke(snapshotData);
        }
    }
}
