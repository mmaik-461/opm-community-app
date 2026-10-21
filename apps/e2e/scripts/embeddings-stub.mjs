// Minimal OpenAI-compatible embeddings endpoint so registration can embed profiles without
// reaching OpenAI. Vectors match the pgvector column size (1536).
import { createServer } from 'node:http';

const port = Number(process.env.EMBEDDINGS_STUB_PORT);
const DIMENSIONS = 1536;

createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST' || !req.url?.endsWith('/embeddings')) {
    res.end('{}'); // health probe
    return;
  }
  req.resume();
  req.on('end', () => {
    const embedding = Array.from({ length: DIMENSIONS }, (_, i) => (i === 0 ? 1 : 0));
    res.end(
      JSON.stringify({ object: 'list', data: [{ object: 'embedding', index: 0, embedding }] }),
    );
  });
}).listen(port);
