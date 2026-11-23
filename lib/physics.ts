// Interaction physics shared by the carousels and sheets (apple-design: momentum projection + critically damped springs).
export const DECELERATION_RATE = 0.998;

/** Distance a flick travels before coming to rest (velocity in px/ms). */
export function projectMomentum(velocityPxPerMs: number, rate = DECELERATION_RATE): number {
  return (velocityPxPerMs * rate) / (1 - rate);
}

/** Progressive resistance past a soft boundary. */
export function rubberBand(distance: number, dimension: number, coefficient = 0.55): number {
  const abs = Math.abs(distance);
  const damped = (abs * coefficient * dimension) / (dimension + coefficient * abs);
  return distance < 0 ? -damped : damped;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Critically damped spring integrated per frame. Starts from the current (presentation) value and velocity,
 * so re-targeting mid-flight never jumps. `response` ≈ seconds to settle (Apple's designer-facing parameter).
 */
export class Spring {
  value: number;
  velocity = 0; // px per ms
  target: number;
  private raf = 0;
  private last = 0;
  private readonly omega: number;
  constructor(initial: number, private onUpdate: (v: number) => void, response = 0.35, private onRest?: () => void) {
    this.value = initial;
    this.target = initial;
    this.omega = (2 * Math.PI) / response / 1000; // rad per ms
  }
  set(value: number) {
    this.stop();
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.onUpdate(value);
  }
  to(target: number, velocity = this.velocity) {
    this.target = target;
    this.velocity = velocity;
    if (prefersReducedMotion()) { this.set(target); this.onRest?.(); return; }
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  get animating() { return this.raf !== 0; }
  private tick = (now: number) => {
    let dt = Math.min(64, now - this.last);
    this.last = now;
    const w = this.omega;
    while (dt > 0) { // sub-step for stability
      const h = Math.min(dt, 4);
      const x = this.value - this.target;
      const a = -w * w * x - 2 * w * this.velocity; // damping ratio 1.0
      this.velocity += a * h;
      this.value += this.velocity * h;
      dt -= h;
    }
    if (Math.abs(this.value - this.target) < 0.3 && Math.abs(this.velocity) < 0.01) {
      this.value = this.target; this.velocity = 0; this.raf = 0; this.onUpdate(this.value); this.onRest?.(); return;
    }
    this.onUpdate(this.value);
    this.raf = requestAnimationFrame(this.tick);
  };
}
