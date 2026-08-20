/**
 * Vercel serverless entry for Angular SSR (`outputMode: "server"`).
 * Imports the built Node request handler from the server bundle.
 */
export default async function handler(req, res) {
  const { reqHandler } = await import('../dist/frontend/server/server.mjs');
  return reqHandler(req, res);
}
