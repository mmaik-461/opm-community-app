'use client';

import { useEffect, useRef } from 'react';
import { HERO_VISUAL_LABEL, NETWORK_GRAPH } from '@/constants/landing';
import { createNodes, findLinks, nodeCountFor, stepNodes } from '@/utils/network-graph';

const NODE_COLOR = '99, 102, 241';
const LINK_COLOR = '129, 140, 248';

/** Canvas of drifting alumni nodes that link up when close; static when the visitor prefers reduced motion. */
export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let nodes = createNodes(nodeCountFor(canvas.clientWidth, canvas.clientHeight));
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = createNodes(nodeCountFor(width, height));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const { from, to, strength } of findLinks(nodes, width / height)) {
        ctx.strokeStyle = `rgba(${LINK_COLOR}, ${strength * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(nodes[from].x * width, nodes[from].y * height);
        ctx.lineTo(nodes[to].x * width, nodes[to].y * height);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(${NODE_COLOR}, 0.8)`;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x * width, n.y * height, NETWORK_GRAPH.nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      stepNodes(nodes);
      draw();
      frame = requestAnimationFrame(tick);
    };

    resize();
    draw();
    if (!reducedMotion) frame = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={HERO_VISUAL_LABEL}
      className="absolute inset-0 size-full"
    />
  );
}
