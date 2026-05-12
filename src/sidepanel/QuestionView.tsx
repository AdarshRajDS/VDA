import { useEffect, useMemo, useState } from 'react';
import type { QuestionnaireFile, QuestionnaireQuestion } from '../types/questionnaire';
import type { AnswerMap, QuestionAnswer } from '../lib/storage';
import { normalizeAnswer } from '../lib/storage';
import { ui } from './uiStrings';

type Lang = 'en' | 'de';

function pick(s: { en: string; de?: string }, lang: Lang) {
  return lang === 'de' && s.de ? s.de : s.en;
}

export function orderedProcessElements(questions: QuestionnaireQuestion[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const qq of questions) {
    if (!seen.has(qq.processElement)) {
      seen.add(qq.processElement);
      order.push(qq.processElement);
    }
  }
  return order;
}

export default function QuestionView({
  data,
  language,
  index,
  answers,
  onAnswers,
  onIndex,
  chapters,
  onSendGpt,
  onCommitAuditorToGpt,
  onCommitGptToGpt,
  onImportGpt,
  onClearQuestion,
  busy,
  bridgeMsg,
}: {
  data: QuestionnaireFile;
  language: Lang;
  index: number;
  answers: AnswerMap;
  onAnswers: (m: AnswerMap) => void;
  onIndex: (i: number) => void;
  chapters: string[];
  onSendGpt: () => void;
  onCommitAuditorToGpt: () => void | Promise<void>;
  onCommitGptToGpt: () => void | Promise<void>;
  onImportGpt: () => void;
  onClearQuestion: () => void;
  busy: boolean;
  bridgeMsg: string | null;
}) {
  const t = ui[language];
  const q = data.questions[index];
  const processes = useMemo(() => orderedProcessElements(data.questions), [data.questions]);

  const [findingsOpen, setFindingsOpen] = useState(true);
  const [internalOpen, setInternalOpen] = useState(true);
  const [gptOpen, setGptOpen] = useState(true);

  if (!q) return <p>Invalid question index.</p>;

  const fid = q.questionId.replace(/[^a-zA-Z0-9_-]/g, '_');

  const ans = normalizeAnswer(answers[q.questionId]);
  const setAns = (patch: Partial<QuestionAnswer>) => {
    const merged = normalizeAnswer({ ...ans, ...patch });
    onAnswers({ ...answers, [q.questionId]: merged });
  };

  const setFindingLines = (lines: string[]) => {
    const userFinding = lines.join('\n\n').trim();
    setAns({ findingLines: [...lines], userFinding, findingLocked: null });
  };

  const setInternalLines = (lines: string[]) => {
    const internalComment = lines.join('\n\n').trim();
    setAns({ internalLines: [...lines], internalComment, findingLocked: null });
  };

  const starOn = ans.starOverride !== null ? ans.starOverride : q.isStarQuestion;
  const sectionVal = ans.sectionHeading || q.sectionHeadingFromReport;

  const scoreOpts = [...new Set(q.allowedScores)].sort((a, b) => a - b);

  const processScoreHint = useMemo(() => {
    const s = new Set<number>();
    data.questions
      .filter((x) => x.processElement === q.processElement)
      .forEach((qq) => qq.allowedScores.forEach((n) => s.add(n)));
    return [...s].sort((a, b) => a - b).join('/');
  }, [q.processElement, data.questions]);

  const toggleStar = () => {
    const cur = ans.starOverride !== null ? ans.starOverride : q.isStarQuestion;
    setAns({ starOverride: !cur });
  };

  const onScore = (n: number | null, ne: boolean) => {
    if (ne) setAns({ notEvaluated: true, score: null });
    else setAns({ notEvaluated: false, score: n });
  };

  const jump = (title: string) => {
    const i = data.questions.findIndex((x) => x.sectionHeadingFromReport === title);
    if (i >= 0) onIndex(i);
  };

  const goProcess = (pe: string) => {
    const i = data.questions.findIndex((x) => x.processElement === pe);
    if (i >= 0) onIndex(i);
  };

  const bulkForProcess = (partial: Partial<QuestionAnswer>) => {
    const next = { ...answers };
    for (const qq of data.questions) {
      if (qq.processElement !== q.processElement) continue;
      const cur = normalizeAnswer(next[qq.questionId]);
      next[qq.questionId] = normalizeAnswer({ ...cur, ...partial });
    }
    onAnswers(next);
  };

  useEffect(() => {
    setFindingsOpen(true);
    setInternalOpen(true);
  }, [q.questionId]);

  const radioName = `vda-score-${fid}`;

  return (
    <div className="question-shell">
      <div className="question-main">
        <div className="vda-process-tabs" role="tablist" aria-label="Process elements">
          {processes.map((pe) => (
            <button
              key={pe}
              type="button"
              role="tab"
              aria-selected={pe === q.processElement}
              className={pe === q.processElement ? 'active' : ''}
              onClick={() => goProcess(pe)}
            >
              {pe}
            </button>
          ))}
        </div>

        <div className="question-chrome">
          <div className="question-chrome-head">
            <div className="question-chrome-title">
              <span className="help" aria-hidden>
                ?
              </span>
              <span>
                {q.processElement} {sectionVal.replace(/^P\d+\s*-\s*/i, '').trim() || sectionVal}
              </span>
            </div>
            <div className="bulk-actions">
              <button type="button" className="btn" onClick={() => bulkForProcess({ notEvaluated: true, score: null })}>
                {t.setAllNe}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => bulkForProcess({ notEvaluated: false, score: 10 })}
              >
                {t.setAll10}
              </button>
              <button type="button" className="btn" onClick={() => bulkForProcess({ notEvaluated: true, score: null })}>
                {t.doNotAssess}
              </button>
            </div>
          </div>

          {processScoreHint ?
            <div className="score-hint" title="Allowed numeric scores in this chapter">
              {processScoreHint}
            </div>
          : null}

          <div className="field" style={{ marginBottom: 8 }}>
            <label className="field-label" htmlFor={`vda-q-${fid}-chapter`}>
              {t.jumpChapter}
            </label>
            <select
              id={`vda-q-${fid}-chapter`}
              name="question.jumpChapter"
              className="input-line"
              value={q.sectionHeadingFromReport}
              onChange={(e) => jump(e.target.value)}
            >
              {chapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="q-title" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 700, color: 'var(--vda-navy)' }}>
              {q.questionNumber} {pick(q.title, language)}
            </span>
            <button
              type="button"
              className={`btn score-btn ${starOn ? 'active' : ''}`}
              onClick={toggleStar}
              title={t.starQ}
              aria-label={t.starQ}
              aria-pressed={starOn}
            >
              ★
            </button>
          </div>

          <div className="field">
            <label className="field-label" htmlFor={`vda-q-${fid}-sectionHeading`}>
              {t.sectionHeading}
            </label>
            <input
              id={`vda-q-${fid}-sectionHeading`}
              name="question.sectionHeading"
              className="input-line"
              type="text"
              value={ans.sectionHeading}
              placeholder={q.sectionHeadingFromReport}
              onChange={(e) => setAns({ sectionHeading: e.target.value })}
            />
          </div>

          <div className="radio-score-row" role="radiogroup" aria-label={t.result}>
            <span className="result-label">{t.result}</span>
            <label>
              <input
                type="radio"
                name={radioName}
                checked={ans.notEvaluated}
                onChange={() => onScore(null, true)}
              />
              {t.notEval}
            </label>
            {scoreOpts.map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name={radioName}
                  checked={!ans.notEvaluated && ans.score === n}
                  onChange={() => onScore(n, false)}
                />
                {n}
              </label>
            ))}
          </div>

          <div className="collapse-bar">
            <button
              type="button"
              className="collapse-bar-title"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setFindingsOpen(!findingsOpen)}
            >
              <span className="help" aria-hidden>
                ?
              </span>
              {t.findings}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => setFindingLines([...ans.findingLines, ''])}
            >
              {t.addFinding}
            </button>
          </div>
          {findingsOpen ?
            <div style={{ marginBottom: 10 }}>
              {ans.findingLines.map((line, i) => (
                <textarea
                  key={i}
                  className="input-line"
                  style={{ marginBottom: 8, minHeight: 72 }}
                  value={line}
                  placeholder={t.yourFinding}
                  onChange={(e) => {
                    const next = [...ans.findingLines];
                    next[i] = e.target.value;
                    setFindingLines(next);
                  }}
                />
              ))}
            </div>
          : null}

          <div className="collapse-bar">
            <button
              type="button"
              className="collapse-bar-title"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setInternalOpen(!internalOpen)}
            >
              <span className="help" aria-hidden>
                ?
              </span>
              {t.internalComments}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => setInternalLines([...ans.internalLines, ''])}
            >
              {t.addInternalComment}
            </button>
          </div>
          {internalOpen ?
            <div style={{ marginBottom: 10 }}>
              {ans.internalLines.map((line, i) => (
                <textarea
                  key={i}
                  className="input-line"
                  style={{ marginBottom: 8, minHeight: 64 }}
                  value={line}
                  placeholder={t.internalComment}
                  onChange={(e) => {
                    const next = [...ans.internalLines];
                    next[i] = e.target.value;
                    setInternalLines(next);
                  }}
                />
              ))}
            </div>
          : null}

          <div className="collapse-bar">
            <button
              type="button"
              className="collapse-bar-title"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setGptOpen(!gptOpen)}
            >
              <span className="help" aria-hidden>
                ?
              </span>
              {t.gptAssistant}
            </button>
          </div>
          {gptOpen ?
            <div className="section" style={{ border: 'none', paddingBottom: 0 }}>
              <div className="gpt-grid">
                <div>
                  <label className="field-label" htmlFor={`vda-q-${fid}-gptFinding`}>
                    {t.gptSuggested}
                  </label>
                  <textarea
                    id={`vda-q-${fid}-gptFinding`}
                    className="input-line"
                    style={{ minHeight: 80 }}
                    value={ans.gptFinding}
                    onChange={(e) => setAns({ gptFinding: e.target.value })}
                  />
                </div>
              </div>
              {ans.gptInternalComment.trim() ?
                <div className="field" style={{ marginTop: 8 }}>
                  <label className="field-label" htmlFor={`vda-q-${fid}-gptInternal`}>
                    {t.gptInternalImported}
                  </label>
                  <textarea
                    id={`vda-q-${fid}-gptInternal`}
                    readOnly
                    className="input-line"
                    style={{ minHeight: 56 }}
                    value={ans.gptInternalComment}
                  />
                </div>
              : null}
              <div className="toolbar-actions gpt-workflow-actions" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={onSendGpt}>
                  {t.sendQuestionGpt}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void onCommitAuditorToGpt()}
                  title={t.keepMineHint}
                >
                  {t.keepMine}
                </button>
                <button type="button" className="btn" disabled={busy} onClick={onImportGpt}>
                  {t.importGpt}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || (!ans.gptFinding.trim() && !ans.gptInternalComment.trim())}
                  onClick={() => void onCommitGptToGpt()}
                  title={t.useGptHint}
                >
                  {t.useGpt}
                </button>
                <button type="button" className="btn btn-danger-outline" disabled={busy} onClick={onClearQuestion}>
                  {t.clearQuestion}
                </button>
              </div>
              {ans.findingLocked === 'user' ?
                <p className="finding-lock-hint">{t.findingLockedUser}</p>
              : ans.findingLocked === 'gpt' ?
                <p className="finding-lock-hint">{t.findingLockedGpt}</p>
              : null}
            </div>
          : null}

          {bridgeMsg ? <div className="msg info">{bridgeMsg}</div> : null}

          <div className="nav-footer">
            <button type="button" className="btn" disabled={index <= 0} onClick={() => onIndex(index - 1)}>
              {t.prev}
            </button>
            <button
              type="button"
              className="btn btn-nav"
              disabled={index >= data.questions.length - 1}
              onClick={() => onIndex(index + 1)}
            >
              {t.next}
            </button>
          </div>
        </div>
      </div>

      <nav className="side-rail" aria-label="Jump to process">
        {processes.map((pe) => (
          <button
            key={pe}
            type="button"
            className={pe === q.processElement ? 'active' : ''}
            onClick={() => goProcess(pe)}
          >
            {`>${pe}`}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function buildChapters(questions: QuestionnaireQuestion[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const qq of questions) {
    if (!seen.has(qq.sectionHeadingFromReport)) {
      seen.add(qq.sectionHeadingFromReport);
      out.push(qq.sectionHeadingFromReport);
    }
  }
  return out;
}
