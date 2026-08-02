import unittest
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "rag"))

from query_router import classify_query_intent


class QueryRouterTests(unittest.TestCase):
    def test_analytic_questions_route_to_sql(self):
        examples = [
            "Cual fue el precio promedio en 2025?",
            "Que mercado tuvo el precio mas alto?",
            "Cual es el mercado mas caro?",
            "Cual es el mercado mas barato?",
            "Cuantos mercados tienes?",
            "Cuantos registros tienes?",
            "Dame un resumen general de los datos.",
            "Cual fue el precio minimo registrado?",
            "Dame un ranking de mercados por precio promedio.",
            "Cual fue la tendencia mensual?",
        ]

        for question in examples:
            with self.subTest(question=question):
                self.assertEqual(
                    classify_query_intent(question)["intent"],
                    "analitica_sql",
                )

    def test_vector_questions_route_to_rag(self):
        examples = [
            "Que informacion hay sobre Villahermosa?",
            "Que registros existen para Monterrey?",
            "Explicame los datos disponibles sobre caja de 20 kg.",
        ]

        for question in examples:
            with self.subTest(question=question):
                self.assertEqual(
                    classify_query_intent(question)["intent"],
                    "vectorial_rag",
                )

    def test_hybrid_questions_route_to_hybrid(self):
        examples = [
            "Compara Monterrey y CDMX y dime cual tuvo mejor comportamiento.",
            "Analiza la tendencia de Villahermosa y explica que significa.",
            "Por que Baja California es el mercado mas caro?",
        ]

        for question in examples:
            with self.subTest(question=question):
                self.assertEqual(
                    classify_query_intent(question)["intent"],
                    "hibrida",
                )


if __name__ == "__main__":
    unittest.main()
