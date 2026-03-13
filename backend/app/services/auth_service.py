from app.models.entities import Role


class AuthService:
    def can(self, role: Role, action: str) -> bool:
        permissions = {
            Role.ADMIN: {'*'},
            Role.RA_MANAGER: {'create_project', 'start_workflow', 'approve', 'rerun'},
            Role.AUTHOR: {'start_workflow', 'rerun', 'comment'},
            Role.REVIEWER: {'review', 'request_changes', 'comment'},
            Role.VIEWER: {'read'},
        }
        return '*' in permissions.get(role, set()) or action in permissions.get(role, set())
