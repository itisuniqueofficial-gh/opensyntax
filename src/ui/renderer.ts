/**
 * Renderer — thin compatibility shim over the new layout system.
 * All new code should import from layout.ts directly.
 */

import chalk from 'chalk';
import {renderMarkdown} from './renderers/markdown.js';
import {printHeader, printPanel, printStatus, printAssistantChunk as _chunk} from './layout.js';

export {renderMarkdown};

export function header(workspace: string, model: string, permission: string, sessionId?: string, sessionTitle?: string): void {
  printHeader({workspace, model, permission, sessionId: sessionId ?? '', sessionTitle});
}

export function assistantChunk(text: string): void {
  _chunk(text);
}

export function panel(title: string, body: string): void {
  printPanel(title, body);
}

export function status(message: string): void {
  printStatus(message);
}
