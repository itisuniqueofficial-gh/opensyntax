import {describe, expect, it} from 'vitest';
import {initialPlan, renderPlan} from '../agent/planner.js';

describe('planner', () => {
  it('creates a practical execution plan', () => {
    const plan = initialPlan('fix tests');
    expect(plan.map((item) => item.id)).toEqual(['inspect', 'execute', 'verify', 'summarize']);
    expect(renderPlan(plan)).toContain('Inspect workspace');
  });
});
