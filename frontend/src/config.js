/**
 * Runtime config, fetched from /config.json.
 *
 * Populated at deploy time by CDK with the real API Gateway URLs. Locally,
 * the committed placeholder (empty strings) means "same-origin relative" —
 * requests fall through to the CRA dev server's proxy to localhost:8000.
 */

let config = { apiBase: '', wsBase: '' };

export async function loadConfig() {
  try {
    const res = await fetch('/config.json');
    config = await res.json();
  } catch {
    // Keep the same-origin fallback.
  }
}

export function getConfig() {
  return config;
}
