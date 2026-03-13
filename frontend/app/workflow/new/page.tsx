'use client';

import { useEffect, useState } from 'react';
import { getProjects, startWorkflow } from '@/lib/api';

export default function WorkflowWizard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [documentType, setDocumentType] = useState('Performance Evaluation Plan');
  const [templateName, setTemplateName] = useState('PEP_Template.docx');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getProjects().then((items) => {
      setProjects(items);
      if (items.length > 0) setProjectId(String(items[0].id));
    });
  }, []);

  async function onStart() {
    if (!projectId) {
      setMessage('Please create/select a project first.');
      return;
    }
    const result = await startWorkflow({
      project_id: Number(projectId),
      document_type: documentType,
      template_name: templateName,
      output_path: `backend/data/outputs/${documentType.replace(/\s+/g, '_').toLowerCase()}_v1.docx`,
      source_folders: ['Sources/Regulations', 'Sources/Evidence'],
      custom_instructions: 'Use conservative wording and flag unresolved evidence gaps.',
    });
    setMessage(`Run #${result.id} created in state: ${result.state}`);
  }

  return (
    <div className="card">
      <h2>New Workflow Run Wizard</h2>
      <p>Project</p>
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        {projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
      </select>
      <p>Document type</p>
      <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
        <option>Performance Evaluation Plan</option>
        <option>IFU draft</option>
        <option>Risk Summary</option>
      </select>
      <p>Template</p>
      <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
      <div style={{ marginTop: 8 }}>
        <button onClick={onStart}>Start workflow</button>
      </div>
      <p>{message}</p>
    </div>
  );
}
