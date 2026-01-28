using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using FractalUpkeep.Core;

namespace FractalUpkeep.Levels
{
    /// <summary>
    /// Manages gallery snapshots - saving, loading, and organizing level completion images
    /// </summary>
    public class GalleryManager : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private int maxSnapshots = 100;
        [SerializeField] private int thumbnailSize = 256;

        private string GalleryPath => Path.Combine(Application.persistentDataPath, GameConstants.GALLERY_FOLDER);
        private string MetadataPath => Path.Combine(GalleryPath, "metadata.json");

        private Dictionary<string, GallerySnapshot> snapshots = new Dictionary<string, GallerySnapshot>();
        private GalleryMetadata metadata;

        private void Awake()
        {
            EnsureGalleryDirectory();
            LoadMetadata();
        }

        private void EnsureGalleryDirectory()
        {
            if (!Directory.Exists(GalleryPath))
            {
                Directory.CreateDirectory(GalleryPath);
            }
        }

        private void LoadMetadata()
        {
            try
            {
                if (File.Exists(MetadataPath))
                {
                    string json = File.ReadAllText(MetadataPath);
                    metadata = JsonUtility.FromJson<GalleryMetadata>(json);
                }
                else
                {
                    metadata = new GalleryMetadata();
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[GalleryManager] Failed to load metadata: {e.Message}");
                metadata = new GalleryMetadata();
            }
        }

        private void SaveMetadata()
        {
            try
            {
                string json = JsonUtility.ToJson(metadata, true);
                File.WriteAllText(MetadataPath, json);
            }
            catch (Exception e)
            {
                Debug.LogError($"[GalleryManager] Failed to save metadata: {e.Message}");
            }
        }

        public void SaveSnapshot(string levelId, Texture2D texture)
        {
            if (texture == null || string.IsNullOrEmpty(levelId)) return;

            try
            {
                // Get level info
                var levelManager = GameManager.Instance?.Levels;
                var levelData = levelManager?.GetLevelById(levelId);
                string levelName = levelData?.Name ?? levelId;

                // Get score
                var progression = GameManager.Instance?.Progression;
                int score = progression?.GetLevelBestScore(levelId) ?? 0;

                // Create filename
                string filename = $"{levelId}_{DateTime.UtcNow.Ticks}.png";
                string filepath = Path.Combine(GalleryPath, filename);

                // Encode and save PNG
                byte[] pngData = texture.EncodeToPNG();
                File.WriteAllBytes(filepath, pngData);

                // Update metadata
                var entry = new GalleryEntry
                {
                    levelId = levelId,
                    levelName = levelName,
                    filename = filename,
                    score = score,
                    timestamp = DateTime.UtcNow.ToString("o")
                };

                // Remove old entry for same level if exists
                metadata.entries.RemoveAll(e => e.levelId == levelId);
                metadata.entries.Add(entry);

                // Enforce max snapshots
                while (metadata.entries.Count > maxSnapshots)
                {
                    var oldest = metadata.entries[0];
                    DeleteSnapshotFile(oldest.filename);
                    metadata.entries.RemoveAt(0);
                }

                SaveMetadata();

                Debug.Log($"[GalleryManager] Saved snapshot for {levelId}");
                GameEvents.InvokeSnapshotTaken(levelId, texture);
            }
            catch (Exception e)
            {
                Debug.LogError($"[GalleryManager] Failed to save snapshot: {e.Message}");
            }
        }

        public GallerySnapshot GetSnapshot(string levelId)
        {
            // Check cache first
            if (snapshots.TryGetValue(levelId, out GallerySnapshot cached))
            {
                return cached;
            }

            // Find in metadata
            var entry = metadata.entries.Find(e => e.levelId == levelId);
            if (entry == null) return default;

            // Load texture
            var snapshot = LoadSnapshotFromEntry(entry);
            if (snapshot.texture != null)
            {
                snapshots[levelId] = snapshot;
            }

            return snapshot;
        }

        public List<GallerySnapshot> GetAllSnapshots()
        {
            var result = new List<GallerySnapshot>();

            foreach (var entry in metadata.entries)
            {
                var snapshot = GetSnapshot(entry.levelId);
                if (snapshot.texture != null)
                {
                    result.Add(snapshot);
                }
            }

            // Sort by timestamp, newest first
            result.Sort((a, b) => b.timestamp.CompareTo(a.timestamp));

            return result;
        }

        private GallerySnapshot LoadSnapshotFromEntry(GalleryEntry entry)
        {
            var snapshot = new GallerySnapshot
            {
                levelId = entry.levelId,
                levelName = entry.levelName,
                score = entry.score,
                timestamp = DateTime.TryParse(entry.timestamp, out DateTime dt) ? dt : DateTime.MinValue
            };

            try
            {
                string filepath = Path.Combine(GalleryPath, entry.filename);
                if (File.Exists(filepath))
                {
                    byte[] pngData = File.ReadAllBytes(filepath);
                    var texture = new Texture2D(2, 2);
                    texture.LoadImage(pngData);
                    snapshot.texture = texture;
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[GalleryManager] Failed to load snapshot: {e.Message}");
            }

            return snapshot;
        }

        public void DeleteSnapshot(string levelId)
        {
            var entry = metadata.entries.Find(e => e.levelId == levelId);
            if (entry == null) return;

            DeleteSnapshotFile(entry.filename);
            metadata.entries.Remove(entry);
            snapshots.Remove(levelId);
            SaveMetadata();
        }

        private void DeleteSnapshotFile(string filename)
        {
            try
            {
                string filepath = Path.Combine(GalleryPath, filename);
                if (File.Exists(filepath))
                {
                    File.Delete(filepath);
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[GalleryManager] Failed to delete snapshot file: {e.Message}");
            }
        }

        public bool HasSnapshot(string levelId)
        {
            return metadata.entries.Exists(e => e.levelId == levelId);
        }

        public int SnapshotCount => metadata.entries.Count;

        public void ClearAllSnapshots()
        {
            foreach (var entry in metadata.entries)
            {
                DeleteSnapshotFile(entry.filename);
            }

            metadata.entries.Clear();
            snapshots.Clear();
            SaveMetadata();
        }
    }

    [Serializable]
    public struct GallerySnapshot
    {
        public string levelId;
        public string levelName;
        public Texture2D texture;
        public int score;
        public DateTime timestamp;
    }

    [Serializable]
    public class GalleryMetadata
    {
        public List<GalleryEntry> entries = new List<GalleryEntry>();
    }

    [Serializable]
    public class GalleryEntry
    {
        public string levelId;
        public string levelName;
        public string filename;
        public int score;
        public string timestamp;
    }
}
