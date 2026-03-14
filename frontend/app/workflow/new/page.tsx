'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDriveTemplates, getProjects, startWorkflow } from '@/lib/api';

const steps = ['Project', 'Document', 'Template', 'Sources', 'Instructions', 'Review & Run'];

export default function WorkflowWizard() {
  const [step, setStep] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [documentType, setDocumentType] = useState('Performance Evaluation Plan');
  const [templateName, setTemplateName] = useState('');
  const [sourceFolders, setSourceFolders] = useState<string[]>(['Sources/Regulations', 'Sources/Evidence']);
  const [customInstructions, setCustomInstructions] = useState('Use conservative wording and show evidence gaps.');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getProjects().then((items) => {
      setProjects(items);
      if (items[0]) {
        setProjectId(String(items[0].id));
      }
    });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    getDriveTemplates(Number(projectId)).then((rows) => {
      setTemplates(rows);
      if (rows[0] && !templateName) setTemplateName(`drive:${rows[0].id}`);
    });
  }, [projectId]);

  const validationError = useMemo(() => {
    if (!projectId) return 'Select a project.';
    if (!documentType) return 'Select a document type.';
    if (!templateName) return 'Select one template.';
    if (sourceFolders.length === 0) return 'Select at least one source folder.';
    return '';
  }, [projectId, documentType, templateName, sourceFolders]);

  function toggleFolder(value: string) {
    setSourceFolders((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  async function onStart() {
    setError('');
    setStatus('');
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      const result = await startWorkflow({
        project_id: Number(projectId),
        document_type: documentType,
        template_name: templateName,
        output_path: 'backend/data/outputs',
        source_folders: sourceFolders,
        custom_instructions: customInstructions,
      });
      setStatus(`Workflow run #${result.id} started. Current state: ${result.state}.`);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to start workflow.');
    }
  }

  return (
    <div className="card stack">
      <h2>New Workflow Wizard</h2>
      <p className="muted">Guided setup for non-technical RA users. Complete each step left-to-right.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {steps.map((label, index) => (
          <button key={label} className={index <= step ? '' : 'secondary'} onClick={() => setStep(index)}>
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 ? (
        <div className="stack">
          <label>Step 1: Select project</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.length === 0 ? <option value="">No projects available</option> : null}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="stack">
          <label>Step 2: Select document type</label>
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
            <option>Performance Evaluation Plan</option>
            <option>IFU draft</option>
            <option>Risk Summary</option>
          </select>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="stack">
          <label>Step 3: Select template from Drive</label>
          <select value={templateName} onChange={(e) => setTemplateName(e.target.value)}>
            {templates.length === 0 ? <option value="">No templates indexed. Use project settings to connect Drive.</option> : null}
            {templates.map((t) => (
              <option key={t.id} value={`drive:${t.id}`}>{t.name} (ID: {t.id})</option>
            ))}
          </select>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="stack">
          <label>Step 4: Select source folders</label>
          {['Sources/Regulations', 'Sources/SOPs', 'Sources/Evidence'].map((item) => (
            <label key={item} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={sourceFolders.includes(item)} onChange={() => toggleFolder(item)} style={{ width: 16 }} />
              {item}
            </label>
          ))}
          <p className="muted">Multiple folders can be selected.</p>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="stack">
          <label>Step 5: Optional custom instructions</label>
          <textarea rows={5} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} />
        </div>
      ) : null}

      {step === 5 ? (
        <div className="stack">
          <label>Step 6: Review and run</label>
          <div className="card">
            <p><strong>Project ID:</strong> {projectId || 'Not selected'}</p>
            <p><strong>Document:</strong> {documentType}</p>
            <p><strong>Template:</strong> {templateName || 'Not selected'}</p>
            <p><strong>Source folders:</strong> {sourceFolders.join(', ') || 'None selected'}</p>
          </div>
          <button onClick={onStart}>Start workflow run</button>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
        <button className="secondary" disabled={step === steps.length - 1} onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>Next</button>
      </div>

      {validationError ? <p className="badge badge-warn">{validationError}</p> : null}
      {error ? <p className="badge badge-critical">{error}</p> : null}
      {status ? <p className="badge badge-success">{status}</p> : null}
    </div>
  );
}
