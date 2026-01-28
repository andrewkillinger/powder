using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using FractalUpkeep.Core;
using FractalUpkeep.Canvas;
using FractalUpkeep.Sim;
using FractalUpkeep.Levels;

namespace FractalUpkeep.Tests
{
    /// <summary>
    /// Play-mode smoke tests for FractalUpkeep core functionality
    /// </summary>
    public class SmokeTests
    {
        private GameObject testRoot;
        private GameManager gameManager;
        private CanvasManager canvasManager;
        private SimulationManager simulationManager;
        private CurrencyManager currencyManager;
        private SaveManager saveManager;
        private LevelManager levelManager;

        [UnitySetUp]
        public IEnumerator Setup()
        {
            // Create test root
            testRoot = new GameObject("TestRoot");

            // Create managers
            gameManager = testRoot.AddComponent<GameManager>();
            canvasManager = testRoot.AddComponent<CanvasManager>();
            simulationManager = testRoot.AddComponent<SimulationManager>();
            currencyManager = testRoot.AddComponent<CurrencyManager>();
            saveManager = testRoot.AddComponent<SaveManager>();
            levelManager = testRoot.AddComponent<LevelManager>();

            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (testRoot != null)
            {
                Object.Destroy(testRoot);
            }
            yield return null;
        }

        /// <summary>
        /// Test: Saving works - verify save/load cycle preserves data
        /// </summary>
        [UnityTest]
        public IEnumerator SaveSystem_SaveAndLoad_PreservesData()
        {
            // Arrange
            float testPigment = 500f;
            int testSpores = 25;

            currencyManager.SetPigment(testPigment);
            currencyManager.SetSpores(testSpores);

            yield return null;

            // Act - Save
            saveManager.SaveGame();
            yield return null;

            // Modify values
            currencyManager.SetPigment(0);
            currencyManager.SetSpores(0);

            Assert.AreEqual(0f, currencyManager.Pigment, "Pigment should be 0 after reset");
            Assert.AreEqual(0, currencyManager.Spores, "Spores should be 0 after reset");

            // Act - Load
            saveManager.LoadGame();
            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.AreEqual(testPigment, currencyManager.Pigment, 0.01f, "Pigment should be restored after load");
            Assert.AreEqual(testSpores, currencyManager.Spores, "Spores should be restored after load");

            // Cleanup test save
            saveManager.DeleteSaveData();
        }

        /// <summary>
        /// Test: Level loads - verify level can be started and tracked
        /// </summary>
        [UnityTest]
        public IEnumerator Level_Load_StartsCorrectly()
        {
            // Arrange
            var testLevel = ScriptableObject.CreateInstance<LevelData>();

            // Use reflection to set private fields for testing
            var levelIdField = typeof(LevelData).GetField("levelId",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var levelNameField = typeof(LevelData).GetField("levelName",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var fadeIntensityField = typeof(LevelData).GetField("fadeIntensity",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var targetBeautyField = typeof(LevelData).GetField("targetBeauty",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

            levelIdField?.SetValue(testLevel, "test_level");
            levelNameField?.SetValue(testLevel, "Test Level");
            fadeIntensityField?.SetValue(testLevel, 0.01f);
            targetBeautyField?.SetValue(testLevel, 50f);

            bool levelStartedEventFired = false;
            GameEvents.OnLevelStarted += (level) => levelStartedEventFired = true;

            yield return null;

            // Act
            levelManager.StartLevel(testLevel);
            yield return null;

            // Assert
            Assert.IsTrue(levelManager.LevelActive, "Level should be active after starting");
            Assert.AreEqual(testLevel, levelManager.CurrentLevel, "Current level should match started level");
            Assert.IsTrue(levelStartedEventFired, "OnLevelStarted event should have fired");

            // Cleanup
            Object.Destroy(testLevel);
        }

        /// <summary>
        /// Test: Decay decreases beauty - verify fade reduces beauty over time
        /// </summary>
        [UnityTest]
        public IEnumerator Decay_OverTime_DecreasesBeauty()
        {
            // Arrange
            simulationManager.SetFadeRate(0.05f); // High fade rate for quick test
            simulationManager.ResumeDecay();

            // Paint the canvas first to have something to decay
            canvasManager.PaintAt(new Vector2(512, 512), Color.black, 200f);
            canvasManager.PaintAt(new Vector2(300, 300), Color.red, 150f);
            canvasManager.PaintAt(new Vector2(700, 700), Color.blue, 150f);

            yield return new WaitForSeconds(0.5f);

            float initialBeauty = simulationManager.CurrentBeauty;

            // Need some beauty to start with
            if (initialBeauty < 1f)
            {
                // Force some painting
                for (int i = 0; i < 20; i++)
                {
                    canvasManager.PaintAt(
                        new Vector2(Random.Range(100, 900), Random.Range(100, 900)),
                        Color.black,
                        50f
                    );
                }
                yield return new WaitForSeconds(0.5f);
                initialBeauty = simulationManager.CurrentBeauty;
            }

            // Act - Wait for decay
            yield return new WaitForSeconds(2f);

            float finalBeauty = simulationManager.CurrentBeauty;

            // Assert
            Assert.Less(finalBeauty, initialBeauty,
                $"Beauty should decrease over time due to decay. Initial: {initialBeauty}, Final: {finalBeauty}");
        }

        /// <summary>
        /// Test: Brush increases beauty - verify painting adds to beauty score
        /// </summary>
        [UnityTest]
        public IEnumerator Brush_Painting_IncreasesBeauty()
        {
            // Arrange
            simulationManager.PauseDecay(); // Disable decay for this test
            canvasManager.ClearCanvas();
            yield return new WaitForSeconds(0.5f);

            float initialBeauty = simulationManager.CurrentBeauty;

            // Act - Paint on the canvas
            for (int i = 0; i < 50; i++)
            {
                Vector2 position = new Vector2(
                    200 + (i * 12),
                    200 + Mathf.Sin(i * 0.2f) * 100
                );
                canvasManager.PaintAt(position, Color.black, 30f);
            }

            // Wait for beauty calculation
            yield return new WaitForSeconds(1f);

            float finalBeauty = simulationManager.CurrentBeauty;

            // Assert
            Assert.Greater(finalBeauty, initialBeauty,
                $"Beauty should increase after painting. Initial: {initialBeauty}, Final: {finalBeauty}");
        }

        /// <summary>
        /// Test: Currency system works correctly
        /// </summary>
        [UnityTest]
        public IEnumerator Currency_AddAndSpend_WorksCorrectly()
        {
            // Arrange
            currencyManager.SetPigment(0);
            currencyManager.SetSpores(0);
            yield return null;

            // Act - Add currency
            currencyManager.AddPigment(100f);
            currencyManager.AddSpores(10);
            yield return null;

            // Assert - Addition works
            Assert.AreEqual(100f, currencyManager.Pigment, 0.01f, "Pigment should be 100 after adding");
            Assert.AreEqual(10, currencyManager.Spores, "Spores should be 10 after adding");

            // Act - Spend currency
            bool pigmentSpent = currencyManager.SpendPigment(30f);
            bool sporesSpent = currencyManager.SpendSpores(3);

            // Assert - Spending works
            Assert.IsTrue(pigmentSpent, "Should be able to spend pigment");
            Assert.IsTrue(sporesSpent, "Should be able to spend spores");
            Assert.AreEqual(70f, currencyManager.Pigment, 0.01f, "Pigment should be 70 after spending 30");
            Assert.AreEqual(7, currencyManager.Spores, "Spores should be 7 after spending 3");

            // Act - Try to overspend
            bool canOverspendPigment = currencyManager.SpendPigment(1000f);
            bool canOverspendSpores = currencyManager.SpendSpores(100);

            // Assert - Cannot overspend
            Assert.IsFalse(canOverspendPigment, "Should not be able to overspend pigment");
            Assert.IsFalse(canOverspendSpores, "Should not be able to overspend spores");
            Assert.AreEqual(70f, currencyManager.Pigment, 0.01f, "Pigment should remain unchanged after failed spend");
            Assert.AreEqual(7, currencyManager.Spores, "Spores should remain unchanged after failed spend");
        }

        /// <summary>
        /// Test: Canvas operations work correctly
        /// </summary>
        [UnityTest]
        public IEnumerator Canvas_Operations_WorkCorrectly()
        {
            // Arrange
            yield return null;

            // Assert - Canvas exists
            Assert.IsNotNull(canvasManager.CanvasTexture, "Canvas texture should exist");
            Assert.AreEqual(GameConstants.DEFAULT_CANVAS_WIDTH, canvasManager.Width, "Canvas width should match constant");
            Assert.AreEqual(GameConstants.DEFAULT_CANVAS_HEIGHT, canvasManager.Height, "Canvas height should match constant");

            // Act - Paint
            canvasManager.PaintAt(new Vector2(500, 500), Color.red, 50f);
            yield return null;

            // Act - Sample (this tests that painting actually modified the canvas)
            Color sampled = canvasManager.SampleAt(new Vector2(500, 500));

            // Assert - Paint modified canvas (color should not be pure background)
            Color background = new Color(0.95f, 0.93f, 0.9f, 1f);
            Assert.AreNotEqual(background, sampled, "Canvas should be modified after painting");

            // Act - Clear
            canvasManager.ClearCanvas();
            yield return null;

            Color afterClear = canvasManager.SampleAt(new Vector2(500, 500));

            // Assert - Clear works (should be close to background)
            float colorDiff = Mathf.Abs(afterClear.r - background.r) +
                             Mathf.Abs(afterClear.g - background.g) +
                             Mathf.Abs(afterClear.b - background.b);
            Assert.Less(colorDiff, 0.1f, "Canvas should be cleared to background color");
        }

        /// <summary>
        /// Test: Simulation seal mechanic works
        /// </summary>
        [UnityTest]
        public IEnumerator Seal_Placement_WorksCorrectly()
        {
            // Arrange
            yield return null;

            Assert.AreEqual(0, simulationManager.ActiveSealCount, "Should start with no seals");

            // Act - Place seal
            simulationManager.PlaceSeal(new Vector2(500, 500), 100f, 5f);
            yield return null;

            // Assert - Seal placed
            Assert.AreEqual(1, simulationManager.ActiveSealCount, "Should have one seal after placement");
            Assert.IsTrue(simulationManager.IsPositionSealed(new Vector2(500, 500)), "Center should be sealed");
            Assert.IsTrue(simulationManager.IsPositionSealed(new Vector2(550, 500)), "Within radius should be sealed");
            Assert.IsFalse(simulationManager.IsPositionSealed(new Vector2(700, 700)), "Outside radius should not be sealed");

            // Act - Wait for seal to expire
            yield return new WaitForSeconds(6f);

            // Assert - Seal expired
            Assert.AreEqual(0, simulationManager.ActiveSealCount, "Seal should have expired");
            Assert.IsFalse(simulationManager.IsPositionSealed(new Vector2(500, 500)), "Position should no longer be sealed");
        }
    }
}
