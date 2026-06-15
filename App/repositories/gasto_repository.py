from typing import List
from sqlalchemy import extract, func # 🌟 Agregamos func aquí

from app.extensions import db
from app.models import Gasto
from app.utils.decorators import transactional
from .repository import Repository_add, Repository_delete, Repository_get

class GastoRepository(Repository_add, Repository_get, Repository_delete):
    
    @transactional
    def add(self, gasto: Gasto) -> Gasto:
        return self.repository.add(gasto)

    def get_all(self, month=None, year=None) -> List[Gasto]:
        query = Gasto.query
        if year:
            query = query.filter(extract('year', Gasto.fecha) == year)
        if month:
            query = query.filter(extract('month', Gasto.fecha) == month)

        return query.order_by(Gasto.fecha.desc()).all()

    def get_agrupados_por_categoria(self, month: int, year: int):
        """
        Devuelve una lista de tuplas: (categoria, total_gastado)
        """
        return db.session.query(
            Gasto.categoria, 
            func.sum(Gasto.monto).label('total')
        ).filter(
            extract('year', Gasto.fecha) == year,
            extract('month', Gasto.fecha) == month
        ).group_by(Gasto.categoria).all()

    def get_by_id(self, id: int) -> Gasto:
        return Gasto.query.get(id)

    def get_desglose_para_grafico(self, month: int, year: int) -> list:
        agrupados = self.repository.get_agrupados_por_categoria(month, year)
        
        # Paleta predefinida que hace match con tu frontend
        PALETA_COLORES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
        
        desglose = []
        for index, row in enumerate(agrupados):
            # row[0] es la categoria, row[1] es el total sumado
            color = PALETA_COLORES[index % len(PALETA_COLORES)]
            desglose.append({
                "name": row[0] or "Otros", 
                "value": float(row[1]),
                "color": color
            })
            
        return desglose
    @transactional
    def delete(self, gasto_id: int) -> bool:
        return self.repository.delete(gasto_id)