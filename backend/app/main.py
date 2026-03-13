from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.db.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title='IVDR RA Workflow Automation')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(router, prefix='/api')


@app.get('/health')
def health():
    return {'status': 'ok'}
