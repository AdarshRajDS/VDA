/** @deprecated Legacy row shape; migrated to AuditTeamRow */
export interface OrgPersonRow {
  auditType: string;
  name: string;
  company: string;
  department: string;
}

export interface DistributionRow {
  name: string;
  company: string;
  department: string;
  email: string;
}

export interface ParticipantTableRow {
  name: string;
  company: string;
  department: string;
  email: string;
}

export interface AuditTeamRow {
  auditorType: string;
  certificateNo: string;
  name: string;
  email: string;
  company: string;
  signedBy: boolean;
  department: string;
}

export interface OrganizationDetails {
  auditedShift: string;
  plantManager: string;
  qualityManager: string;
  signedByLine: string;
  seniorManager: string;
}

export interface AuditedOrganisation {
  name: string;
  supplierNumber: string;
  duns: string;
  city: string;
  postalCode: string;
  street1: string;
  street2: string;
  country: string;
  email: string;
  phone: string;
  internalAudit: boolean;
}

export interface AuditHeader {
  reportName: string;
  orderNo: string;
  reportDateStart: string;
  reportDateEnd: string;
  auditDateStart: string;
  auditDateEnd: string;
  managerOfAuditDepartment: boolean;
  auditReason: string;
  auditItem: string;
  /** Auditing organisation (name + contact). */
  auditOrg: {
    name: string;
    plantManager: string;
    city: string;
    postalCode: string;
    email: string;
    phone: string;
  };
  organizationDetails: OrganizationDetails;
  auditTeam: AuditTeamRow[];
  auditedOrganisation: AuditedOrganisation;
  distribution: DistributionRow[];
  participantRows: ParticipantTableRow[];
  participants: {
    separateEvalP3P4: boolean;
    productGroups: string[];
    processSteps: string[];
  };
}

export interface QuestionAnswer {
  score: number | null;
  notEvaluated: boolean;
  userFinding: string;
  gptFinding: string;
  /** GPT-suggested internal comment from last import (does not replace auditor internal lines). */
  gptInternalComment: string;
  internalComment: string;
  starOverride: boolean | null;
  sectionHeading: string;
  /** Multiple finding blocks (UI); kept in sync with userFinding */
  findingLines: string[];
  internalLines: string[];
  /** Set by Keep mine / Use GPT version; cleared when the auditor edits findings or imports a new GPT reply */
  findingLocked: 'user' | 'gpt' | null;
}

export type AnswerMap = Record<string, QuestionAnswer>;

export interface UiState {
  language: 'en' | 'de';
  currentQuestionIndex: number;
  view: 'header' | 'questions';
  lastGptImportAt: string | null;
  lastBridgeMessage: string | null;
}

const STORAGE_KEY = 'vda63_auditor_state_v1';

export interface PersistedState {
  header: AuditHeader;
  answers: AnswerMap;
  ui: UiState;
}

function defaultOrganizationDetails(): OrganizationDetails {
  return {
    auditedShift: '',
    plantManager: '',
    qualityManager: '',
    signedByLine: '',
    seniorManager: '',
  };
}

function defaultAuditedOrganisation(): AuditedOrganisation {
  return {
    name: '',
    supplierNumber: '',
    duns: '',
    city: '',
    postalCode: '',
    street1: '',
    street2: '',
    country: '',
    email: '',
    phone: '',
    internalAudit: false,
  };
}

function defaultAuditTeamRow(): AuditTeamRow {
  return {
    auditorType: 'Lead-Auditor',
    certificateNo: '',
    name: '',
    email: '',
    company: '',
    signedBy: false,
    department: '',
  };
}

export function defaultHeader(): AuditHeader {
  return {
    reportName: '',
    orderNo: '',
    reportDateStart: '',
    reportDateEnd: '',
    auditDateStart: '',
    auditDateEnd: '',
    managerOfAuditDepartment: true,
    auditReason: '',
    auditItem: '',
    auditOrg: {
      name: '',
      plantManager: '',
      city: '',
      postalCode: '',
      email: '',
      phone: '',
    },
    organizationDetails: defaultOrganizationDetails(),
    auditTeam: [defaultAuditTeamRow()],
    auditedOrganisation: defaultAuditedOrganisation(),
    distribution: [{ name: '', company: '', department: '', email: '' }],
    participantRows: [{ name: '', company: '', department: '', email: '' }],
    participants: {
      separateEvalP3P4: false,
      productGroups: [''],
      processSteps: [''],
    },
  };
}

export function defaultAnswer(): QuestionAnswer {
  return {
    score: null,
    notEvaluated: false,
    userFinding: '',
    gptFinding: '',
    gptInternalComment: '',
    internalComment: '',
    starOverride: null,
    sectionHeading: '',
    findingLines: [''],
    internalLines: [''],
    findingLocked: null,
  };
}

export function normalizeAnswer(a: Partial<QuestionAnswer> | undefined): QuestionAnswer {
  const d = defaultAnswer();
  if (!a) return d;
  const findingLines =
    Array.isArray(a.findingLines) && a.findingLines.length ? [...a.findingLines] : (
      a.userFinding ?
        [a.userFinding]
      : ['']
    );
  const internalLines =
    Array.isArray(a.internalLines) && a.internalLines.length ? [...a.internalLines] : (
      a.internalComment ?
        [a.internalComment]
      : ['']
    );
  const locked =
    a.findingLocked === 'user' || a.findingLocked === 'gpt' ? a.findingLocked : null;
  const gptInternalComment =
    typeof a.gptInternalComment === 'string' ? a.gptInternalComment : d.gptInternalComment;
  return {
    ...d,
    ...a,
    findingLines,
    internalLines,
    findingLocked: locked,
    gptInternalComment,
    userFinding: findingLines.join('\n\n').trim(),
    internalComment: internalLines.join('\n\n').trim(),
  };
}

function migrateLegacyPerson(r: OrgPersonRow): AuditTeamRow {
  return {
    auditorType: r.auditType || 'Lead-Auditor',
    certificateNo: '',
    name: r.name,
    email: '',
    company: r.company,
    signedBy: false,
    department: r.department,
  };
}

function migrateDistributionRow(r: { name?: string; company?: string; department?: string; email?: string }): DistributionRow {
  return {
    name: r.name ?? '',
    company: r.company ?? '',
    department: r.department ?? '',
    email: r.email ?? '',
  };
}

function normalizeHeader(raw: Record<string, unknown> | undefined, h0: AuditHeader): AuditHeader {
  if (!raw || typeof raw !== 'object') return h0;
  const org = { ...h0.auditOrg, ...(raw.auditOrg as AuditHeader['auditOrg']) };
  const participantsIn = (raw.participants ?? {}) as AuditHeader['participants'] & {
    productGroup?: string;
    processStep?: string;
  };
  const productGroups = Array.isArray(participantsIn.productGroups) ?
      participantsIn.productGroups
    : participantsIn.productGroup ?
      [participantsIn.productGroup]
    : [''];
  const processSteps = Array.isArray(participantsIn.processSteps) ?
      participantsIn.processSteps
    : participantsIn.processStep ?
      [participantsIn.processStep]
    : [''];

  let auditTeam: AuditTeamRow[] = Array.isArray(raw.auditTeam) ? (raw.auditTeam as AuditTeamRow[]) : [];
  const legacyPersons = raw.auditedPersons;
  if (!auditTeam.length && Array.isArray(legacyPersons) && legacyPersons.length) {
    auditTeam = (legacyPersons as OrgPersonRow[]).map((x) => migrateLegacyPerson(x));
  }
  if (!auditTeam.length) auditTeam = [defaultAuditTeamRow()];

  let distribution: DistributionRow[] = Array.isArray(raw.distribution) ?
      (raw.distribution as Record<string, string>[]).map(migrateDistributionRow)
    : [];
  if (!distribution.length) distribution = [{ name: '', company: '', department: '', email: '' }];

  let participantRows: ParticipantTableRow[] = Array.isArray(raw.participantRows) ?
      raw.participantRows.map((p: ParticipantTableRow) => ({ ...p, email: p.email ?? '' }))
    : [];
  if (!participantRows.length) participantRows = [{ name: '', company: '', department: '', email: '' }];

  return {
    ...h0,
    reportName: String(raw.reportName ?? h0.reportName),
    orderNo: String(raw.orderNo ?? h0.orderNo),
    reportDateStart: String(raw.reportDateStart ?? h0.reportDateStart),
    reportDateEnd: String(raw.reportDateEnd ?? h0.reportDateEnd),
    auditDateStart: String(raw.auditDateStart ?? h0.auditDateStart),
    auditDateEnd: String(raw.auditDateEnd ?? h0.auditDateEnd),
    managerOfAuditDepartment: Boolean(raw.managerOfAuditDepartment ?? h0.managerOfAuditDepartment),
    auditReason: String(raw.auditReason ?? h0.auditReason),
    auditItem: String(raw.auditItem ?? h0.auditItem),
    auditOrg: org,
    organizationDetails: { ...h0.organizationDetails, ...(raw.organizationDetails as OrganizationDetails) },
    auditedOrganisation: { ...h0.auditedOrganisation, ...(raw.auditedOrganisation as AuditedOrganisation) },
    auditTeam,
    distribution,
    participantRows,
    participants: {
      separateEvalP3P4: Boolean(participantsIn.separateEvalP3P4),
      productGroups: productGroups.length ? productGroups : [''],
      processSteps: processSteps.length ? processSteps : [''],
    },
  };
}

export async function loadState(): Promise<PersistedState> {
  const raw = await chrome.storage.local.get(STORAGE_KEY);
  const v = raw[STORAGE_KEY] as Partial<PersistedState> | undefined;
  const h0 = defaultHeader();
  const header = normalizeHeader(v?.header as Record<string, unknown> | undefined, h0);

  const answers: AnswerMap = {};
  for (const [k, val] of Object.entries(v?.answers ?? {})) {
    answers[k] = normalizeAnswer(val as Partial<QuestionAnswer>);
  }

  return {
    header,
    answers,
    ui: { ...defaultUi(), ...v?.ui },
  };
}

export async function saveState(state: PersistedState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export function defaultUi(): UiState {
  return {
    language: 'en',
    currentQuestionIndex: 0,
    view: 'header',
    lastGptImportAt: null,
    lastBridgeMessage: null,
  };
}
