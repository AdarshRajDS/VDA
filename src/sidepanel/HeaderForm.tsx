import type { AuditHeader, AuditTeamRow, DistributionRow, ParticipantTableRow } from '../lib/storage';
import { ui } from './uiStrings';

type Lang = 'en' | 'de';

const AUDITOR_TYPES = ['Lead-Auditor', 'Auditor', 'Technical expert', 'Observer', ''] as const;

export default function HeaderForm({
  header,
  onChange,
  language,
  onSend,
  onClear,
  busy,
  bridgeMsg,
}: {
  header: AuditHeader;
  onChange: (h: AuditHeader) => void;
  language: Lang;
  onSend: () => void;
  onClear: () => void;
  busy: boolean;
  bridgeMsg: string | null;
}) {
  const t = ui[language];

  const patch = (partial: Partial<AuditHeader>) => onChange({ ...header, ...partial });
  const patchOrg = (partial: Partial<AuditHeader['auditOrg']>) =>
    onChange({ ...header, auditOrg: { ...header.auditOrg, ...partial } });
  const patchPart = (partial: Partial<AuditHeader['participants']>) =>
    onChange({ ...header, participants: { ...header.participants, ...partial } });
  const patchOd = (partial: Partial<AuditHeader['organizationDetails']>) =>
    onChange({ ...header, organizationDetails: { ...header.organizationDetails, ...partial } });
  const patchAo = (partial: Partial<AuditHeader['auditedOrganisation']>) =>
    onChange({ ...header, auditedOrganisation: { ...header.auditedOrganisation, ...partial } });

  const setTeam = (rows: AuditTeamRow[]) => onChange({ ...header, auditTeam: rows });
  const setDist = (rows: DistributionRow[]) => onChange({ ...header, distribution: rows });
  const setPartRows = (rows: ParticipantTableRow[]) => onChange({ ...header, participantRows: rows });

  const emptyDist = (): DistributionRow => ({ name: '', company: '', department: '', email: '' });
  const emptyPart = (): ParticipantTableRow => ({ name: '', company: '', department: '', email: '' });
  const emptyTeam = (): AuditTeamRow => ({
    auditorType: 'Lead-Auditor',
    certificateNo: '',
    name: '',
    email: '',
    company: '',
    signedBy: false,
    department: '',
  });

  return (
    <>
      <div className="analysis-block">
        <h2 className="analysis-section-title">{t.reportData}</h2>
        <div className="field">
          <label className="field-label" htmlFor="vda-header-reportName">
            {t.reportName}
          </label>
          <input
            id="vda-header-reportName"
            name="reportName"
            className="input-line"
            type="text"
            value={header.reportName}
            onChange={(e) => patch({ reportName: e.target.value })}
          />
        </div>
        <div className="row-2">
          <div className="field">
            <label className="field-label" htmlFor="vda-header-orderNo">
              {t.orderNo}
            </label>
            <input
              id="vda-header-orderNo"
              name="orderNo"
              className="input-line"
              type="text"
              value={header.orderNo}
              onChange={(e) => patch({ orderNo: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-header-reportDateStart">
              {t.reportDateStart}
            </label>
            <input
              id="vda-header-reportDateStart"
              name="reportDateStart"
              className="input-line"
              type="date"
              value={header.reportDateStart}
              onChange={(e) => patch({ reportDateStart: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="vda-header-reportDateEnd">
            {t.reportDateEnd}
          </label>
          <input
            id="vda-header-reportDateEnd"
            name="reportDateEnd"
            className="input-line"
            type="date"
            value={header.reportDateEnd}
            onChange={(e) => patch({ reportDateEnd: e.target.value })}
          />
        </div>
        <div className="row-2">
          <div className="field">
            <label className="field-label" htmlFor="vda-header-auditDateStart">
              {t.auditDates} (start)
            </label>
            <input
              id="vda-header-auditDateStart"
              name="auditDateStart"
              className="input-line"
              type="date"
              value={header.auditDateStart}
              onChange={(e) => patch({ auditDateStart: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-header-auditDateEnd">
              {t.auditDates} (end)
            </label>
            <input
              id="vda-header-auditDateEnd"
              name="auditDateEnd"
              className="input-line"
              type="date"
              value={header.auditDateEnd}
              onChange={(e) => patch({ auditDateEnd: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <div className="toggle-row">
            <label className="switch">
              <input
                id="vda-header-manager"
                name="managerOfAuditDepartment"
                type="checkbox"
                checked={header.managerOfAuditDepartment}
                onChange={(e) => patch({ managerOfAuditDepartment: e.target.checked })}
              />
              <span className="slider" />
            </label>
            <label htmlFor="vda-header-manager" style={{ fontWeight: 600, cursor: 'pointer' }}>
              {t.managerAuditDept}
            </label>
            <span style={{ color: 'var(--vda-muted)' }}>{header.managerOfAuditDepartment ? t.yes : t.no}</span>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="vda-audit-org-name">
            {t.auditOrganization}
          </label>
          <input
            id="vda-audit-org-name"
            name="auditOrg.name"
            className="input-line"
            type="text"
            value={header.auditOrg.name}
            onChange={(e) => patchOrg({ name: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="vda-header-auditReason">
            {t.auditReason}
          </label>
          <textarea
            id="vda-header-auditReason"
            name="auditReason"
            className="input-line"
            value={header.auditReason}
            onChange={(e) => patch({ auditReason: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="vda-header-auditItem">
            {t.auditItem}
          </label>
          <textarea
            id="vda-header-auditItem"
            name="auditItem"
            className="input-line"
            value={header.auditItem}
            onChange={(e) => patch({ auditItem: e.target.value })}
          />
        </div>
      </div>

      <div className="analysis-block">
        <h2 className="analysis-section-title">{t.organizationDetails}</h2>
        <div className="field">
          <label className="field-label" htmlFor="vda-od-shift">
            {t.auditedShift}
          </label>
          <input
            id="vda-od-shift"
            className="input-line"
            type="text"
            value={header.organizationDetails.auditedShift}
            onChange={(e) => patchOd({ auditedShift: e.target.value })}
          />
        </div>
        <div className="row-2">
          <div className="field">
            <label className="field-label" htmlFor="vda-od-pm">
              {t.plantManager}
            </label>
            <input
              id="vda-od-pm"
              className="input-line"
              type="text"
              value={header.organizationDetails.plantManager}
              onChange={(e) => patchOd({ plantManager: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-od-qm">
              {t.qualityManager}
            </label>
            <input
              id="vda-od-qm"
              className="input-line"
              type="text"
              value={header.organizationDetails.qualityManager}
              onChange={(e) => patchOd({ qualityManager: e.target.value })}
            />
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <label className="field-label" htmlFor="vda-od-signed">
              {t.signedByLine}
            </label>
            <input
              id="vda-od-signed"
              className="input-line"
              type="text"
              value={header.organizationDetails.signedByLine}
              onChange={(e) => patchOd({ signedByLine: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-od-senior">
              {t.seniorManager}
            </label>
            <input
              id="vda-od-senior"
              className="input-line"
              type="text"
              value={header.organizationDetails.seniorManager}
              onChange={(e) => patchOd({ seniorManager: e.target.value })}
            />
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <label className="field-label" htmlFor="vda-org-city">
              {t.city} ({t.auditOrganization})
            </label>
            <input
              id="vda-org-city"
              className="input-line"
              type="text"
              value={header.auditOrg.city}
              onChange={(e) => patchOrg({ city: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-org-postal">
              {t.postalCode}
            </label>
            <input
              id="vda-org-postal"
              className="input-line"
              type="text"
              value={header.auditOrg.postalCode}
              onChange={(e) => patchOrg({ postalCode: e.target.value })}
            />
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <label className="field-label" htmlFor="vda-org-email">
              {t.email}
            </label>
            <input
              id="vda-org-email"
              className="input-line"
              type="email"
              value={header.auditOrg.email}
              onChange={(e) => patchOrg({ email: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-org-phone">
              {t.phone}
            </label>
            <input
              id="vda-org-phone"
              className="input-line"
              type="tel"
              value={header.auditOrg.phone}
              onChange={(e) => patchOrg({ phone: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="analysis-block">
        <div className="table-section-head">
          <h2 className="analysis-section-title" style={{ border: 'none', padding: 0, margin: 0 }}>
            {t.auditTeam}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t.addRow}
            title={t.addRow}
            onClick={() => setTeam([...header.auditTeam, emptyTeam()])}
          >
            +
          </button>
        </div>
        <div className="table-col-headers four" style={{ marginTop: 8 }}>
          <span>{t.colAuditType}</span>
          <span>{t.colName}</span>
          <span>{t.colCompany}</span>
          <span>{t.colDepartment}</span>
        </div>
        {header.auditTeam.map((row, i) => (
          <div key={i} className="audit-team-card">
            <div className="audit-team-grid-top">
              <select
                className="input-line"
                aria-label={t.colAuditorCert}
                value={row.auditorType}
                onChange={(e) => {
                  const next = [...header.auditTeam];
                  next[i] = { ...row, auditorType: e.target.value };
                  setTeam(next);
                }}
              >
                {AUDITOR_TYPES.map((opt) => (
                  <option key={opt || 'empty'} value={opt}>
                    {opt || '—'}
                  </option>
                ))}
              </select>
              <input
                className="input-line"
                aria-label={t.colName}
                placeholder={t.colName}
                value={row.name}
                onChange={(e) => {
                  const next = [...header.auditTeam];
                  next[i] = { ...row, name: e.target.value };
                  setTeam(next);
                }}
              />
              <input
                className="input-line"
                aria-label={t.colCompany}
                placeholder={t.colCompany}
                value={row.company}
                onChange={(e) => {
                  const next = [...header.auditTeam];
                  next[i] = { ...row, company: e.target.value };
                  setTeam(next);
                }}
              />
              <input
                className="input-line"
                aria-label={t.colDepartment}
                placeholder={t.colDepartment}
                value={row.department}
                onChange={(e) => {
                  const next = [...header.auditTeam];
                  next[i] = { ...row, department: e.target.value };
                  setTeam(next);
                }}
              />
            </div>
            <div className="audit-team-grid-bottom">
              <input
                className="input-line"
                placeholder={t.certificateNo}
                value={row.certificateNo}
                onChange={(e) => {
                  const next = [...header.auditTeam];
                  next[i] = { ...row, certificateNo: e.target.value };
                  setTeam(next);
                }}
              />
              <input
                className="input-line"
                type="email"
                placeholder={t.email}
                value={row.email}
                onChange={(e) => {
                  const next = [...header.auditTeam];
                  next[i] = { ...row, email: e.target.value };
                  setTeam(next);
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={row.signedBy}
                  onChange={(e) => {
                    const next = [...header.auditTeam];
                    next[i] = { ...row, signedBy: e.target.checked };
                    setTeam(next);
                  }}
                />
                {t.signedBy}
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="analysis-block">
        <div className="audited-org-header">
          <h2 className="analysis-section-title" style={{ border: 'none', padding: 0, margin: 0, flex: 1 }}>
            {t.auditedOrgTitle}
          </h2>
          <label className="pill-toggle">
            <input
              type="checkbox"
              checked={header.auditedOrganisation.internalAudit}
              onChange={(e) => patchAo({ internalAudit: e.target.checked })}
            />
            {t.internalAudit}
          </label>
        </div>
        <div className="audited-org-grid">
          <div className="field field-span-2">
            <label className="field-label" htmlFor="vda-ao-name">
              {t.name}
            </label>
            <input
              id="vda-ao-name"
              className="input-line"
              value={header.auditedOrganisation.name}
              onChange={(e) => patchAo({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-supplier">
              {t.supplierNumber}
            </label>
            <input
              id="vda-ao-supplier"
              className="input-line"
              value={header.auditedOrganisation.supplierNumber}
              onChange={(e) => patchAo({ supplierNumber: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-duns">
              {t.duns}
            </label>
            <input
              id="vda-ao-duns"
              className="input-line"
              value={header.auditedOrganisation.duns}
              onChange={(e) => patchAo({ duns: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-city">
              {t.city}
            </label>
            <input
              id="vda-ao-city"
              className="input-line"
              value={header.auditedOrganisation.city}
              onChange={(e) => patchAo({ city: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-postal">
              {t.postalCode}
            </label>
            <input
              id="vda-ao-postal"
              className="input-line"
              value={header.auditedOrganisation.postalCode}
              onChange={(e) => patchAo({ postalCode: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-s1">
              {t.street1}
            </label>
            <input
              id="vda-ao-s1"
              className="input-line"
              value={header.auditedOrganisation.street1}
              onChange={(e) => patchAo({ street1: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-s2">
              {t.street2}
            </label>
            <input
              id="vda-ao-s2"
              className="input-line"
              value={header.auditedOrganisation.street2}
              onChange={(e) => patchAo({ street2: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-country">
              {t.country}
            </label>
            <input
              id="vda-ao-country"
              className="input-line"
              value={header.auditedOrganisation.country}
              onChange={(e) => patchAo({ country: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-email">
              {t.email}
            </label>
            <input
              id="vda-ao-email"
              className="input-line"
              type="email"
              value={header.auditedOrganisation.email}
              onChange={(e) => patchAo({ email: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vda-ao-phone">
              {t.phone}
            </label>
            <input
              id="vda-ao-phone"
              className="input-line"
              type="tel"
              value={header.auditedOrganisation.phone}
              onChange={(e) => patchAo({ phone: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="analysis-block">
        <div className="table-section-head">
          <h2 className="analysis-section-title" style={{ border: 'none', padding: 0, margin: 0 }}>
            {t.distribution}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t.addRow}
            title={t.addRow}
            onClick={() => setDist([...header.distribution, emptyDist()])}
          >
            +
          </button>
        </div>
        <div className="table-col-headers four">
          <span>{t.colName}</span>
          <span>{t.colCompany}</span>
          <span>{t.colDepartment}</span>
          <span>{t.email}</span>
        </div>
        {header.distribution.map((row, i) => (
          <div key={i} className="table-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 6 }}>
            <input
              className="input-line"
              aria-label={t.colName}
              placeholder={t.colName}
              value={row.name}
              onChange={(e) => {
                const next = [...header.distribution];
                next[i] = { ...row, name: e.target.value };
                setDist(next);
              }}
            />
            <input
              className="input-line"
              aria-label={t.colCompany}
              placeholder={t.colCompany}
              value={row.company}
              onChange={(e) => {
                const next = [...header.distribution];
                next[i] = { ...row, company: e.target.value };
                setDist(next);
              }}
            />
            <input
              className="input-line"
              aria-label={t.colDepartment}
              placeholder={t.colDepartment}
              value={row.department}
              onChange={(e) => {
                const next = [...header.distribution];
                next[i] = { ...row, department: e.target.value };
                setDist(next);
              }}
            />
            <input
              className="input-line"
              type="email"
              aria-label={t.email}
              placeholder={t.email}
              value={row.email}
              onChange={(e) => {
                const next = [...header.distribution];
                next[i] = { ...row, email: e.target.value };
                setDist(next);
              }}
            />
          </div>
        ))}
      </div>

      <div className="analysis-block">
        <div className="table-section-head">
          <h2 className="analysis-section-title" style={{ border: 'none', padding: 0, margin: 0 }}>
            {t.participants}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t.addRow}
            title={t.addRow}
            onClick={() => setPartRows([...header.participantRows, emptyPart()])}
          >
            +
          </button>
        </div>
        <div className="table-col-headers four">
          <span>{t.colName}</span>
          <span>{t.colCompany}</span>
          <span>{t.colDepartment}</span>
          <span>{t.email}</span>
        </div>
        {header.participantRows.map((row, i) => (
          <div key={i} className="table-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 6 }}>
            <input
              className="input-line"
              placeholder={t.colName}
              value={row.name}
              onChange={(e) => {
                const next = [...header.participantRows];
                next[i] = { ...row, name: e.target.value };
                setPartRows(next);
              }}
            />
            <input
              className="input-line"
              placeholder={t.colCompany}
              value={row.company}
              onChange={(e) => {
                const next = [...header.participantRows];
                next[i] = { ...row, company: e.target.value };
                setPartRows(next);
              }}
            />
            <input
              className="input-line"
              placeholder={t.colDepartment}
              value={row.department}
              onChange={(e) => {
                const next = [...header.participantRows];
                next[i] = { ...row, department: e.target.value };
                setPartRows(next);
              }}
            />
            <input
              className="input-line"
              type="email"
              placeholder={t.email}
              value={row.email}
              onChange={(e) => {
                const next = [...header.participantRows];
                next[i] = { ...row, email: e.target.value };
                setPartRows(next);
              }}
            />
          </div>
        ))}
      </div>

      <div className="analysis-block">
        <h2 className="analysis-section-title">{t.productProcessTitle}</h2>
        <div className="field">
          <div className="toggle-row">
            <span className="help" title={t.helpP3P4} aria-hidden>
              ?
            </span>
            <label className="switch">
              <input
                id="vda-part-separateP3P4"
                type="checkbox"
                checked={header.participants.separateEvalP3P4}
                onChange={(e) => patchPart({ separateEvalP3P4: e.target.checked })}
              />
              <span className="slider" />
            </label>
            <label htmlFor="vda-part-separateP3P4" style={{ fontWeight: 600, cursor: 'pointer', flex: 1 }}>
              {t.separateEval}
            </label>
          </div>
        </div>
        <div className="product-process-split">
          <div>
            <div className="pp-col-head">
              <span className="help" title={t.helpProduct} aria-hidden>
                ?
              </span>
              {t.productGroup}
              <button
                type="button"
                className="icon-btn"
                style={{ marginLeft: 'auto', width: 28, height: 28, fontSize: 16 }}
                aria-label={t.addRow}
                onClick={() => patchPart({ productGroups: [...header.participants.productGroups, ''] })}
              >
                +
              </button>
            </div>
            {header.participants.productGroups.map((line, i) => (
              <input
                key={i}
                className="input-line"
                style={{ marginBottom: 6 }}
                value={line}
                onChange={(e) => {
                  const next = [...header.participants.productGroups];
                  next[i] = e.target.value;
                  patchPart({ productGroups: next });
                }}
              />
            ))}
          </div>
          <div>
            <div className="pp-col-head">
              <span className="help" title={t.helpProcess} aria-hidden>
                ?
              </span>
              {t.processStep}
              <button
                type="button"
                className="icon-btn"
                style={{ marginLeft: 'auto', width: 28, height: 28, fontSize: 16 }}
                aria-label={t.addRow}
                onClick={() => patchPart({ processSteps: [...header.participants.processSteps, ''] })}
              >
                +
              </button>
            </div>
            {header.participants.processSteps.map((line, i) => (
              <input
                key={i}
                className="input-line"
                style={{ marginBottom: 6 }}
                value={line}
                onChange={(e) => {
                  const next = [...header.participants.processSteps];
                  next[i] = e.target.value;
                  patchPart({ processSteps: next });
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {bridgeMsg ? <div className="msg warn">{bridgeMsg}</div> : null}

      <div className="footer-bar" style={{ position: 'relative', marginTop: 16 }}>
        <button type="button" id="vda-header-clear" className="btn btn-danger-outline" disabled={busy} onClick={onClear}>
          {t.clearHeader}
        </button>
        <button type="button" id="vda-header-send" className="btn btn-primary" disabled={busy} onClick={onSend}>
          {t.send}
        </button>
      </div>
    </>
  );
}
