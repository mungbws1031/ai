import { DocCommentThread, Finding, Project, Section, WorkflowRun } from './types';

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getProjects(): Promise<Project[]> {
  return parse(await fetch(`${API}/projects`, { cache: 'no-store' }));
}

export async function createProject(payload: { name: string; description: string }): Promise<Project> {
  return parse(
    await fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, drive_mapping: { root: 'mock-root' } }),
    }),
  );
}

export async function connectDrive(projectId: number, folderId: string) {
  return parse<{ mapping: Record<string, any> }>(
    await fetch(`${API}/projects/${projectId}/drive/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    }),
  );
}

export async function getDriveIndex(projectId: number) {
  return parse<{ files: any[]; templates?: any[] }>(await fetch(`${API}/projects/${projectId}/drive/index`, { cache: 'no-store' }));
}

export async function getDriveTemplates(projectId: number) {
  return parse<{ id: string; name: string; folder: string }[]>(await fetch(`${API}/projects/${projectId}/drive/templates`, { cache: 'no-store' }));
}

export async function startWorkflow(payload: any): Promise<WorkflowRun> {
  return parse(
    await fetch(`${API}/workflow-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function getRun(runId: string): Promise<WorkflowRun> {
  return parse(await fetch(`${API}/workflow-runs/${runId}`, { cache: 'no-store' }));
}

export async function rerunWorkflow(runId: string, payload: any): Promise<WorkflowRun> {
  return parse(
    await fetch(`${API}/workflow-runs/${runId}/rerun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function getProjectRuns(projectId: string): Promise<WorkflowRun[]> {
  return parse(await fetch(`${API}/projects/${projectId}/workflow-runs`, { cache: 'no-store' }));
}

export async function getRunSections(runId: string): Promise<Section[]> {
  return parse(await fetch(`${API}/workflow-runs/${runId}/sections`, { cache: 'no-store' }));
}

export async function getRunFindings(runId: string): Promise<Finding[]> {
  return parse(await fetch(`${API}/workflow-runs/${runId}/findings`, { cache: 'no-store' }));
}

export async function getRunTimeline(runId: string): Promise<any[]> {
  return parse(await fetch(`${API}/workflow-runs/${runId}/timeline`, { cache: 'no-store' }));
}

export async function getRunVersions(runId: string): Promise<any[]> {
  return parse(await fetch(`${API}/workflow-runs/${runId}/versions`, { cache: 'no-store' }));
}

export async function getRunRevisionSummaries(runId: string): Promise<any[]> {
  return parse(await fetch(`${API}/workflow-runs/${runId}/revision-summaries`, { cache: 'no-store' }));
}

export async function updateDecision(runId: string, decision: string) {
  return parse(
    await fetch(`${API}/workflow-runs/${runId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-actor': 'RA Manager' },
      body: JSON.stringify({ decision, reason: 'Manual decision from UI' }),
    }),
  );
}

export async function updateSectionAcceptance(runId: string, sectionId: number, accepted: boolean) {
  return parse(
    await fetch(`${API}/workflow-runs/${runId}/sections/${sectionId}/acceptance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted }),
    }),
  );
}

export async function updateSectionLock(runId: string, sectionId: number, locked: boolean) {
  return parse(
    await fetch(`${API}/workflow-runs/${runId}/sections/${sectionId}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked }),
    }),
  );
}

export async function updateMissingEvidence(runId: string, sectionId: number, missing_evidence: boolean) {
  return parse(
    await fetch(`${API}/workflow-runs/${runId}/sections/${sectionId}/missing-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missing_evidence }),
    }),
  );
}

export async function updateFindingDecision(runId: string, findingId: number, reviewer_decision: string) {
  return parse(
    await fetch(`${API}/workflow-runs/${runId}/findings/${findingId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer_decision, resolution_note: `Set to ${reviewer_decision}` }),
    }),
  );
}

export async function getRunTraceability(runId: string) {
  return parse(await fetch(`${API}/workflow-runs/${runId}/traceability`, { cache: 'no-store' }));
}

export async function getAudit(): Promise<any[]> {
  return parse<any[]>(await fetch(`${API}/audit-events`, { cache: 'no-store' }));
}

export async function getDocComments(runId: string): Promise<DocCommentThread[]> {
  return parse(await fetch(`${API}/workflow-runs/${runId}/doc-comments`, { cache: 'no-store' }));
}

export async function createDocComment(runId: string, payload: any): Promise<DocCommentThread> {
  return parse(
    await fetch(`${API}/workflow-runs/${runId}/doc-comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function syncDocComments(runId: string): Promise<DocCommentThread[]> {
  return parse(await fetch(`${API}/workflow-runs/${runId}/doc-comments/sync`, { method: 'POST' }));
}

export async function resolveDocComment(runId: string, threadId: number, resolution_note: string): Promise<DocCommentThread> {
  return parse(
    await fetch(`${API}/workflow-runs/${runId}/doc-comments/${threadId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_note }),
    }),
  );
}
