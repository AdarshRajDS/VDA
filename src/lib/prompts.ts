import type { QuestionnaireFile } from '../types/questionnaire';
import type { AuditHeader, QuestionAnswer } from './storage';

export function buildHeaderPrompt(header: AuditHeader, lang: 'en' | 'de'): string {
  const L = lang === 'de' ? 'de' : 'en';
  const od = header.organizationDetails;
  const ao = header.auditedOrganisation;
  const lines: string[] = [
    '### VDA 6.3 — Report / header data',
    '',
    'You are assisting with a VDA 6.3 audit. Acknowledge receipt and summarize key fields.',
    '',
    `**Report:** ${header.reportName}`,
    `**Order no:** ${header.orderNo}`,
    `**Report period:** ${header.reportDateStart} — ${header.reportDateEnd}`,
    `**Audit period:** ${header.auditDateStart} — ${header.auditDateEnd}`,
    `**Manager of audit department:** ${header.managerOfAuditDepartment ? 'yes' : 'no'}`,
    '',
    '**Audit organisation (name):**',
    header.auditOrg.name || '(empty)',
    '',
    '**Audit reason:**',
    header.auditReason || '(empty)',
    '',
    '**Audit item:**',
    header.auditItem || '(empty)',
    '',
    '**Organization details:**',
    `- Audited shift: ${od.auditedShift}`,
    `- Plant manager: ${od.plantManager}`,
    `- Quality manager: ${od.qualityManager}`,
    `- Signed by: ${od.signedByLine}`,
    `- Senior manager: ${od.seniorManager}`,
    '',
    '**Auditing org contact (legacy block):**',
    `- City: ${header.auditOrg.city}, Postal: ${header.auditOrg.postalCode}`,
    `- E-Mail: ${header.auditOrg.email}, Phone: ${header.auditOrg.phone}`,
    '',
    '**Audit team:**',
    ...header.auditTeam.map(
      (p, i) =>
        `  ${i + 1}. ${p.auditorType} | ${p.name} | ${p.email} | ${p.company} | Dept: ${p.department} | Cert: ${p.certificateNo} | Signed: ${p.signedBy ? 'yes' : 'no'}`,
    ),
    '',
    '**Audited organisation:**',
    `Internal audit mode: ${ao.internalAudit ? 'yes' : 'no'}`,
    `- Name: ${ao.name}, Supplier no.: ${ao.supplierNumber}, D-U-N-S: ${ao.duns}`,
    `- ${ao.street1}, ${ao.street2}, ${ao.postalCode} ${ao.city}, ${ao.country}`,
    `- E-Mail: ${ao.email}, Phone: ${ao.phone}`,
    '',
    '**Distribution:**',
    ...header.distribution.map(
      (p, i) => `  ${i + 1}. ${p.name} | ${p.company} | ${p.department} | ${p.email}`,
    ),
    '',
    '**Participants (list):**',
    ...header.participantRows.map(
      (p, i) => `  ${i + 1}. ${p.name} | ${p.company} | ${p.department} | ${p.email}`,
    ),
    '',
    '**Product / process scope:**',
    `- Separate P3/P4 product vs process: ${header.participants.separateEvalP3P4 ? 'yes' : 'no'}`,
    `- Product groups: ${header.participants.productGroups.filter(Boolean).join('; ') || '(none)'}`,
    `- Process steps: ${header.participants.processSteps.filter(Boolean).join('; ') || '(none)'}`,
    '',
    '---',
    'At the end, output a JSON code block with keys: vdaExtVersion (1), suggestedFinding (short summary), internalComment (optional).',
    `Use language preference: ${L}.`,
  ];
  return lines.join('\n');
}

function pickBilingual(b: { en: string; de?: string }, lang: 'en' | 'de'): string {
  return lang === 'de' && b.de ? b.de : b.en;
}

function formatAuditorResult(answer: QuestionAnswer, lang: 'en' | 'de'): string {
  if (answer.notEvaluated) return lang === 'de' ? 'n.b. (nicht bewertet)' : 'n.e. (not evaluated)';
  if (answer.score !== null && answer.score !== undefined) {
    return lang === 'de' ? `Punktzahl: ${answer.score}` : `Score: ${answer.score}`;
  }
  return lang === 'de' ? '(keine Punktzahl gewählt)' : '(no score selected)';
}

/** Prompt sent with “Send to GPT”: question identity + auditor result + findings + internals (no long criteria text). */
export function buildQuestionPrompt(
  q: QuestionnaireFile['questions'][0],
  header: AuditHeader,
  answer: QuestionAnswer,
  lang: 'en' | 'de',
): string {
  const title = pickBilingual(q.title, lang);
  const findings = answer.userFinding.trim() || (lang === 'de' ? '(leer)' : '(empty)');
  const internal = answer.internalComment.trim() || (lang === 'de' ? '(keine)' : '(none)');
  const result = formatAuditorResult(answer, lang);

  return [
    '### VDA 6.3 — Question assistance',
    '',
    `Question ID: **${q.questionId}** (${q.questionNumber})`,
    `Process: **${q.processElement}** — ${q.sectionHeadingFromReport}`,
    `Star question: ${q.isStarQuestion ? 'yes' : 'no'}`,
    '',
    '**Title:**',
    title,
    '',
    lang === 'de' ? '**Ergebnis (Auditor):**' : '**Auditor result:**',
    result,
    '',
    lang === 'de' ? '**Feststellungen (Auditor):**' : '**Auditor findings:**',
    findings,
    '',
    lang === 'de' ? '**Interne Kommentare (Auditor):**' : '**Internal comments (auditor):**',
    internal,
    '',
    lang === 'de' ? '**Berichtskontext:**' : '**Report context:**',
    `- Report: ${header.reportName}, Order: ${header.orderNo}`,
    '',
    lang === 'de' ? 'Antworte mit:' : 'Respond with:',
    lang === 'de' ?
      '1) Einem knappen Vorschlag für die Feststellung im Auditbericht.'
    : '1) A concise suggested finding suitable for the audit report.',
    lang === 'de' ?
      '2) Einem fenced JSON-Block genau in dieser Form:'
    : '2) A fenced JSON block exactly like:',
    '```json',
    '{',
    '  "vdaExtVersion": 1,',
    `  "questionId": "${q.questionId}",`,
    '  "suggestedFinding": "...",',
    '  "internalComment": "..."',
    '}',
    '```',
  ].join('\n');
}

/** Message sent when the auditor commits their own wording to the ChatGPT thread (“Keep mine”). */
export function buildAuditorLockPrompt(
  q: QuestionnaireFile['questions'][0],
  header: AuditHeader,
  answer: QuestionAnswer,
  lang: 'en' | 'de',
): string {
  const title = pickBilingual(q.title, lang);
  const findings = answer.userFinding.trim() || (lang === 'de' ? '(keine Feststellung)' : '(no finding text)');
  const internal = answer.internalComment.trim() || (lang === 'de' ? '(keine internen Kommentare)' : '(no internal comments)');
  const result = formatAuditorResult(answer, lang);

  if (lang === 'de') {
    return [
      '### VDA 6.3 — Festgeschriebener Auditor-Stand (bitte so im Thread führen)',
      '',
      'Der Auditor **bestätigt** Folgendes als maßgebliche Antwort zu dieser Frage. Behandle es als **verbindlich für den Bericht**, bis ausdrücklich etwas geändert wird. Ordne es der Frage-ID zu.',
      '',
      `**Frage-ID:** ${q.questionId} (${q.questionNumber})`,
      `**Prozess:** ${q.processElement} — ${q.sectionHeadingFromReport}`,
      '',
      '**Titel:**',
      title,
      '',
      '**Ergebnis (Auditor):**',
      result,
      '',
      '**Feststellung(en) — final (Auditor):**',
      findings,
      '',
      '**Interne Kommentare — final (Auditor):**',
      internal,
      '',
      '**Bericht:**',
      `${header.reportName} — Auftrag ${header.orderNo}`,
      '',
      'Antworte **kurz** mit einer Bestätigung (ein Absatz). Wiederhole den langen Text nicht. Widerspreche oder ersetze ihn nicht.',
    ].join('\n');
  }

  return [
    '### VDA 6.3 — Locked auditor record (treat as authoritative in this thread)',
    '',
    'The auditor **commits** the following as the **official** content for this question. Treat it as **binding for the audit record** unless they explicitly ask to change it later. Associate it with this question ID.',
    '',
    `**Question ID:** ${q.questionId} (${q.questionNumber})`,
    `**Process:** ${q.processElement} — ${q.sectionHeadingFromReport}`,
    '',
    '**Title:**',
    title,
    '',
    '**Auditor result (score):**',
    result,
    '',
    '**Finding(s) — final (auditor):**',
    findings,
    '',
    '**Internal comment(s) — final (auditor):**',
    internal,
    '',
    '**Report:**',
    `${header.reportName} — order ${header.orderNo}`,
    '',
    'Reply with a **short** acknowledgment (one paragraph). Do not repeat the full text back. Do not contradict or replace it.',
  ].join('\n');
}

/** Message sent when the auditor adopts GPT’s suggested wording (“Use GPT version”). */
export function buildGptLockPrompt(
  q: QuestionnaireFile['questions'][0],
  header: AuditHeader,
  answer: QuestionAnswer,
  lang: 'en' | 'de',
): string {
  const title = pickBilingual(q.title, lang);
  const gFinding = answer.gptFinding.trim() || (lang === 'de' ? '(kein GPT-Befund)' : '(no GPT finding)');
  const gInternal =
    answer.gptInternalComment.trim() || (lang === 'de' ? '(kein GPT-interner Kommentar)' : '(no GPT internal comment)');
  const result = formatAuditorResult(answer, lang);

  if (lang === 'de') {
    return [
      '### VDA 6.3 — Übernommener GPT-Stand (bitte so im Thread führen)',
      '',
      'Folgender Text wurde vom Auditor **als offizielle Antwort übernommen** (Vorschlag von GPT, verbindlich für den Bericht). Behandle ihn als **maßgeblich**, bis ausdrücklich etwas geändert wird.',
      '',
      `**Frage-ID:** ${q.questionId} (${q.questionNumber})`,
      `**Prozess:** ${q.processElement} — ${q.sectionHeadingFromReport}`,
      '',
      '**Titel:**',
      title,
      '',
      '**Ergebnis (Auditor / Punktzahl):**',
      result,
      '',
      '**Feststellung — übernommen von GPT:**',
      gFinding,
      '',
      '**Interner Kommentar — übernommen von GPT (falls vorhanden):**',
      gInternal,
      '',
      '**Bericht:**',
      `${header.reportName} — Auftrag ${header.orderNo}`,
      '',
      'Antworte **kurz** mit einer Bestätigung (ein Absatz). Wiederhole den langen Text nicht.',
    ].join('\n');
  }

  return [
    '### VDA 6.3 — Adopted GPT wording (treat as authoritative in this thread)',
    '',
    'The following is **adopted as the official audit response** for this question (GPT-suggested text accepted by the auditor). Treat it as **binding for the audit record** unless explicitly revised later.',
    '',
    `**Question ID:** ${q.questionId} (${q.questionNumber})`,
    `**Process:** ${q.processElement} — ${q.sectionHeadingFromReport}`,
    '',
    '**Title:**',
    title,
    '',
    '**Auditor result (score):**',
    result,
    '',
    '**Finding — adopted from GPT:**',
    gFinding,
    '',
    '**Internal comment — adopted from GPT (if any):**',
    gInternal,
    '',
    '**Report:**',
    `${header.reportName} — order ${header.orderNo}`,
    '',
    'Reply with a **short** acknowledgment (one paragraph). Do not repeat the full text back.',
  ].join('\n');
}
