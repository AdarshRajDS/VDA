export type ContentRequest =
  | { type: 'VDA_INJECT'; text: string; autoSend: boolean }
  | { type: 'VDA_GET_LAST_ASSISTANT' };

export type ContentResponse =
  | { ok: true; usedClipboardFallback?: boolean; detail?: string }
  | { ok: true; text: string }
  | { ok: false; error: string };

export type BackgroundRequest =
  | { type: 'VDA_SEND_TO_CHATGPT'; text: string; autoSend: boolean }
  | { type: 'VDA_IMPORT_FROM_CHATGPT' };

export type BackgroundResponse = ContentResponse;

/** Returned from a content frame when the ChatGPT composer is not in that document. */
export const VDA_COMPOSER_NOT_FOUND = 'COMPOSER_NOT_FOUND';

/** Background: no frame had a composer (side panel may copy the prompt). */
export const VDA_COMPOSER_NOT_FOUND_ALL_FRAMES = 'COMPOSER_NOT_FOUND_ALL_FRAMES';
