from typing import List

from app.models import Gasto
from app.repositories.gasto_repository import GastoRepository


class GastoService:
    def __init__(self):
        self.repository = GastoRepository()

    def get_all(self) -> List[Gasto]:
        return self.repository.get_all()

    def add(self, gasto: Gasto) -> Gasto:
        return self.repository.add(gasto)

    def delete(self, gasto_id: int) -> bool:
        return self.repository.delete(gasto_id)