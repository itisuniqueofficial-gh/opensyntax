/**
 * Unique ID generation for sessions, messages, tool calls, and edits.
 *
 * Format: <prefix>_<timestamp_base36><random_base36>
 * Example: ses_lk3m2n8xq4r
 *
 * Sortable by creation time, URL-safe, no external dependencies.
 */

function makeId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}${rand}`;
}

export const newSessionId  = () => makeId('ses');
export const newMessageId  = () => makeId('msg');
export const newToolCallId = () => makeId('tool');
export const newEditId     = () => makeId('edit');
export const newChatId     = () => makeId('chat');

/** Parse the timestamp from an ID (returns Date or undefined). */
export function idTimestamp(id: string): Date | undefined {
  const parts = id.split('_');
  if (parts.length < 2) return undefined;
  const ts = parseInt(parts[1].slice(0, 8), 36);
  return isNaN(ts) ? undefined : new Date(ts);
}

/** Format an ID timestamp as a relative time string. */
export function relativeTime(id: string): string {
  const ts = idTimestamp(id);
  if (!ts) return 'unknown';
  const diff = Date.now() - ts.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
