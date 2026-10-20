export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export function toSimilarityScore(distance: number, precision: number): number {
  return Math.round((1 - Number(distance)) * precision) / precision;
}
