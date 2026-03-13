const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

export async function getProjects() {
  const res = await fetch(`${API}/projects`, { cache: 'no-store' });
  return res.json();
}

export async function createProject(payload: { name: string; description: string }) {
  const res = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, drive_mapping: { root: 'mock-root' } }),
  });
  return res.json();
}

export async function startWorkflow(payload: any) {
  const res = await fetch(`${API}/workflow-runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function rerunWorkflow(runId: string, payload: any) {
  const res = await fetch(`${API}/workflow-runs/${runId}/rerun`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getProjectRuns(projectId: string) {
  const res = await fetch(`${API}/projects/${projectId}/workflow-runs`, { cache: 'no-store' });
  return res.json();
}

export async function getRunTraceability(runId: string) {
  const res = await fetch(`${API}/workflow-runs/${runId}/traceability`, { cache: 'no-store' });
  return res.json();
}

export async function getAudit() {
  const res = await fetch(`${API}/audit-events`, { cache: 'no-store' });
  return res.json();
}
