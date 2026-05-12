import type { BackgroundRequest, BackgroundResponse, ContentRequest, ContentResponse } from '../messages';
import { VDA_COMPOSER_NOT_FOUND, VDA_COMPOSER_NOT_FOUND_ALL_FRAMES } from '../messages';

/** Match patterns for finding ChatGPT tabs (must stay in sync with manifest host_permissions). */
const CHAT_GPT_URL_PATTERNS = [
  'https://chatgpt.com/*',
  'https://www.chatgpt.com/*',
  'https://*.chatgpt.com/*',
  'https://chat.openai.com/*',
] as const;

function getContentScriptBundleFiles(): string[] {
  const m = chrome.runtime.getManifest() as chrome.runtime.ManifestV3;
  const entry = m.content_scripts?.[0];
  const js = entry?.js;
  return Array.isArray(js) ? js : [];
}

/** Declarative content scripts miss tabs that were already open when the extension loaded; inject on demand. */
async function ensureBridgeInjected(tabId: number): Promise<void> {
  const files = getContentScriptBundleFiles();
  if (files.length === 0) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files,
    });
  } catch {
    /* restricted page or transient load */
  }
  await new Promise((r) => setTimeout(r, 150));
}

async function getFrameIdsForTab(tabId: number): Promise<number[]> {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    if (frames?.length) {
      return [...new Set(frames.map((f) => f.frameId))].sort((a, b) => a - b);
    }
  } catch {
    /* missing permission or transient */
  }
  return [0];
}

async function sendToTab<T extends ContentRequest>(tabId: number, msg: T): Promise<ContentResponse> {
  await ensureBridgeInjected(tabId);
  const frameIds = await getFrameIdsForTab(tabId);

  if (msg.type === 'VDA_GET_LAST_ASSISTANT') {
    let last: ContentResponse = { ok: false, error: 'No assistant message found on this page.' };
    for (const frameId of frameIds) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = (await chrome.tabs.sendMessage(tabId, msg, { frameId })) as ContentResponse;
          last = res;
          if (res.ok && 'text' in res) return res;
        } catch {
          await ensureBridgeInjected(tabId);
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    }
    return last;
  }

  let sawComposerMiss = false;
  let last: ContentResponse = { ok: false, error: 'No response from ChatGPT frames' };

  for (const frameId of frameIds) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = (await chrome.tabs.sendMessage(tabId, msg, { frameId })) as ContentResponse;
        last = res;
        if (res.ok) return res;
        if (!res.ok && res.error === VDA_COMPOSER_NOT_FOUND) {
          sawComposerMiss = true;
          break;
        }
        return res;
      } catch {
        await ensureBridgeInjected(tabId);
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  }

  if (sawComposerMiss && last.ok === false && last.error === VDA_COMPOSER_NOT_FOUND) {
    return { ok: false, error: VDA_COMPOSER_NOT_FOUND_ALL_FRAMES };
  }
  return last;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    /* ignore */
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    /* ignore */
  });
});

async function ensureChatGptTabId(): Promise<number> {
  const existing = await chrome.tabs.query({ url: [...CHAT_GPT_URL_PATTERNS] });
  const first = existing.find((t) => t.id != null);
  if (first?.id != null) {
    await chrome.tabs.update(first.id, { active: true });
    return first.id;
  }
  const tab = await chrome.tabs.create({ url: 'https://chatgpt.com/', active: true });
  const id = tab.id;
  if (id == null) throw new Error('Could not create ChatGPT tab');
  await waitTabComplete(id);
  return id;
}

function waitTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (t) => {
      if (chrome.runtime.lastError || t.status === 'complete') {
        resolve();
        return;
      }
      const onUpdated = (updatedId: number, info: chrome.tabs.TabChangeInfo) => {
        if (updatedId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }, 20000);
    });
  });
}

chrome.runtime.onMessage.addListener(
  (request: BackgroundRequest, _sender, sendResponse: (r: BackgroundResponse) => void) => {
    void (async () => {
      try {
        if (request.type === 'VDA_SEND_TO_CHATGPT') {
          const tabId = await ensureChatGptTabId();
          const res = await sendToTab(tabId, {
            type: 'VDA_INJECT',
            text: request.text,
            autoSend: request.autoSend,
          });
          sendResponse(res);
          return;
        }
        if (request.type === 'VDA_IMPORT_FROM_CHATGPT') {
          const existing = await chrome.tabs.query({ url: [...CHAT_GPT_URL_PATTERNS] });
          const tab = existing.find((t) => t.id != null);
          if (!tab?.id) {
            sendResponse({ ok: false, error: 'Open ChatGPT in a tab first.' });
            return;
          }
          await chrome.tabs.update(tab.id, { active: true });
          const res = await sendToTab(tab.id, { type: 'VDA_GET_LAST_ASSISTANT' });
          sendResponse(res);
          return;
        }
        sendResponse({ ok: false, error: 'Unknown request' });
      } catch (e) {
        sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return true;
  },
);
