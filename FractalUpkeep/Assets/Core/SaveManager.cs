using System;
using System.IO;
using UnityEngine;

namespace FractalUpkeep.Core
{
    /// <summary>
    /// Handles save/load operations with versioned format
    /// </summary>
    public class SaveManager : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private bool autoSaveEnabled = true;
        [SerializeField] private float autoSaveInterval = 60f;

        private string SavePath => Path.Combine(Application.persistentDataPath, GameConstants.SAVE_FILE_NAME);
        private float autoSaveTimer = 0f;

        private CurrencyManager currencyManager;
        private ProgressionManager progressionManager;

        private void Start()
        {
            currencyManager = GameManager.Instance?.Currency;
            progressionManager = GameManager.Instance?.Progression;
        }

        private void OnEnable()
        {
            GameEvents.OnSaveRequested += SaveGame;
        }

        private void OnDisable()
        {
            GameEvents.OnSaveRequested -= SaveGame;
        }

        private void Update()
        {
            if (autoSaveEnabled && GameManager.Instance != null && GameManager.Instance.IsPlaying)
            {
                autoSaveTimer += Time.deltaTime;
                if (autoSaveTimer >= autoSaveInterval)
                {
                    SaveGame();
                    autoSaveTimer = 0f;
                }
            }
        }

        public void SaveGame()
        {
            try
            {
                var saveData = new SaveData
                {
                    version = GameConstants.SAVE_VERSION,
                    timestamp = DateTime.UtcNow.ToString("o"),
                    currency = currencyManager?.GetSaveData(),
                    progression = progressionManager?.GetSaveData()
                };

                string json = JsonUtility.ToJson(saveData, true);
                File.WriteAllText(SavePath, json);

                Debug.Log($"[SaveManager] Game saved to {SavePath}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveManager] Failed to save game: {e.Message}");
            }
        }

        public void LoadGame()
        {
            try
            {
                if (!File.Exists(SavePath))
                {
                    Debug.Log("[SaveManager] No save file found, starting fresh");
                    return;
                }

                string json = File.ReadAllText(SavePath);
                var saveData = JsonUtility.FromJson<SaveData>(json);

                if (saveData == null)
                {
                    Debug.LogWarning("[SaveManager] Failed to parse save data");
                    return;
                }

                // Version migration if needed
                if (saveData.version < GameConstants.SAVE_VERSION)
                {
                    MigrateSaveData(saveData);
                }

                currencyManager?.LoadSaveData(saveData.currency);
                progressionManager?.LoadSaveData(saveData.progression);

                GameEvents.InvokeLoadCompleted();
                Debug.Log($"[SaveManager] Game loaded from {SavePath}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveManager] Failed to load game: {e.Message}");
            }
        }

        private void MigrateSaveData(SaveData data)
        {
            // Add migration logic here for version upgrades
            Debug.Log($"[SaveManager] Migrating save from v{data.version} to v{GameConstants.SAVE_VERSION}");
            data.version = GameConstants.SAVE_VERSION;
        }

        public bool HasSaveData()
        {
            return File.Exists(SavePath);
        }

        public void DeleteSaveData()
        {
            try
            {
                if (File.Exists(SavePath))
                {
                    File.Delete(SavePath);
                    Debug.Log("[SaveManager] Save data deleted");
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveManager] Failed to delete save: {e.Message}");
            }
        }

        public DateTime? GetLastSaveTime()
        {
            try
            {
                if (!File.Exists(SavePath)) return null;

                string json = File.ReadAllText(SavePath);
                var saveData = JsonUtility.FromJson<SaveData>(json);

                if (DateTime.TryParse(saveData.timestamp, out DateTime result))
                {
                    return result;
                }
            }
            catch { }

            return null;
        }
    }

    [Serializable]
    public class SaveData
    {
        public int version;
        public string timestamp;
        public CurrencyData currency;
        public ProgressionData progression;
    }
}
