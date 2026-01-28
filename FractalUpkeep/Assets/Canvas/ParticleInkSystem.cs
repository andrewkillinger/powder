using System.Collections.Generic;
using UnityEngine;
using FractalUpkeep.Core;

namespace FractalUpkeep.Canvas
{
    /// <summary>
    /// GPU-friendly particle ink system for depositing pigment onto canvas
    /// </summary>
    public class ParticleInkSystem : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private int maxParticles = 5000;
        [SerializeField] private float particleLifetime = 1f;
        [SerializeField] private float depositRate = 0.5f;
        [SerializeField] private float spreadRadius = 5f;
        [SerializeField] private AnimationCurve depositCurve = AnimationCurve.EaseInOut(0, 1, 1, 0);

        [Header("References")]
        [SerializeField] private CanvasManager canvasManager;
        [SerializeField] private ComputeShader particleCompute;

        private struct InkParticle
        {
            public Vector2 position;
            public Vector2 velocity;
            public Color color;
            public float life;
            public float size;
            public bool active;
        }

        private List<InkParticle> particles = new List<InkParticle>();
        private Queue<int> freeIndices = new Queue<int>();

        // For GPU path (if compute shader available)
        private ComputeBuffer particleBuffer;
        private bool useGPU = false;

        private void Awake()
        {
            InitializeParticles();
            CheckGPUSupport();
        }

        private void OnDestroy()
        {
            CleanupGPU();
        }

        private void InitializeParticles()
        {
            particles = new List<InkParticle>(maxParticles);
            for (int i = 0; i < maxParticles; i++)
            {
                particles.Add(new InkParticle { active = false });
                freeIndices.Enqueue(i);
            }
        }

        private void CheckGPUSupport()
        {
            useGPU = SystemInfo.supportsComputeShaders && particleCompute != null;

            if (useGPU)
            {
                InitializeGPU();
            }
        }

        private void InitializeGPU()
        {
            particleBuffer = new ComputeBuffer(maxParticles, sizeof(float) * 10 + sizeof(int));
        }

        private void CleanupGPU()
        {
            particleBuffer?.Release();
            particleBuffer = null;
        }

        private void Update()
        {
            if (!GameManager.Instance.IsPlaying) return;

            if (useGPU)
            {
                UpdateGPU();
            }
            else
            {
                UpdateCPU();
            }
        }

        private void UpdateCPU()
        {
            float dt = Time.deltaTime;

            for (int i = 0; i < particles.Count; i++)
            {
                var p = particles[i];
                if (!p.active) continue;

                // Update life
                p.life -= dt;
                if (p.life <= 0)
                {
                    p.active = false;
                    freeIndices.Enqueue(i);
                    particles[i] = p;
                    continue;
                }

                // Update position
                p.position += p.velocity * dt;
                p.velocity *= 0.95f; // Drag

                // Deposit pigment
                float lifeRatio = p.life / particleLifetime;
                float deposit = depositCurve.Evaluate(1 - lifeRatio) * depositRate * dt;

                if (deposit > 0 && canvasManager != null)
                {
                    Color depositColor = p.color;
                    depositColor.a *= deposit;
                    canvasManager.PaintAt(p.position, depositColor, p.size * spreadRadius);
                }

                particles[i] = p;
            }
        }

        private void UpdateGPU()
        {
            // GPU update path - requires compute shader implementation
            // For MVP, fall back to CPU if compute shader not fully implemented
            UpdateCPU();
        }

        public void EmitParticle(Vector2 position, Color color, float size, Vector2 velocity = default)
        {
            if (freeIndices.Count == 0) return;

            int index = freeIndices.Dequeue();

            var particle = new InkParticle
            {
                position = position,
                velocity = velocity + Random.insideUnitCircle * 10f,
                color = color,
                life = particleLifetime,
                size = size,
                active = true
            };

            particles[index] = particle;
        }

        public void EmitBurst(Vector2 position, Color color, float size, int count)
        {
            for (int i = 0; i < count; i++)
            {
                Vector2 offset = Random.insideUnitCircle * size * 0.5f;
                Vector2 velocity = offset.normalized * Random.Range(5f, 20f);
                EmitParticle(position + offset, color, size * Random.Range(0.5f, 1f), velocity);
            }
        }

        public void EmitTrail(Vector2 from, Vector2 to, Color color, float size, int count)
        {
            for (int i = 0; i < count; i++)
            {
                float t = (float)i / count;
                Vector2 pos = Vector2.Lerp(from, to, t);
                Vector2 perpendicular = Vector2.Perpendicular((to - from).normalized) * Random.Range(-1f, 1f) * size * 0.3f;
                EmitParticle(pos + perpendicular, color, size * Random.Range(0.3f, 0.8f));
            }
        }

        public int ActiveParticleCount
        {
            get
            {
                int count = 0;
                foreach (var p in particles)
                {
                    if (p.active) count++;
                }
                return count;
            }
        }

        public void ClearAllParticles()
        {
            for (int i = 0; i < particles.Count; i++)
            {
                var p = particles[i];
                if (p.active)
                {
                    p.active = false;
                    particles[i] = p;
                    freeIndices.Enqueue(i);
                }
            }
        }
    }
}
