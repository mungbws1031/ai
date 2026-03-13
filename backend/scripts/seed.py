from app.db.database import SessionLocal, Base, engine
from app.models.entities import Project, WorkflowRun, WorkflowState

Base.metadata.create_all(bind=engine)
db = SessionLocal()

project = db.query(Project).filter(Project.name == 'AstraNova IVDR Demo').first()
if not project:
    project = Project(
        name='AstraNova IVDR Demo',
        description='Realistic fake internal IVDR project for workflow testing',
        drive_mapping={
            'root': 'mock-root',
            'templates': '/Projects/AstraNova/Templates',
            'regulations': '/Projects/AstraNova/Sources/Regulations',
            'evidence': '/Projects/AstraNova/Sources/Evidence',
            'outputs': '/Projects/AstraNova/Outputs'
        },
    )
    db.add(project)
    db.commit()
    db.refresh(project)

run = db.query(WorkflowRun).filter(WorkflowRun.project_id == project.id).first()
if not run:
    run = WorkflowRun(
        project_id=project.id,
        document_type='Performance Evaluation Plan',
        template_name='PEP_Template.docx',
        output_path='backend/data/outputs',
        source_folders=['Sources/Regulations', 'Sources/Evidence'],
        custom_instructions='Conservative evidence-linked language only.',
        state=WorkflowState.NEW,
    )
    db.add(run)
    db.commit()

print('Seed complete')
