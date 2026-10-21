import { NETWORK_GRAPH } from '@/constants/landing';

export interface GraphNode {
  /** Position and velocity in unit space (0..1 on both axes). */
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphLink {
  from: number;
  to: number;
  /** 0..1, stronger the closer the two nodes are. */
  strength: number;
}

/** Nodes scale with the canvas area (capped), so phones animate fewer of them. */
export function nodeCountFor(width: number, height: number): number {
  return Math.max(
    12,
    Math.min(NETWORK_GRAPH.nodeCount, Math.round(width * height * NETWORK_GRAPH.nodesPerPixel)),
  );
}

export function createNodes(count: number, random: () => number = Math.random): GraphNode[] {
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    vx: (random() - 0.5) * 2 * NETWORK_GRAPH.speed,
    vy: (random() - 0.5) * 2 * NETWORK_GRAPH.speed,
  }));
}

/** Advances nodes one frame, bouncing off the edges of the unit square. */
export function stepNodes(nodes: GraphNode[]): void {
  for (const n of nodes) {
    n.x += n.vx;
    n.y += n.vy;
    if (n.x < 0 || n.x > 1) n.vx = -n.vx;
    if (n.y < 0 || n.y > 1) n.vy = -n.vy;
    n.x = Math.min(1, Math.max(0, n.x));
    n.y = Math.min(1, Math.max(0, n.y));
  }
}

/** Pairs of nodes closer than the link distance; distance is measured in pixels via the aspect ratio. */
export function findLinks(nodes: GraphNode[], aspect: number): GraphLink[] {
  const links: GraphLink[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = (nodes[i].x - nodes[j].x) * aspect;
      const dy = nodes[i].y - nodes[j].y;
      const distance = Math.hypot(dx, dy);
      if (distance < NETWORK_GRAPH.linkDistance) {
        links.push({ from: i, to: j, strength: 1 - distance / NETWORK_GRAPH.linkDistance });
      }
    }
  }
  return links;
}
