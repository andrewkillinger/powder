using System;
using UnityEngine;
using FractalUpkeep.Canvas;
using FractalUpkeep.Sim;
using FractalUpkeep.Levels;
using FractalUpkeep.Units;

namespace FractalUpkeep.Core
{
    /// <summary>
    /// Central game manager - singleton pattern for core game state
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("References")]
        [SerializeField] private CanvasManager canvasManager;
        [SerializeField] private SimulationManager simulationManager;
        [SerializeField] private LevelManager levelManager;
        [SerializeField] private UnitManager unitManager;
        [SerializeField] private CurrencyManager currencyManager;
        [SerializeField] private ProgressionManager progressionManager;
        [SerializeField] private SaveManager saveManager;

        [Header("State")]
        [SerializeField] private GameState currentState = GameState.MainMenu;

        public CanvasManager Canvas => canvasManager;
        public SimulationManager Simulation => simulationManager;
        public LevelManager Levels => levelManager;
        public UnitManager Units => unitManager;
        public CurrencyManager Currency => currencyManager;
        public ProgressionManager Progression => progressionManager;
        public SaveManager Save => saveManager;
        public GameState CurrentState => currentState;

        public bool IsPaused { get; private set; }
        public bool IsPlaying => currentState == GameState.Playing;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
        }

        private void Start()
        {
            InitializeGame();
        }

        private void OnEnable()
        {
            GameEvents.OnPauseRequested += HandlePause;
            GameEvents.OnResumeRequested += HandleResume;
            GameEvents.OnLevelCompleted += HandleLevelCompleted;
        }

        private void OnDisable()
        {
            GameEvents.OnPauseRequested -= HandlePause;
            GameEvents.OnResumeRequested -= HandleResume;
            GameEvents.OnLevelCompleted -= HandleLevelCompleted;
        }

        private void InitializeGame()
        {
            saveManager?.LoadGame();
            ChangeState(GameState.MainMenu);
        }

        public void ChangeState(GameState newState)
        {
            var previousState = currentState;
            currentState = newState;

            OnStateExit(previousState);
            OnStateEnter(newState);
        }

        private void OnStateEnter(GameState state)
        {
            switch (state)
            {
                case GameState.MainMenu:
                    Time.timeScale = 1f;
                    break;
                case GameState.LevelSelect:
                    break;
                case GameState.Playing:
                    Time.timeScale = 1f;
                    IsPaused = false;
                    break;
                case GameState.Paused:
                    Time.timeScale = 0f;
                    IsPaused = true;
                    break;
                case GameState.LevelComplete:
                    break;
                case GameState.Progression:
                    break;
                case GameState.Gallery:
                    break;
            }
        }

        private void OnStateExit(GameState state)
        {
            switch (state)
            {
                case GameState.Paused:
                    Time.timeScale = 1f;
                    IsPaused = false;
                    break;
            }
        }

        public void StartLevel(Levels.LevelData level)
        {
            if (level == null) return;

            levelManager?.StartLevel(level);
            canvasManager?.ClearCanvas();
            unitManager?.ClearUnits();
            simulationManager?.ResetSimulation();

            ChangeState(GameState.Playing);
            GameEvents.InvokeLevelStarted(level);
        }

        public void RetryLevel()
        {
            if (levelManager?.CurrentLevel != null)
            {
                StartLevel(levelManager.CurrentLevel);
            }
        }

        public void ExitLevel()
        {
            levelManager?.EndLevel(false);
            ChangeState(GameState.LevelSelect);
        }

        private void HandlePause()
        {
            if (currentState == GameState.Playing)
            {
                ChangeState(GameState.Paused);
            }
        }

        private void HandleResume()
        {
            if (currentState == GameState.Paused)
            {
                ChangeState(GameState.Playing);
            }
        }

        private void HandleLevelCompleted(Core.LevelData level)
        {
            ChangeState(GameState.LevelComplete);
            saveManager?.SaveGame();
        }

        public void SaveGame()
        {
            saveManager?.SaveGame();
        }

        public void OpenMainMenu()
        {
            ChangeState(GameState.MainMenu);
        }

        public void OpenLevelSelect()
        {
            ChangeState(GameState.LevelSelect);
        }

        public void OpenProgression()
        {
            ChangeState(GameState.Progression);
        }

        public void OpenGallery()
        {
            ChangeState(GameState.Gallery);
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus && currentState == GameState.Playing)
            {
                HandlePause();
                SaveGame();
            }
        }

        private void OnApplicationQuit()
        {
            SaveGame();
        }
    }

    public enum GameState
    {
        MainMenu,
        LevelSelect,
        Playing,
        Paused,
        LevelComplete,
        Progression,
        Gallery
    }
}
