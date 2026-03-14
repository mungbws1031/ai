'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  createDocComment,
  getDocComments,
  getRunFindings,
  getRunSections,
  resolveDocComment,
  syncDocComments,
  updateFindingDecision,
  updateMissingEvidence,
  updateSectionAcceptance,
  updateSectionLock,
} from '@/lib/api';
import { Card, SeverityBadge } from '@/components/ui';

export default function ReviewWorkspace({ params }: { params: { id: string } }) {
  const [sections, setSections] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [findingFilter, setFindingFilter] = useState({ severity: 'All', status: 'All', category: 'All' });
  const [draftComment, setDraftComment] = useState('');
  const [quotedText, setQuotedText] = useState('');
  const [feedback, setFeedback] = useState('');

  async function load() {
    const [s, f, t] = await Promise.all([getRunSections(params.id), getRunFindings(params.id), getDocComments(params.id)]);
    setSections(s);
    setFindings(f);
    setThreads(t);
    if (!selectedSection && s[0]) setSelectedSection(s[0].section_title);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  const selected = useMemo(() => sections.find((s) => s.section_title === selectedSection), [sections, selectedSection]);
  const unresolvedCount = useMemo(() => findings.filter((f) => f.status === 'Open').length, [findings]);

  const visibleFindings = useMemo(
    () =>
      findings.filter(
        (f) =>
          (findingFilter.severity === 'All' || f.severity === findingFilter.severity) &&
          (findingFilter.status === 'All' || f.status === findingFilter.status) &&
          (findingFilter.category === 'All' || f.category === findingFilter.category) &&
          (!selectedSection || f.affected_sections.includes(selectedSection)),
      ),
    [findings, findingFilter, selectedSection],
  );

  async function confirmAction(label: string, action: () => Promise<void>) {
    if (!confirm(label)) return;
    await action();
    await load();
    setFeedback(`${label} complete.`);
  }

  async function onThread(request_revision: boolean, section_approved: boolean) {
    if (!draftComment.trim() || !selected) return;
    await createDocComment(params.id, {
      body: draftComment,
      author: 'reviewer-ui',
      quoted_text: quotedText,
      evidence_refs: selected.evidence_refs || [],
      section_title: selected.section_title,
      request_revision,
      section_approved,
    });
    setDraftComment('');
    setQuotedText('');
    await load();
  }

  return (
    <div className="stack">
      <Card title={`Document Review Workspace · Run #${params.id}`} subtitle="AI-generated draft content is shown in the center panel until human approval is applied.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-neutral">Sections: {sections.length}</span>
          <span className="badge badge-warn">Unresolved findings: {unresolvedCount}</span>
          {selected?.accepted_by_human ? <span className="badge badge-success">Section approved by human</span> : <span className="badge badge-warn">AI draft awaiting approval</span>}
          {selected?.locked_by_human ? <span className="badge badge-critical">Locked section</span> : null}
          {selected?.missing_evidence_flag ? <span className="badge badge-critical">Insufficient evidence flagged</span> : null}
        </div>
        {feedback ? <p className="muted" style={{ marginTop: 8 }}>{feedback}</p> : null}
      </Card>

      <div className="grid3">
        <Card title="Sections" subtitle="Left panel: navigate sections quickly.">
          <div className="panel stack">
            {sections.map((s) => (
              <button key={s.id} className={s.section_title === selectedSection ? '' : 'secondary'} onClick={() => setSelectedSection(s.section_title)}>
                {s.section_title}
                {s.locked_by_human ? ' 🔒' : ''}
                {s.accepted_by_human ? ' ✅' : ''}
              </button>
            ))}
          </div>
        </Card>

        <Card title={selectedSection || 'Draft content'} subtitle="Center panel: highlighted section text and primary section actions.">
          <div className="panel stack">
            {!selected ? <p className="muted">Select a section from the left.</p> : null}
            {selected ? (
              <>
                <p className="muted">Status: {selected.accepted_by_human ? 'Human approved' : 'AI-generated draft'} · {selected.locked_by_human ? 'Locked' : 'Unlocked'}</p>
                <p style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 10, borderRadius: 8 }}>{selected.generated_text}</p>
                <p className="muted">Evidence links: {(selected.evidence_refs || []).join(', ') || 'None'} </p>
                <p className="muted">Revision rationale: {selected.rationale || 'No rationale captured.'}</p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => confirmAction('Approve this section?', async () => { await updateSectionAcceptance(params.id, selected.id, true); })}>Approve section</button>
                  <button onClick={() => confirmAction('Lock this section?', async () => { await updateSectionLock(params.id, selected.id, true); })}>Lock section</button>
                  <button className="secondary" onClick={() => confirmAction('Unlock this section?', async () => { await updateSectionLock(params.id, selected.id, false); })}>Unlock section</button>
                  <button className="secondary" onClick={() => confirmAction('Mark insufficient evidence?', async () => { await updateMissingEvidence(params.id, selected.id, true); })}>Mark insufficient evidence</button>
                </div>

                <textarea rows={3} value={quotedText} onChange={(e) => setQuotedText(e.target.value)} placeholder="Highlight/quote text from this section" />
                <textarea rows={3} value={draftComment} onChange={(e) => setDraftComment(e.target.value)} placeholder="Attach review comment + evidence references" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onThread(true, false)}>Request revisions</button>
                  <button className="secondary" onClick={() => onThread(false, true)}>Mark section approved</button>
                </div>
              </>
            ) : null}
          </div>
        </Card>

        <Card title="Findings, evidence, and threads" subtitle="Right panel: filter findings, jump to sections, resolve comment threads.">
          <div className="panel stack">
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={findingFilter.severity} onChange={(e) => setFindingFilter({ ...findingFilter, severity: e.target.value })}>
                <option>All</option><option>Critical</option><option>Major</option><option>Minor</option>
              </select>
              <select value={findingFilter.status} onChange={(e) => setFindingFilter({ ...findingFilter, status: e.target.value })}>
                <option>All</option><option>Open</option><option>Resolved</option><option>Dismissed</option>
              </select>
            </div>
            <select value={findingFilter.category} onChange={(e) => setFindingFilter({ ...findingFilter, category: e.target.value })}>
              <option>All</option>
              {[...new Set(findings.map((f) => f.category))].map((cat) => <option key={cat}>{cat}</option>)}
            </select>

            {visibleFindings.length === 0 ? <p className="muted">No findings match current filters.</p> : null}
            {visibleFindings.map((f) => (
              <div key={f.id} className="list-row" onClick={() => setSelectedSection(f.affected_sections[0] || selectedSection)}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <SeverityBadge value={f.severity} />
                  <span className="badge badge-neutral">{f.category}</span>
                  <span className={f.status === 'Open' ? 'badge badge-critical' : 'badge badge-success'}>{f.status}</span>
                </div>
                <p>{f.issue_summary || f.rationale}</p>
                <p className="muted">Evidence: {(f.linked_evidence || []).join(', ') || 'None'}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="secondary" onClick={(e) => { e.stopPropagation(); updateFindingDecision(params.id, f.id, 'accepted').then(load); }}>Accept revision</button>
                  <button className="secondary" onClick={(e) => { e.stopPropagation(); updateFindingDecision(params.id, f.id, 'rejected').then(load); }}>Reject revision</button>
                </div>
              </div>
            ))}

            <button className="secondary" onClick={() => syncDocComments(params.id).then(load)}>Sync Google Docs comments</button>

            <h3>Comment threads</h3>
            {threads.length === 0 ? <p className="muted">No comment threads yet.</p> : null}
            {threads.map((t) => (
              <div key={t.id} className="list-row">
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={t.status === 'resolved' ? 'badge badge-success' : 'badge badge-warn'}>{t.status}</span>
                  <span className="muted">Section: {t.section_title || 'n/a'}</span>
                </div>
                <p>{t.body}</p>
                <p className="muted">Quoted: {t.quoted_text || 'None'}</p>
                <button className="secondary" onClick={() => confirmAction('Resolve this comment thread?', async () => { await resolveDocComment(params.id, t.id, 'Resolved from review workspace'); })}>Resolve thread</button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
