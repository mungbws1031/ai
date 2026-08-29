'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

/* ----------------------------- Mock data ----------------------------- */

const project = {
  id: 1,
  slug: 'astranova-ivdr-demo',
  name: 'AstraNova IVDR Demo',
  description:
    'IVDR Class C performance evaluation for AstraNova rapid antigen panel.',
  owner: 'Maya Chen',
  created_at: '2026-01-14',
  updated_at: '2026-05-02T09:42:00Z',
  status: 'Active',
  api_namespace: 'proj_astranova_ivdr_demo',
  last_sync_relative: '4m ago',
};

type Slot = {
  key: string;
  label: string;
  folder_id: string | null;
  mapped: boolean;
};

const driveMapping = {
  root: '/Projects/AstraNova',
  root_id: '1aB7QKv9zMx9K',
  structure_valid: false,
  slots: [
    { key: 'root', label: 'Root', folder_id: '1aB7QKv9zMx9K', mapped: true },
    { key: 'templates', label: 'Templates', folder_id: '1tMfPq4Lp2Lp', mapped: true },
    { key: 'regulations', label: 'Regulations', folder_id: '1rE2Yh8Mm4Q1', mapped: true },
    { key: 'sops', label: 'SOPs', folder_id: '1sOvNb6Qn7R2', mapped: true },
    { key: 'prior_docs', label: 'Prior documents', folder_id: '1pDk4Wj9j3S3', mapped: true },
    { key: 'evidence', label: 'Evidence', folder_id: '1eVc3Tk2k5T4', mapped: true },
    { key: 'outputs_drafts', label: 'Outputs / Drafts', folder_id: '1oD9Pn7Hh8U5', mapped: true },
    { key: 'outputs_reviews', label: 'Outputs / Reviews', folder_id: null, mapped: false },
    { key: 'outputs_approved', label: 'Outputs / Approved', folder_id: '1oA5Vc1Wg1W6', mapped: true },
  ] satisfies Slot[],
};

const templates = [
  { id: 't_pep', name: 'PEP_Template.docx', folder: '/Projects/AstraNova/Templates', updated: '2026-04-21', version: 'v3.2', isDefault: true },
  { id: 't_pms', name: 'PMS_Plan_Template.docx', folder: '/Projects/AstraNova/Templates', updated: '2026-03-08', version: 'v1.4', isDefault: false },
  { id: 't_cer', name: 'CER_Template.docx', folder: '/Projects/AstraNova/Templates', updated: '2026-02-19', version: 'v2.0', isDefault: false },
  { id: 't_risk', name: 'Risk_Management_Template.docx', folder: '/Projects/AstraNova/Templates', updated: '2026-01-30', version: 'v1.1', isDefault: false },
];

const sources = [
  { id: 's1', name: 'IVDR_2017_746.pdf', folder: 'Regulations', type: 'pdf', size: '3.2 MB' },
  { id: 's2', name: 'MDCG_2022-2.pdf', folder: 'Regulations', type: 'pdf', size: '1.1 MB' },
  { id: 's3', name: 'MDCG_2022-9_Performance_Evaluation.pdf', folder: 'Regulations', type: 'pdf', size: '0.9 MB' },
  { id: 's4', name: 'SOP_Document_Control_v4.pdf', folder: 'SOPs', type: 'pdf', size: '0.5 MB' },
  { id: 's5', name: 'SOP_Risk_Mgmt_v2.pdf', folder: 'SOPs', type: 'pdf', size: '0.6 MB' },
  { id: 's6', name: 'SOP_Clinical_Performance.pdf', folder: 'SOPs', type: 'pdf', size: '0.7 MB' },
  { id: 's7', name: 'Clinical_Study_AN-22.pdf', folder: 'Evidence', type: 'pdf', size: '4.8 MB' },
  { id: 's8', name: 'Lab_Validation_Run_07.xlsx', folder: 'Evidence', type: 'xlsx', size: '1.4 MB' },
  { id: 's9', name: 'Stability_Study_2025.pdf', folder: 'Evidence', type: 'pdf', size: '2.1 MB' },
  { id: 's10', name: 'Analytical_Specificity_Report.docx', folder: 'Evidence', type: 'docx', size: '0.8 MB' },
  { id: 's11', name: 'Predicate_PEP_2024.docx', folder: 'Prior documents', type: 'docx', size: '1.2 MB' },
  { id: 's12', name: 'Prior_PMS_Annual_Report_2025.docx', folder: 'Prior documents', type: 'docx', size: '0.9 MB' },
];

type RunState =
  | 'NEW'
  | 'DRAFTING_IN_PROGRESS'
  | 'DRAFT_GENERATED'
  | 'REVIEW_IN_PROGRESS'
  | 'REVIEW_DONE'
  | 'REVISION_IN_PROGRESS'
  | 'REVISED'
  | 'APPROVED';

const runs: {
  id: number;
  document_type: string;
  template_name: string;
  state: RunState;
  current_stage: string;
  stage_pct: number;
  current_version: string;
  updated_at_relative: string;
}[] = [
  { id: 142, document_type: 'Performance Evaluation Plan', template_name: 'PEP_Template.docx', state: 'REVIEW_IN_PROGRESS', current_stage: 'Reviewer feedback', stage_pct: 65, current_version: 'v0.4', updated_at_relative: '2h ago' },
  { id: 138, document_type: 'PMS Plan', template_name: 'PMS_Plan_Template.docx', state: 'APPROVED', current_stage: 'Approved', stage_pct: 100, current_version: 'v1.0', updated_at_relative: '3d ago' },
  { id: 131, document_type: 'CER', template_name: 'CER_Template.docx', state: 'DRAFTING_IN_PROGRESS', current_stage: 'Drafting sections 4–6', stage_pct: 40, current_version: 'v0.2', updated_at_relative: '4d ago' },
  { id: 127, document_type: 'Risk Management File', template_name: 'Risk_Management_Template.docx', state: 'DRAFT_GENERATED', current_stage: 'Awaiting review', stage_pct: 50, current_version: 'v0.3', updated_at_relative: '5d ago' },
  { id: 119, document_type: 'PEP', template_name: 'PEP_Template.docx', state: 'REVISION_IN_PROGRESS', current_stage: 'Revising findings', stage_pct: 75, current_version: 'v0.6', updated_at_relative: '1w ago' },
  { id: 115, document_type: 'Performance Evaluation Report', template_name: 'PEP_Template.docx', state: 'REVISED', current_stage: 'Pending approval', stage_pct: 90, current_version: 'v1.1', updated_at_relative: '1w ago' },
  { id: 108, document_type: 'Analytical Performance Report', template_name: 'CER_Template.docx', state: 'NEW', current_stage: 'Source syncing', stage_pct: 5, current_version: 'v0.1', updated_at_relative: '2w ago' },
  { id: 104, document_type: 'Stability Summary', template_name: 'CER_Template.docx', state: 'APPROVED', current_stage: 'Approved', stage_pct: 100, current_version: 'v1.0', updated_at_relative: '3w ago' },
  { id: 99, document_type: 'PMS Plan', template_name: 'PMS_Plan_Template.docx', state: 'REVIEW_DONE', current_stage: 'Reviewer signed off', stage_pct: 85, current_version: 'v0.9', updated_at_relative: '1mo ago' },
  { id: 91, document_type: 'CER', template_name: 'CER_Template.docx', state: 'DRAFT_GENERATED', current_stage: 'Awaiting review', stage_pct: 50, current_version: 'v0.2', updated_at_relative: '1mo ago' },
];

const members = [
  { name: 'Maya Chen', email: 'maya@astranova.io', role: 'Owner', last_active: '2m ago', initials: 'MC', color: 'bg-violet-500/20 text-violet-300' },
  { name: 'Tomás Rivera', email: 'tomas@astranova.io', role: 'Reviewer', last_active: '1h ago', initials: 'TR', color: 'bg-emerald-500/20 text-emerald-300' },
  { name: 'Hina Park', email: 'hina@astranova.io', role: 'Editor', last_active: '3h ago', initials: 'HP', color: 'bg-amber-500/20 text-amber-300' },
  { name: 'Otto Bauer', email: 'otto@external-ra.eu', role: 'Auditor', last_active: '2d ago', initials: 'OB', color: 'bg-sky-500/20 text-sky-300' },
];

const activity = [
  { id: 1, actor: 'Maya Chen', verb: 'approved', target: 'PMS Plan v1.0', when: '2h ago', tone: 'success' },
  { id: 2, actor: 'System', verb: 'synced', target: 'Drive index (47 files)', when: '4m ago', tone: 'neutral' },
  { id: 3, actor: 'Tomás Rivera', verb: 'left 3 review comments on', target: 'PEP v0.4', when: '5h ago', tone: 'neutral' },
  { id: 4, actor: 'Hina Park', verb: 'updated template', target: 'PEP_Template.docx → v3.2', when: 'yesterday', tone: 'neutral' },
  { id: 5, actor: 'System', verb: 'flagged', target: 'Outputs / Reviews folder missing', when: '2d ago', tone: 'warn' },
  { id: 6, actor: 'Otto Bauer', verb: 'opened audit on', target: 'Run #119 PEP revision', when: '3d ago', tone: 'neutral' },
  { id: 7, actor: 'Maya Chen', verb: 'invited', target: 'Otto Bauer as Auditor', when: '4d ago', tone: 'neutral' },
  { id: 8, actor: 'System', verb: 'created project', target: 'AstraNova IVDR Demo', when: 'Jan 14', tone: 'neutral' },
];

const STATE_PILL: Record<RunState, 'success' | 'warn' | 'neutral' | 'progress'> = {
  APPROVED: 'success',
  REVIEW_DONE: 'success',
  REVISED: 'success',
  REVIEW_IN_PROGRESS: 'warn',
  REVISION_IN_PROGRESS: 'warn',
  DRAFTING_IN_PROGRESS: 'progress',
  DRAFT_GENERATED: 'neutral',
  NEW: 'neutral',
};

const STATE_LABEL: Record<RunState, string> = {
  APPROVED: 'Approved',
  REVIEW_DONE: 'Review done',
  REVISED: 'Revised',
  REVIEW_IN_PROGRESS: 'In review',
  REVISION_IN_PROGRESS: 'Revising',
  DRAFTING_IN_PROGRESS: 'Drafting',
  DRAFT_GENERATED: 'Draft ready',
  NEW: 'New',
};

/* ------------------------------ Icons ------------------------------ */

type IconProps = { className?: string };
const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
    {children}
  </svg>
);
const ChevronRight = (p: IconProps) => <Svg className={p.className}><polyline points="9 18 15 12 9 6" /></Svg>;
const Folder = (p: IconProps) => <Svg className={p.className}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>;
const FileText = (p: IconProps) => <Svg className={p.className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="14" y2="17" /></Svg>;
const Sparkles = (p: IconProps) => <Svg className={p.className}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M19 16l.7 2L21.5 19 19.5 19.7 19 22 18.3 19.7 16.5 19 18.3 18z" /></Svg>;
const Plus = (p: IconProps) => <Svg className={p.className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>;
const Search = (p: IconProps) => <Svg className={p.className}><circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.5" y2="16.5" /></Svg>;
const ExternalLink = (p: IconProps) => <Svg className={p.className}><path d="M15 3h6v6" /><path d="M10 14L21 3" /><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" /></Svg>;
const RefreshCw = (p: IconProps) => <Svg className={p.className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.5 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0 0 20.5 15" /></Svg>;
const Users = (p: IconProps) => <Svg className={p.className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>;
const MoreHorizontal = (p: IconProps) => <Svg className={p.className}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Svg>;
const Copy = (p: IconProps) => <Svg className={p.className}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>;
const Settings = (p: IconProps) => <Svg className={p.className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>;
const Activity = (p: IconProps) => <Svg className={p.className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>;
const Link2 = (p: IconProps) => <Svg className={p.className}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></Svg>;
const Webhook = (p: IconProps) => <Svg className={p.className}><path d="M18 16.98h-5.99c-1.66 0-3.01-1.34-3.01-3 0-1.66 1.35-3 3.01-3 .8 0 1.56.31 2.13.88l1.85-3.09" /><path d="M14 6.99c0-1.66-1.34-3-3-3a3 3 0 0 0-3 3c0 .8.31 1.56.88 2.13L4 17l3.4-2.6" /><path d="M9 18a3 3 0 0 0 5 2.13l3-5.13" /></Svg>;

/* --------------------------- Helper UI bits --------------------------- */

const PILL_BASE = 'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border';
const PILL_TONES: Record<string, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warn: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  progress: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
};

function Pill({ tone = 'neutral', children }: { tone?: keyof typeof PILL_TONES | string; children: React.ReactNode }) {
  return <span className={`${PILL_BASE} ${PILL_TONES[tone] ?? PILL_TONES.neutral}`}>{children}</span>;
}

function Dot({ tone = 'neutral' }: { tone?: 'success' | 'warn' | 'danger' | 'neutral' }) {
  const cls = tone === 'success' ? 'bg-emerald-400' : tone === 'warn' ? 'bg-amber-400' : tone === 'danger' ? 'bg-red-400' : 'bg-zinc-500';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls}`} />;
}

const PANEL = 'bg-[#111113] border border-zinc-800/80 rounded-xl';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors';
const BTN_SECONDARY = 'inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm px-3 py-1.5 rounded-md transition-colors';
const BTN_GHOST = 'inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 text-sm px-2 py-1 rounded-md transition-colors';
const INPUT = 'bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60';

/* ------------------------------- Page ------------------------------- */

type TabId = 'overview' | 'drive' | 'templates' | 'sources' | 'workflows' | 'members' | 'activity';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'drive', label: 'Drive Mapping' },
  { id: 'templates', label: 'Templates' },
  { id: 'sources', label: 'Sources' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'members', label: 'Members' },
  { id: 'activity', label: 'Activity' },
];

const STATE_FILTERS: { id: 'all' | RunState; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REVIEW_IN_PROGRESS', label: 'In review' },
  { id: 'DRAFTING_IN_PROGRESS', label: 'Drafting' },
  { id: 'REVISION_IN_PROGRESS', label: 'Revising' },
];

export default function ProjectSettingsMockup({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<TabId>('overview');
  const [stateFilter, setStateFilter] = useState<'all' | RunState>('all');
  const [sourceQuery, setSourceQuery] = useState('');

  const filteredRuns = useMemo(
    () => (stateFilter === 'all' ? runs : runs.filter((r) => r.state === stateFilter)),
    [stateFilter],
  );
  const filteredSources = useMemo(() => {
    const q = sourceQuery.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) => s.name.toLowerCase().includes(q));
  }, [sourceQuery]);
  const sourcesByFolder = useMemo(() => {
    const map = new Map<string, typeof sources>();
    filteredSources.forEach((s) => {
      const arr = map.get(s.folder) ?? [];
      arr.push(s);
      map.set(s.folder, arr);
    });
    return Array.from(map.entries());
  }, [filteredSources]);

  const mappedCount = driveMapping.slots.filter((s) => s.mapped).length;
  const totalSlots = driveMapping.slots.length;

  return (
    <div className="-m-4 min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="px-6 pt-6 pb-10 max-w-[1280px] mx-auto">
        {/* Breadcrumb + Header */}
        <nav className="flex items-center gap-1 text-xs text-zinc-500 mb-4">
          <Link href="/dashboard" className="hover:text-zinc-300">Projects</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/projects/${params.id}`} className="hover:text-zinc-300">{project.name}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-300">Settings</span>
        </nav>

        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{project.name}</h1>
              <Pill tone="success"><Dot tone="success" /> {project.status}</Pill>
            </div>
            <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">{project.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500 mr-1">Last synced {project.last_sync_relative}</span>
            <button className={BTN_SECONDARY}><RefreshCw className="w-3.5 h-3.5" /> Sync Drive</button>
            <button className={BTN_SECONDARY}><ExternalLink className="w-3.5 h-3.5" /> Open in Drive</button>
            <button className={BTN_PRIMARY}><Sparkles className="w-3.5 h-3.5" /> New Workflow</button>
          </div>
        </header>

        {/* Meta strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetaCell label="Project ID" value={`#${project.id}`} mono />
          <MetaCell label="Created" value={project.created_at} />
          <MetaCell label="Owner" value={project.owner} />
          <MetaCell label="Drive root" value={driveMapping.root} mono />
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800/80 mb-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-3 py-2.5 text-sm transition-colors whitespace-nowrap ${
                    active ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                  {active ? <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-violet-500 rounded-full" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panels */}
        {tab === 'overview' && (
          <OverviewPanel mappedCount={mappedCount} totalSlots={totalSlots} />
        )}
        {tab === 'drive' && <DrivePanel />}
        {tab === 'templates' && <TemplatesPanel />}
        {tab === 'sources' && (
          <SourcesPanel
            query={sourceQuery}
            setQuery={setSourceQuery}
            grouped={sourcesByFolder}
            total={filteredSources.length}
          />
        )}
        {tab === 'workflows' && (
          <WorkflowsPanel filter={stateFilter} setFilter={setStateFilter} runs={filteredRuns} />
        )}
        {tab === 'members' && <MembersPanel />}
        {tab === 'activity' && <ActivityPanel />}

        <footer className="mt-10 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-600">
          <span>build 0.7.3 · ui-mock</span>
          <span className="font-mono">{project.api_namespace}</span>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------ Sub bits ------------------------------ */

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={`${PANEL} px-4 py-3`}>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-sm text-zinc-100 truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</div>
    </div>
  );
}

function PanelHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {subtitle ? <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

function OverviewPanel({ mappedCount, totalSlots }: { mappedCount: number; totalSlots: number }) {
  const healthTone: 'success' | 'warn' = driveMapping.structure_valid ? 'success' : 'warn';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <section className={PANEL}>
          <PanelHeader
            title="Drive structure health"
            subtitle="Required folder slots discovered in the mapped Drive root."
            right={
              <div className="flex items-center gap-2">
                <Pill tone={healthTone}>
                  <Dot tone={healthTone} /> {mappedCount}/{totalSlots} mapped
                </Pill>
                <button className={BTN_GHOST}><RefreshCw className="w-3.5 h-3.5" /> Re-validate</button>
              </div>
            }
          />
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-2">
            {driveMapping.slots.map((s) => (
              <div key={s.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30">
                <Folder className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-zinc-200 truncate">{s.label}</div>
                  <div className="text-[11px] font-mono text-zinc-500 truncate">
                    {s.folder_id ?? '—'}
                  </div>
                </div>
                {s.mapped ? <Pill tone="success"><Dot tone="success" /> Mapped</Pill> : <Pill tone="warn"><Dot tone="warn" /> Missing</Pill>}
              </div>
            ))}
          </div>
        </section>

        <section className={PANEL}>
          <PanelHeader
            title="Recent workflow runs"
            subtitle="Latest activity across documents in this project."
            right={<Link href={`/projects/${project.id}`} className={BTN_GHOST}>View all <ChevronRight className="w-3.5 h-3.5" /></Link>}
          />
          <div className="px-2 pb-3">
            <div className="hidden md:grid grid-cols-12 gap-3 px-3 pb-2 text-[11px] uppercase tracking-wider text-zinc-500">
              <div className="col-span-1">Run</div>
              <div className="col-span-4">Document</div>
              <div className="col-span-4">Stage</div>
              <div className="col-span-2">State</div>
              <div className="col-span-1 text-right">Updated</div>
            </div>
            {runs.slice(0, 5).map((r) => (
              <RunRow key={r.id} run={r} />
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className={PANEL}>
          <PanelHeader title="Quick actions" />
          <div className="px-3 pb-4 space-y-1">
            <QuickAction icon={<Link2 className="w-4 h-4" />} label="Connect new folder" />
            <QuickAction icon={<FileText className="w-4 h-4" />} label="Add template" />
            <QuickAction icon={<Users className="w-4 h-4" />} label="Invite member" />
            <QuickAction icon={<Webhook className="w-4 h-4" />} label="Configure webhooks" />
          </div>
        </section>

        <section className={PANEL}>
          <PanelHeader title="Project keys" subtitle="Internal identifiers used by API and audit logs." />
          <div className="px-5 pb-5 space-y-2">
            <KeyRow label="Project slug" value={project.slug} />
            <KeyRow label="API namespace" value={project.api_namespace} />
          </div>
        </section>

        <section className={`${PANEL} border-red-900/40 bg-red-950/10`}>
          <PanelHeader
            title="Danger zone"
            subtitle="Irreversible actions. Approval logs are preserved."
          />
          <div className="px-5 pb-5 flex flex-col gap-2">
            <button className="text-sm text-amber-400 hover:text-amber-300 border border-amber-900/40 hover:border-amber-700/60 bg-amber-950/20 rounded-md px-3 py-1.5 text-left">
              Archive project
              <span className="block text-xs text-zinc-500 font-normal mt-0.5">Read-only mode. Workflows pause.</span>
            </button>
            <button className="text-sm text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700/60 bg-red-950/20 rounded-md px-3 py-1.5 text-left">
              Delete project
              <span className="block text-xs text-zinc-500 font-normal mt-0.5">Removes Drive mappings, runs, and findings.</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors">
      <span className="flex items-center gap-2.5 text-zinc-400 group-hover:text-zinc-200">
        <span className="text-zinc-500">{icon}</span>
        <span className="text-zinc-200">{label}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-zinc-600" />
    </button>
  );
}

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="text-xs font-mono text-zinc-200 truncate">{value}</div>
      </div>
      <button className={BTN_GHOST} aria-label={`Copy ${label}`}>
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function RunRow({ run }: { run: typeof runs[number] }) {
  const tone = STATE_PILL[run.state];
  return (
    <div className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-zinc-900/50 transition-colors">
      <div className="col-span-12 md:col-span-1 text-sm font-mono text-zinc-400">#{run.id}</div>
      <div className="col-span-12 md:col-span-4 min-w-0">
        <div className="text-sm text-zinc-100 truncate">{run.document_type}</div>
        <div className="text-xs text-zinc-500 truncate">{run.template_name} · {run.current_version}</div>
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="text-xs text-zinc-400 mb-1.5 truncate">{run.current_stage}</div>
        <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${run.stage_pct}%` }} />
        </div>
      </div>
      <div className="col-span-6 md:col-span-2"><Pill tone={tone}>{STATE_LABEL[run.state]}</Pill></div>
      <div className="col-span-6 md:col-span-1 text-xs text-zinc-500 md:text-right">{run.updated_at_relative}</div>
    </div>
  );
}

function DrivePanel() {
  return (
    <section className={PANEL}>
      <PanelHeader
        title="Folder mapping"
        subtitle="Each slot must point to a Drive folder for the workflow to run."
        right={
          <div className="flex items-center gap-2">
            <button className={BTN_SECONDARY}><RefreshCw className="w-3.5 h-3.5" /> Re-validate</button>
            <button className={BTN_PRIMARY}><Plus className="w-3.5 h-3.5" /> Add slot</button>
          </div>
        }
      />
      <div className="px-2 pb-2">
        <div className="hidden md:grid grid-cols-12 gap-3 px-3 pb-2 text-[11px] uppercase tracking-wider text-zinc-500">
          <div className="col-span-3">Slot</div>
          <div className="col-span-4">Folder</div>
          <div className="col-span-3">Drive ID</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {driveMapping.slots.map((s) => (
          <div key={s.key} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-zinc-900/50 transition-colors">
            <div className="col-span-12 md:col-span-3 flex items-center gap-2">
              <Folder className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-100">{s.label}</span>
            </div>
            <div className="col-span-12 md:col-span-4 text-sm text-zinc-400 truncate">
              {s.mapped ? `${driveMapping.root}/${s.label}` : <span className="text-amber-400">Not mapped</span>}
            </div>
            <div className="col-span-12 md:col-span-3 text-xs font-mono text-zinc-500 truncate">{s.folder_id ?? '—'}</div>
            <div className="col-span-6 md:col-span-1">
              {s.mapped ? <Pill tone="success"><Dot tone="success" /> OK</Pill> : <Pill tone="warn"><Dot tone="warn" /> Missing</Pill>}
            </div>
            <div className="col-span-6 md:col-span-1 flex justify-end gap-1">
              <button className={BTN_GHOST} aria-label="Re-link"><Link2 className="w-3.5 h-3.5" /></button>
              <button className={BTN_GHOST} aria-label="Open"><ExternalLink className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="mx-5 mb-5 mt-2 px-4 py-3 rounded-lg border border-violet-900/40 bg-violet-950/20 text-xs text-zinc-300">
        <div className="font-medium text-violet-300 mb-1">Expected structure</div>
        Required folders: <span className="font-mono">templates · regulations · sops · prior_docs · evidence · outputs/&#123;drafts,reviews,approved&#125;</span>. Re-link any missing slot to enable workflow runs against this project.
      </div>
    </section>
  );
}

function TemplatesPanel() {
  return (
    <section className={PANEL}>
      <PanelHeader
        title="Template inventory"
        subtitle="Indexed Drive templates. One can be set as project default."
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input className={`${INPUT} pl-7 w-64`} placeholder="Search templates" />
            </div>
            <button className={BTN_PRIMARY}><Plus className="w-3.5 h-3.5" /> Add template</button>
          </div>
        }
      />
      <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">{t.name}</div>
                  <div className="text-xs text-zinc-500 truncate">{t.folder}</div>
                </div>
              </div>
              <button className={BTN_GHOST} aria-label="More"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Pill tone="neutral">{t.version}</Pill>
                {t.isDefault ? <Pill tone="progress">Default</Pill> : null}
              </div>
              <span className="text-zinc-500">Updated {t.updated}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SourcesPanel({
  query,
  setQuery,
  grouped,
  total,
}: {
  query: string;
  setQuery: (v: string) => void;
  grouped: [string, typeof sources][];
  total: number;
}) {
  return (
    <section className={PANEL}>
      <PanelHeader
        title="Indexed source files"
        subtitle={`${total} file${total === 1 ? '' : 's'} indexed across regulation, SOP, evidence, and prior-doc folders.`}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <select className={`${INPUT} pr-6`} defaultValue="all">
              <option value="all">All folders</option>
              <option>Regulations</option>
              <option>SOPs</option>
              <option>Evidence</option>
              <option>Prior documents</option>
            </select>
            <select className={`${INPUT} pr-6`} defaultValue="all">
              <option value="all">All types</option>
              <option>pdf</option>
              <option>docx</option>
              <option>xlsx</option>
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${INPUT} pl-7 w-56`}
                placeholder="Search files"
              />
            </div>
          </div>
        }
      />
      <div className="px-5 pb-5 space-y-4">
        {grouped.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">No files match your search.</p>
        ) : null}
        {grouped.map(([folder, files]) => (
          <div key={folder}>
            <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
              <Folder className="w-3.5 h-3.5" />
              {folder}
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-600">{files.length}</span>
            </div>
            <div className="rounded-lg border border-zinc-800/60 divide-y divide-zinc-800/60 overflow-hidden">
              {files.map((f) => (
                <div key={f.id} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 hover:bg-zinc-900/50 transition-colors">
                  <div className="col-span-12 md:col-span-7 flex items-center gap-2 min-w-0">
                    <FileTypeIcon type={f.type} />
                    <span className="text-sm text-zinc-100 truncate">{f.name}</span>
                  </div>
                  <div className="col-span-6 md:col-span-2"><Pill tone="neutral">{f.type}</Pill></div>
                  <div className="col-span-6 md:col-span-2 text-xs text-zinc-500">{f.size}</div>
                  <div className="col-span-12 md:col-span-1 flex md:justify-end">
                    <button className={BTN_GHOST}><ExternalLink className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  const tone = type === 'pdf' ? 'text-red-300 bg-red-500/10 border-red-500/20'
    : type === 'docx' ? 'text-sky-300 bg-sky-500/10 border-sky-500/20'
    : type === 'xlsx' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
    : 'text-zinc-300 bg-zinc-800 border-zinc-700';
  return (
    <div className={`w-7 h-7 rounded-md border flex items-center justify-center ${tone}`}>
      <FileText className="w-3.5 h-3.5" />
    </div>
  );
}

function WorkflowsPanel({
  filter,
  setFilter,
  runs: filtered,
}: {
  filter: 'all' | RunState;
  setFilter: (v: 'all' | RunState) => void;
  runs: typeof runs;
}) {
  return (
    <section className={PANEL}>
      <PanelHeader
        title="Workflow runs"
        subtitle="All runs in this project, filterable by state."
        right={<button className={BTN_PRIMARY}><Sparkles className="w-3.5 h-3.5" /> New Workflow</button>}
      />
      <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
        {STATE_FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                active
                  ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                  : 'bg-transparent text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <div className="px-2 pb-3">
        <div className="hidden md:grid grid-cols-12 gap-3 px-3 pb-2 text-[11px] uppercase tracking-wider text-zinc-500">
          <div className="col-span-1">Run</div>
          <div className="col-span-4">Document</div>
          <div className="col-span-4">Stage</div>
          <div className="col-span-2">State</div>
          <div className="col-span-1 text-right">Updated</div>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">No runs match this filter.</p>
        ) : null}
        {filtered.map((r) => <RunRow key={r.id} run={r} />)}
      </div>
    </section>
  );
}

function MembersPanel() {
  return (
    <section className={PANEL}>
      <PanelHeader
        title="Members & access"
        subtitle="People with access to this project. Roles are project-scoped."
        right={<button className={BTN_PRIMARY}><Plus className="w-3.5 h-3.5" /> Invite member</button>}
      />
      <div className="px-2 pb-3">
        <div className="hidden md:grid grid-cols-12 gap-3 px-3 pb-2 text-[11px] uppercase tracking-wider text-zinc-500">
          <div className="col-span-5">Person</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-3">Last active</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {members.map((m) => (
          <div key={m.email} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-zinc-900/50 transition-colors">
            <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${m.color}`}>
                {m.initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-zinc-100 truncate">{m.name}</div>
                <div className="text-xs text-zinc-500 truncate">{m.email}</div>
              </div>
            </div>
            <div className="col-span-6 md:col-span-3">
              <Pill tone={m.role === 'Owner' ? 'progress' : m.role === 'Auditor' ? 'warn' : 'neutral'}>{m.role}</Pill>
            </div>
            <div className="col-span-6 md:col-span-3 text-xs text-zinc-500">{m.last_active}</div>
            <div className="col-span-12 md:col-span-1 flex md:justify-end">
              <button className={BTN_GHOST}><MoreHorizontal className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel() {
  return (
    <section className={PANEL}>
      <PanelHeader
        title="Recent activity"
        subtitle="Project-level events from people, system syncs, and audit log."
      />
      <div className="px-5 pb-5">
        <ol className="relative border-l border-zinc-800/80 ml-2 pl-6 space-y-5">
          {activity.map((e) => {
            const dotCls =
              e.tone === 'success' ? 'bg-emerald-400 ring-emerald-500/30'
              : e.tone === 'warn' ? 'bg-amber-400 ring-amber-500/30'
              : 'bg-zinc-500 ring-zinc-600/30';
            return (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[31px] top-1.5 w-2 h-2 rounded-full ring-4 ${dotCls}`} />
                <div className="text-sm text-zinc-200">
                  <span className="font-medium text-zinc-100">{e.actor}</span>{' '}
                  <span className="text-zinc-400">{e.verb}</span>{' '}
                  <span className="text-zinc-100">{e.target}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> {e.when}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
