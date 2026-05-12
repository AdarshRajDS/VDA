import type { ContentRequest, ContentResponse } from '../messages';
import { VDA_COMPOSER_NOT_FOUND } from '../messages';

const BRIDGE_FLAG = '__vda63ChatgptBridgeInjected';
const win = window as unknown as Record<string, boolean>;

if (!win[BRIDGE_FLAG]) {
  win[BRIDGE_FLAG] = true;

  function querySelectorDeep(root: Document | ShadowRoot, selector: string): HTMLElement | null {
    const inner = (r: Document | ShadowRoot): HTMLElement | null => {
      const hit = r.querySelector(selector);
      if (hit) return hit as HTMLElement;
      for (const el of r.querySelectorAll('*')) {
        if (el.shadowRoot) {
          const nested = inner(el.shadowRoot);
          if (nested) return nested;
        }
      }
      return null;
    };
    return inner(root);
  }

  function querySelectorAllDeep(root: Document | ShadowRoot, selector: string): HTMLElement[] {
    const results: HTMLElement[] = [];
    const inner = (r: Document | ShadowRoot) => {
      r.querySelectorAll(selector).forEach((e) => results.push(e as HTMLElement));
      r.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) inner(el.shadowRoot);
      });
    };
    inner(root);
    return results;
  }

  function isVisible(el: HTMLElement): boolean {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const st = window.getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') return false;
    if (r.bottom < 0 || r.top > window.innerHeight + 400) return false;
    return true;
  }

  /** Prefer large inputs toward the bottom of the viewport (ChatGPT composer). */
  function scoreComposer(el: HTMLElement): number {
    if (!isVisible(el)) return -1;
    const r = el.getBoundingClientRect();
    if (r.width < 72 || r.height < 14) return -1;
    const area = r.width * r.height;
    const centerY = (r.top + r.bottom) / 2;
    const vh = window.innerHeight || 1;
    const bottomBias = (centerY / vh) * 8000;
    let bonus = 0;
    const ph = (el.getAttribute('placeholder') || '').toLowerCase();
    if (ph.includes('message') || ph.includes('ask') || ph.includes('anything')) bonus += 50000;
    if (el.id === 'prompt-textarea') bonus += 100000;
    if (el.getAttribute('role') === 'textbox') bonus += 20000;
    return area + bottomBias + bonus;
  }

  function findComposer(): HTMLElement | null {
    const byId = querySelectorDeep(document, '#prompt-textarea');
    if (byId && isVisible(byId)) return byId;

    const rootTa = querySelectorDeep(document, 'textarea[data-id="root"]');
    if (rootTa && isVisible(rootTa)) return rootTa;

    const roleBox = querySelectorDeep(document, 'div[contenteditable="true"][role="textbox"]');
    if (roleBox && isVisible(roleBox)) return roleBox;

    const textareas = querySelectorAllDeep(document, 'textarea');
    let best: HTMLElement | null = null;
    let bestScore = -1;
    for (const t of textareas) {
      const s = scoreComposer(t);
      if (s > bestScore) {
        bestScore = s;
        best = t;
      }
    }
    if (best && bestScore > 500) return best;

    const edits = querySelectorAllDeep(document, 'div[contenteditable="true"]');
    for (const el of edits) {
      const s = scoreComposer(el);
      if (s > bestScore) {
        bestScore = s;
        best = el;
      }
    }
    if (best && bestScore > 800) return best;

    const pm = querySelectorDeep(document, 'div.ProseMirror[contenteditable="true"]');
    if (pm && isVisible(pm)) return pm;

    return null;
  }

  function setComposerText(el: HTMLElement, text: string) {
    if (el instanceof HTMLTextAreaElement) {
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
      return;
    }
    el.focus();
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const inserted = document.execCommand('insertText', false, text);
      if (inserted) {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
        return;
      }
    }
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.deleteContents();
    el.appendChild(document.createTextNode(text));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
  }

  function isButtonDisabled(b: HTMLButtonElement): boolean {
    return b.disabled || b.getAttribute('aria-disabled') === 'true';
  }

  function findPrimarySendButton(): HTMLButtonElement | null {
    const byId = querySelectorDeep(document, 'button[data-testid="send-button"]');
    const btn = byId as HTMLButtonElement | null;
    if (btn && !isButtonDisabled(btn)) return btn;
    return null;
  }

  function findSendButtonLoose(): HTMLButtonElement | null {
    const primary = querySelectorDeep(document, 'button[data-testid="send-button"]') as HTMLButtonElement | null;
    if (primary && !isButtonDisabled(primary)) return primary;

    for (const b of querySelectorAllDeep(document, 'form button[type="submit"]')) {
      const btn = b as HTMLButtonElement;
      if (!isButtonDisabled(btn)) return btn;
    }

    for (const b of querySelectorAllDeep(document, 'button[aria-label]')) {
      const btn = b as HTMLButtonElement;
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if ((label.includes('send') || label.includes('senden') || label.includes('envoyer')) && !isButtonDisabled(btn)) {
        return btn;
      }
    }

    for (const b of querySelectorAllDeep(document, 'button')) {
      const btn = b as HTMLButtonElement;
      const t = (btn.textContent || '').trim().toLowerCase();
      if (t === 'send' && !isButtonDisabled(btn)) return btn;
    }

    return null;
  }

  async function waitForSendClickable(maxMs = 3200): Promise<HTMLButtonElement | null> {
    const step = 120;
    for (let waited = 0; waited <= maxMs; waited += step) {
      const b = findPrimarySendButton() ?? findSendButtonLoose();
      if (b) return b;
      await new Promise((r) => setTimeout(r, step));
    }
    return findPrimarySendButton() ?? findSendButtonLoose();
  }

  function trySubmitViaKeyboard(composer: HTMLElement): void {
    composer.focus();
    const opts: KeyboardEventInit = { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true };
    composer.dispatchEvent(new KeyboardEvent('keydown', opts));
    composer.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  async function submitPrompt(composer: HTMLElement): Promise<boolean> {
    let btn = await waitForSendClickable();
    if (btn) {
      btn.click();
      return true;
    }
    trySubmitViaKeyboard(composer);
    await new Promise((r) => setTimeout(r, 320));
    btn = findPrimarySendButton() ?? findSendButtonLoose();
    if (btn) {
      btn.click();
      return true;
    }
    trySubmitViaKeyboard(composer);
    await new Promise((r) => setTimeout(r, 220));
    btn = findPrimarySendButton() ?? findSendButtonLoose();
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  function getAssistantMessages(): string[] {
    const texts: string[] = [];
    const nodes = querySelectorAllDeep(document, '[data-message-author-role="assistant"]');
    for (const node of nodes) {
      const md = node.querySelector('.markdown, [class*="markdown"]') || node;
      const t = (md.textContent || '').trim();
      if (t.length > 15) texts.push(t);
    }
    return texts;
  }

  chrome.runtime.onMessage.addListener(
    (msg: ContentRequest, _sender, sendResponse: (r: ContentResponse) => void) => {
      void (async () => {
        if (msg.type === 'VDA_INJECT') {
          const el = findComposer();
          if (!el) {
            sendResponse({ ok: false, error: VDA_COMPOSER_NOT_FOUND });
            return;
          }
          setComposerText(el, msg.text);
          if (msg.autoSend) {
            await new Promise((r) => setTimeout(r, 100));
            const sent = await submitPrompt(el);
            if (!sent) {
              await copyToClipboard(msg.text);
              sendResponse({
                ok: true,
                usedClipboardFallback: true,
                detail:
                  'Could not activate Send automatically; prompt copied to clipboard. Paste if needed and press Send (or Enter).',
              });
              return;
            }
          }
          sendResponse({ ok: true });
          return;
        }

        if (msg.type === 'VDA_GET_LAST_ASSISTANT') {
          const all = getAssistantMessages();
          const last = all[all.length - 1];
          if (!last) {
            sendResponse({ ok: false, error: 'No assistant message found on this page.' });
            return;
          }
          sendResponse({ ok: true, text: last });
          return;
        }

        sendResponse({ ok: false, error: 'Unknown content message' });
      })();
      return true;
    },
  );
}
