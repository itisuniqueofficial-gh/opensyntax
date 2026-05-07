/**
 * Auto-generate session titles from the first user message.
 * Uses a local heuristic — no model call needed.
 */

/** Generate a title from the first user message. */
export function generateTitle(firstMessage: string): string {
  const text = firstMessage.trim().replace(/\s+/g, ' ');
  if (!text) return 'New Chat';

  // Strip leading slash commands
  const cleaned = text.replace(/^\/\w+\s*/, '').trim() || text;

  // Capitalise and truncate
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

/** Derive a short display title for the status bar. */
export function shortTitle(title: string, maxLen = 30): string {
  return title.length > maxLen ? `${title.slice(0, maxLen - 1)}…` : title;
}
