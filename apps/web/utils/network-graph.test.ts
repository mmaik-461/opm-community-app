import { describe, expect, it } from 'vitest';
import { createNodes, findLinks, nodeCountFor, stepNodes } from './network-graph';

describe('nodeCountFor', () => {
  it('uses fewer nodes on small canvases and caps large ones', () => {
    expect(nodeCountFor(100, 100)).toBe(12);
    expect(nodeCountFor(360, 400)).toBeLessThan(nodeCountFor(1440, 800));
    expect(nodeCountFor(4000, 4000)).toBe(46);
  });
});

describe('createNodes', () => {
  it('creates the requested number of nodes inside the unit square', () => {
    const nodes = createNodes(20);
    expect(nodes).toHaveLength(20);
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(1);
    }
  });
});

describe('stepNodes', () => {
  it('moves nodes and bounces them off the edges', () => {
    const nodes = [
      { x: 0.5, y: 0.5, vx: 0.1, vy: 0 },
      { x: 0.99, y: 0.5, vx: 0.05, vy: 0 },
    ];
    stepNodes(nodes);
    expect(nodes[0].x).toBeCloseTo(0.6);
    expect(nodes[1].x).toBe(1);
    expect(nodes[1].vx).toBeLessThan(0);
  });
});

describe('findLinks', () => {
  it('links only nearby nodes, stronger when closer', () => {
    const nodes = [
      { x: 0.1, y: 0.1, vx: 0, vy: 0 },
      { x: 0.12, y: 0.1, vx: 0, vy: 0 },
      { x: 0.9, y: 0.9, vx: 0, vy: 0 },
    ];
    const links = findLinks(nodes, 1);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ from: 0, to: 1 });
    expect(links[0].strength).toBeGreaterThan(0.8);
  });
});
