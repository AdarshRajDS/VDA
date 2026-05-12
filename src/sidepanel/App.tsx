import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BackgroundRequest, BackgroundResponse } from '../messages';
import { VDA_COMPOSER_NOT_FOUND_ALL_FRAMES } from '../messages';
import { extractJsonFromAssistantMessage } from '../lib/gptParse';
import { buildAuditorLockPrompt, buildGptLockPrompt, buildHeaderPrompt, buildQuestionPrompt } from '../lib/prompts';
import {
  defaultAnswer,
  defaultHeader,
  defaultUi,
  loadState,
  normalizeAnswer,
  saveState,
  type PersistedState,
} from '../lib/storage';
import type { QuestionnaireFile } from '../types/questionnaire';
import HeaderForm from './HeaderForm';
import QuestionView, { buildChapters } from './QuestionView';
import { ui } from './uiStrings';

async function sendBg(msg: BackgroundRequest): Promise<BackgroundResponse> {
  return chrome.runtime.sendMessage(msg) as Promise<BackgroundResponse>;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<QuestionnaireFile | null>(null);
  const [state, setState] = useState<PersistedState>({
    header: defaultHeader(),
    answers: {},
    ui: defaultUi(),
  });
  const [busy, setBusy] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [loaded] = await Promise.all([
        loadState(),
        fetch(chrome.runtime.getURL('questionnaire.json'))
          .then((r) => r.json())
          .then((j) => setData(j as QuestionnaireFile)),
      ]);
      setState(loaded);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => void saveState(state), 400);
    return () => clearTimeout(t);
  }, [state, ready]);

  const lang = state.ui.language;
  const t = ui[lang];

  const chapters = useMemo(() => (data ? buildChapters(data.questions) : []), [data]);

  const setUi = useCallback((patch: Partial<PersistedState['ui']>) => {
    setState((s) => ({ ...s, ui: { ...s.ui, ...patch } }));
  }, []);

  const deliverToChatgpt = useCallback(
    async (text: string): Promise<boolean> => {
      setBusy(true);
      setLocalMsg(null);
      try {
        const res = await sendBg({ type: 'VDA_SEND_TO_CHATGPT', text, autoSend: true });
        if (!res.ok) {
          if (res.error === VDA_COMPOSER_NOT_FOUND_ALL_FRAMES) {
            try {
              await navigator.clipboard.writeText(text);
              setLocalMsg(
                'Could not find the ChatGPT message box (iframes / shadow DOM). Prompt copied — click in the ChatGPT input, press Ctrl+V, then Send.',
              );
            } catch {
              setLocalMsg(res.error);
            }
          } else {
            setLocalMsg(res.error);
          }
          return false;
        }
        if ('usedClipboardFallback' in res && res.usedClipboardFallback) {
          setLocalMsg(res.detail || 'Clipboard fallback used.');
          setUi({ lastBridgeMessage: res.detail || null });
        } else {
          setLocalMsg(null);
          setUi({ lastBridgeMessage: null });
        }
        return true;
      } finally {
        setBusy(false);
      }
    },
    [setUi],
  );

  const onHeaderSend = useCallback(async () => {
    setBusy(true);
    setLocalMsg(null);
    try {
      const text = buildHeaderPrompt(state.header, lang);
      const res = await sendBg({ type: 'VDA_SEND_TO_CHATGPT', text, autoSend: true });
      if (!res.ok) {
        if (res.error === VDA_COMPOSER_NOT_FOUND_ALL_FRAMES) {
          try {
            await navigator.clipboard.writeText(text);
            setLocalMsg(
              'Could not find the ChatGPT message box (iframes / shadow DOM). Prompt copied — click in the ChatGPT input, press Ctrl+V, then Send.',
            );
          } catch {
            setLocalMsg(res.error);
          }
        } else {
          setLocalMsg(res.error);
        }
        return;
      }
      if ('usedClipboardFallback' in res && res.usedClipboardFallback) {
        setLocalMsg(res.detail || 'Clipboard fallback used.');
        setUi({ lastBridgeMessage: res.detail || null });
      } else {
        setLocalMsg(null);
        setUi({ lastBridgeMessage: null });
      }
    } finally {
      setBusy(false);
    }
  }, [state.header, lang, setUi]);

  const onQuestionSend = useCallback(async () => {
    if (!data) return;
    const q = data.questions[state.ui.currentQuestionIndex];
    if (!q) return;
    const ans = normalizeAnswer(state.answers[q.questionId]);
    const text = buildQuestionPrompt(q, state.header, ans, lang);
    await deliverToChatgpt(text);
  }, [data, state.answers, state.header, state.ui.currentQuestionIndex, lang, deliverToChatgpt]);

  const onCommitAuditorToGpt = useCallback(async () => {
    if (!data) return;
    const q = data.questions[state.ui.currentQuestionIndex];
    if (!q) return;
    const ans = normalizeAnswer(state.answers[q.questionId]);
    const text = buildAuditorLockPrompt(q, state.header, ans, lang);
    const ok = await deliverToChatgpt(text);
    if (!ok) return;
    setState((s) => {
      const latest = normalizeAnswer(s.answers[q.questionId]);
      return {
        ...s,
        answers: {
          ...s.answers,
          [q.questionId]: normalizeAnswer({
            ...latest,
            gptFinding: '',
            gptInternalComment: '',
            findingLocked: 'user',
          }),
        },
      };
    });
  }, [data, state.answers, state.header, state.ui.currentQuestionIndex, lang, deliverToChatgpt]);

  const onCommitGptToGpt = useCallback(async () => {
    if (!data) return;
    const q = data.questions[state.ui.currentQuestionIndex];
    if (!q) return;
    const cur = normalizeAnswer(state.answers[q.questionId]);
    if (!cur.gptFinding.trim() && !cur.gptInternalComment.trim()) return;
    const text = buildGptLockPrompt(q, state.header, cur, lang);
    const ok = await deliverToChatgpt(text);
    if (!ok) return;
    setState((s) => {
      const latest = normalizeAnswer(s.answers[q.questionId]);
      const gf = latest.gptFinding.trim();
      const gi = latest.gptInternalComment.trim();
      return {
        ...s,
        answers: {
          ...s.answers,
          [q.questionId]: normalizeAnswer({
            ...latest,
            userFinding: gf,
            findingLines: gf ? [gf] : [''],
            internalLines: gi ? [gi] : [''],
            internalComment: gi,
            gptFinding: '',
            gptInternalComment: '',
            findingLocked: 'gpt',
          }),
        },
      };
    });
  }, [data, state.answers, state.header, state.ui.currentQuestionIndex, lang, deliverToChatgpt]);

  const onImport = useCallback(async () => {
    if (!data) return;
    const q = data.questions[state.ui.currentQuestionIndex];
    if (!q) return;
    setBusy(true);
    setLocalMsg(null);
    try {
      const res = await sendBg({ type: 'VDA_IMPORT_FROM_CHATGPT' });
      if (!res.ok || !('text' in res)) {
        setLocalMsg(res.ok === false ? res.error : 'No text returned');
        return;
      }
      const parsed = extractJsonFromAssistantMessage(res.text);
      if (parsed?.questionId && parsed.questionId !== q.questionId) {
        setLocalMsg(`Imported JSON targets ${parsed.questionId}, but current is ${q.questionId}. Applying text only to suggested finding.`);
      }
      setState((s) => {
        const cur = normalizeAnswer(s.answers[q.questionId]);
        const gptFinding = parsed?.suggestedFinding ?? res.text;
        const icRaw = parsed?.internalComment;
        const gptInternalComment =
          icRaw !== undefined && icRaw !== null && String(icRaw).trim().length > 0 ? String(icRaw).trim() : '';
        return {
          ...s,
          answers: {
            ...s.answers,
            [q.questionId]: normalizeAnswer({
              ...cur,
              gptFinding,
              gptInternalComment,
              findingLocked: null,
            }),
          },
          ui: {
            ...s.ui,
            lastGptImportAt: new Date().toISOString(),
            lastBridgeMessage: null,
          },
        };
      });
    } finally {
      setBusy(false);
    }
  }, [data, state.ui.currentQuestionIndex]);

  const clearHeader = useCallback(() => {
    if (!confirm('Clear all header fields?')) return;
    setState((s) => ({ ...s, header: defaultHeader() }));
    setLocalMsg(null);
  }, []);

  const clearQuestion = useCallback(() => {
    if (!data) return;
    const q = data.questions[state.ui.currentQuestionIndex];
    if (!q || !confirm('Clear answers for this question?')) return;
    setState((s) => ({
      ...s,
      answers: { ...s.answers, [q.questionId]: defaultAnswer() },
    }));
    setLocalMsg(null);
  }, [data, state.ui.currentQuestionIndex]);

  const resetAll = useCallback(() => {
    if (!confirm('Reset ENTIRE audit (header + all answers)? Type OK in next dialog is not required — this will erase data.')) return;
    if (prompt('Type RESET to confirm') !== 'RESET') return;
    setState({ header: defaultHeader(), answers: {}, ui: { ...defaultUi(), language: state.ui.language } });
    setLocalMsg(null);
  }, [state.ui.language]);

  if (!ready || !data) {
    return (
      <div className="scroll-body">
        <p>Loading…</p>
      </div>
    );
  }

  const showImported = Boolean(state.ui.lastGptImportAt);

  return (
    <div className="app-root">
      <header className="top-bar">
        <div>
          <h1>VDA 6.3 Audit</h1>
          <div className="sub">Side panel — {data.standard.name} ({data.standard.edition})</div>
        </div>
        <div className="toolbar-actions">
          <label htmlFor="vda-ui-language" className="sr-only">
            Language
          </label>
          <select
            id="vda-ui-language"
            name="ui-language"
            className="lang-select"
            value={lang}
            onChange={(e) => setUi({ language: e.target.value as 'en' | 'de' })}
          >
            <option value="en">EN</option>
            <option value="de">DE</option>
          </select>
          <span className={showImported ? 'badge' : 'badge muted'}>
            {showImported ? 'GPT Response Imported' : 'GPT idle'}
          </span>
          <button type="button" className="btn btn-danger-outline" onClick={resetAll}>
            {t.resetAll}
          </button>
        </div>
      </header>

      <nav className="vda-subnav" aria-label="Main sections">
        <button
          type="button"
          className={state.ui.view === 'header' ? 'active' : ''}
          onClick={() => setUi({ view: 'header' })}
        >
          {t.tabHeaderData}
        </button>
        <button
          type="button"
          className={state.ui.view === 'questions' ? 'active' : ''}
          onClick={() => setUi({ view: 'questions' })}
        >
          {t.tabQuestions}
        </button>
      </nav>

      <div className="scroll-body">
        {state.ui.view === 'header' ?
          <HeaderForm
            header={state.header}
            onChange={(h) => setState((s) => ({ ...s, header: h }))}
            language={lang}
            onSend={onHeaderSend}
            onClear={clearHeader}
            busy={busy}
            bridgeMsg={localMsg}
          />
        : <QuestionView
            data={data}
            language={lang}
            index={state.ui.currentQuestionIndex}
            answers={state.answers}
            onAnswers={(answers) => setState((s) => ({ ...s, answers }))}
            onIndex={(currentQuestionIndex) => setUi({ currentQuestionIndex })}
            chapters={chapters}
            onSendGpt={onQuestionSend}
            onCommitAuditorToGpt={onCommitAuditorToGpt}
            onCommitGptToGpt={onCommitGptToGpt}
            onImportGpt={onImport}
            onClearQuestion={clearQuestion}
            busy={busy}
            bridgeMsg={localMsg}
          />
        }

        <p className="disclaimer">{t.disclaimer}</p>
      </div>
    </div>
  );
}
