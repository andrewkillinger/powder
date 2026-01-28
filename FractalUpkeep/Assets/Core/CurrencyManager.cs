using System;
using UnityEngine;

namespace FractalUpkeep.Core
{
    /// <summary>
    /// Manages game currencies: Pigment (soft) and Spores (hard)
    /// </summary>
    public class CurrencyManager : MonoBehaviour
    {
        [Header("Current Values")]
        [SerializeField] private float pigment = 0f;
        [SerializeField] private int spores = 0;

        [Header("Settings")]
        [SerializeField] private float pigmentPerBeautySecond = GameConstants.PIGMENT_PER_BEAUTY_SECOND;
        [SerializeField] private float beautyAccumulationInterval = 1f;

        public float Pigment => pigment;
        public int Spores => spores;

        private float beautyAccumulator = 0f;
        private float lastBeautyValue = 0f;

        private void OnEnable()
        {
            GameEvents.OnBeautyChanged += OnBeautyChanged;
            GameEvents.OnLevelCompleted += OnLevelCompleted;
        }

        private void OnDisable()
        {
            GameEvents.OnBeautyChanged -= OnBeautyChanged;
            GameEvents.OnLevelCompleted -= OnLevelCompleted;
        }

        private void Update()
        {
            if (GameManager.Instance != null && GameManager.Instance.IsPlaying)
            {
                AccumulatePigmentFromBeauty();
            }
        }

        private void AccumulatePigmentFromBeauty()
        {
            beautyAccumulator += Time.deltaTime;

            if (beautyAccumulator >= beautyAccumulationInterval)
            {
                float pigmentEarned = lastBeautyValue * pigmentPerBeautySecond * beautyAccumulator;
                if (pigmentEarned > 0)
                {
                    AddPigment(pigmentEarned);
                }
                beautyAccumulator = 0f;
            }
        }

        private void OnBeautyChanged(float beauty)
        {
            lastBeautyValue = beauty;
        }

        private void OnLevelCompleted(LevelData level)
        {
            if (level is Levels.LevelData levelData)
            {
                int sporesEarned = levelData.SporeReward;
                AddSpores(sporesEarned);
                GameEvents.InvokeSporesEarned(sporesEarned);
            }
        }

        public void AddPigment(float amount)
        {
            if (amount <= 0) return;

            pigment += amount;
            GameEvents.InvokePigmentChanged(pigment);
            GameEvents.InvokePigmentEarned(amount);
        }

        public void AddSpores(int amount)
        {
            if (amount <= 0) return;

            spores += amount;
            GameEvents.InvokeSporesChanged(spores);
        }

        public bool SpendPigment(float amount)
        {
            if (amount <= 0 || pigment < amount) return false;

            pigment -= amount;
            GameEvents.InvokePigmentChanged(pigment);
            return true;
        }

        public bool SpendSpores(int amount)
        {
            if (amount <= 0 || spores < amount) return false;

            spores -= amount;
            GameEvents.InvokeSporesChanged(spores);
            return true;
        }

        public bool CanAffordPigment(float amount) => pigment >= amount;
        public bool CanAffordSpores(int amount) => spores >= amount;

        public void SetPigment(float amount)
        {
            pigment = Mathf.Max(0, amount);
            GameEvents.InvokePigmentChanged(pigment);
        }

        public void SetSpores(int amount)
        {
            spores = Mathf.Max(0, amount);
            GameEvents.InvokeSporesChanged(spores);
        }

        public CurrencyData GetSaveData()
        {
            return new CurrencyData
            {
                pigment = this.pigment,
                spores = this.spores
            };
        }

        public void LoadSaveData(CurrencyData data)
        {
            if (data == null) return;

            pigment = data.pigment;
            spores = data.spores;
            GameEvents.InvokePigmentChanged(pigment);
            GameEvents.InvokeSporesChanged(spores);
        }
    }

    [Serializable]
    public class CurrencyData
    {
        public float pigment;
        public int spores;
    }
}
