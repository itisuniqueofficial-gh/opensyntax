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

export function shouldReplaceTitle(current: string): boolean {
  return /^(new chat|hi|hello|hey|thanks|ok|okay)$/i.test(current.trim());
}

export function generateTaskTitle(message: string): string {
  const text = message.trim().replace(/\s+/g, ' ');
  if (!text) return 'New Chat';
  const cleaned = text.replace(/^(please|can you|could you|would you)\s+/i, '').replace(/^\/\w+\s*/, '').trim() || text;
  return cleaned.split(' ').slice(0, 6).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').slice(0, 60);
}

/** Derive a short display title for the status bar. */
export function shortTitle(title: string, maxLen = 30): string {
  return title.length > maxLen ? `${title.slice(0, maxLen - 1)}…` : title;
}
