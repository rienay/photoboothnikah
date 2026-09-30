// Ultra-lightweight micro confetti burst (Zero external dependencies, pure HTML5 canvas)

export function fireWeddingConfetti(): void {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#D4AF37", "#F7E7B4", "#ECC876", "#E0A899", "#FAF7F2", "#C5A059"];
  const particles: {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    color: string;
    rotation: number;
    vRot: number;
    opacity: number;
  }[] = [];

  // Create 60 golden confetti pieces
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 150,
      y: canvas.height * 0.65,
      w: Math.random() * 8 + 6,
      h: Math.random() * 6 + 4,
      vx: (Math.random() - 0.5) * 14,
      vy: -(Math.random() * 12 + 10),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      opacity: 1,
    });
  }

  let animationFrameId: number;
  const startTime = Date.now();

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const elapsed = Date.now() - startTime;
    let aliveCount = 0;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // gravity
      p.vx *= 0.98; // air resistance
      p.rotation += p.vRot;

      if (elapsed > 1200) {
        p.opacity -= 0.025;
      }

      if (p.opacity > 0 && p.y < canvas.height + 50) {
        aliveCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (aliveCount > 0 && elapsed < 3500) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  }

  render();
}
