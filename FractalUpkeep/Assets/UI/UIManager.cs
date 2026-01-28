using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using FractalUpkeep.Core;

namespace FractalUpkeep.UI
{
    /// <summary>
    /// Central UI manager handling screen transitions and common UI elements
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        [Header("Screen References")]
        [SerializeField] private GameObject mainMenuScreen;
        [SerializeField] private GameObject levelSelectScreen;
        [SerializeField] private GameObject gameplayScreen;
        [SerializeField] private GameObject pauseScreen;
        [SerializeField] private GameObject levelCompleteScreen;
        [SerializeField] private GameObject progressionScreen;
        [SerializeField] private GameObject galleryScreen;

        [Header("Common UI Elements")]
        [SerializeField] private TextMeshProUGUI pigmentText;
        [SerializeField] private TextMeshProUGUI sporesText;
        [SerializeField] private Image fadeOverlay;
        [SerializeField] private float transitionDuration = 0.3f;

        private GameObject currentScreen;
        private Dictionary<GameState, GameObject> stateToScreen;

        private void Awake()
        {
            InitializeScreenMapping();
        }

        private void Start()
        {
            HideAllScreens();
            ShowScreen(mainMenuScreen);
        }

        private void OnEnable()
        {
            GameEvents.OnPigmentChanged += UpdatePigmentDisplay;
            GameEvents.OnSporesChanged += UpdateSporesDisplay;
            GameEvents.OnScreenChanged += OnScreenChanged;
        }

        private void OnDisable()
        {
            GameEvents.OnPigmentChanged -= UpdatePigmentDisplay;
            GameEvents.OnSporesChanged -= UpdateSporesDisplay;
            GameEvents.OnScreenChanged -= OnScreenChanged;
        }

        private void InitializeScreenMapping()
        {
            stateToScreen = new Dictionary<GameState, GameObject>
            {
                { GameState.MainMenu, mainMenuScreen },
                { GameState.LevelSelect, levelSelectScreen },
                { GameState.Playing, gameplayScreen },
                { GameState.Paused, pauseScreen },
                { GameState.LevelComplete, levelCompleteScreen },
                { GameState.Progression, progressionScreen },
                { GameState.Gallery, galleryScreen }
            };
        }

        private void HideAllScreens()
        {
            foreach (var screen in stateToScreen.Values)
            {
                if (screen != null)
                {
                    screen.SetActive(false);
                }
            }
        }

        public void ShowScreen(GameObject screen)
        {
            if (screen == currentScreen) return;

            if (currentScreen != null)
            {
                currentScreen.SetActive(false);
            }

            currentScreen = screen;

            if (currentScreen != null)
            {
                currentScreen.SetActive(true);
            }
        }

        public void ShowScreenForState(GameState state)
        {
            if (stateToScreen.TryGetValue(state, out GameObject screen))
            {
                ShowScreen(screen);
            }
        }

        private void OnScreenChanged(string screenName)
        {
            if (Enum.TryParse<GameState>(screenName, out GameState state))
            {
                ShowScreenForState(state);
            }
        }

        private void UpdatePigmentDisplay(float amount)
        {
            if (pigmentText != null)
            {
                pigmentText.text = FormatCurrency(amount);
            }
        }

        private void UpdateSporesDisplay(int amount)
        {
            if (sporesText != null)
            {
                sporesText.text = amount.ToString();
            }
        }

        private string FormatCurrency(float value)
        {
            if (value >= 1000000) return $"{value / 1000000:F1}M";
            if (value >= 1000) return $"{value / 1000:F1}K";
            return value.ToString("F0");
        }

        public void TransitionTo(GameState state)
        {
            StartCoroutine(TransitionCoroutine(state));
        }

        private System.Collections.IEnumerator TransitionCoroutine(GameState state)
        {
            // Fade out
            if (fadeOverlay != null)
            {
                float elapsed = 0f;
                while (elapsed < transitionDuration / 2)
                {
                    elapsed += Time.unscaledDeltaTime;
                    float alpha = elapsed / (transitionDuration / 2);
                    fadeOverlay.color = new Color(0, 0, 0, alpha);
                    yield return null;
                }
            }

            ShowScreenForState(state);

            // Fade in
            if (fadeOverlay != null)
            {
                float elapsed = 0f;
                while (elapsed < transitionDuration / 2)
                {
                    elapsed += Time.unscaledDeltaTime;
                    float alpha = 1f - (elapsed / (transitionDuration / 2));
                    fadeOverlay.color = new Color(0, 0, 0, alpha);
                    yield return null;
                }
                fadeOverlay.color = new Color(0, 0, 0, 0);
            }
        }

        // Button handlers
        public void OnPlayButton()
        {
            GameManager.Instance?.OpenLevelSelect();
            ShowScreenForState(GameState.LevelSelect);
        }

        public void OnProgressionButton()
        {
            GameManager.Instance?.OpenProgression();
            ShowScreenForState(GameState.Progression);
        }

        public void OnGalleryButton()
        {
            GameManager.Instance?.OpenGallery();
            ShowScreenForState(GameState.Gallery);
        }

        public void OnBackToMainMenu()
        {
            GameManager.Instance?.OpenMainMenu();
            ShowScreenForState(GameState.MainMenu);
        }

        public void OnPauseButton()
        {
            GameEvents.InvokePauseRequested();
            ShowScreenForState(GameState.Paused);
        }

        public void OnResumeButton()
        {
            GameEvents.InvokeResumeRequested();
            ShowScreenForState(GameState.Playing);
        }
    }
}
