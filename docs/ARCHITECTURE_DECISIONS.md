# Architecture Decision Summary

1. **Modular backend services**: split by projects, workflow orchestration, template parsing, AI, review, audit.
2. **Mock-first Google integration**: enables local deterministic testing; keeps abstraction for service account/OAuth.
3. **Schema-first AI contracts**: service methods return structured objects to avoid brittle free-form parsing.
4. **State-machine-like workflow**: explicit IVDR workflow states for observability and re-runs.
5. **Audit log persistence**: user/agent actions written to immutable-style event rows.
6. **Human-in-the-loop hard stop**: workflow halts at `Pending Human Review`; no AI final approval.
