import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "rag"))

from sql_tool import _select_operation


class SqlToolTests(unittest.TestCase):
    def test_market_price_questions_select_market_extremes(self):
        self.assertEqual(
            _select_operation("Cual es el mercado mas caro?"),
            "most_expensive_market",
        )
        self.assertEqual(
            _select_operation("Cual es el mercado mas barato?"),
            "cheapest_market",
        )

    def test_general_dataset_questions_select_summary_operations(self):
        examples = {
            "Cuantos mercados tienes?": "count_markets",
            "Cuantos registros tienes?": "count_records",
            "Que mercados tienes?": "market_list",
            "Dame un resumen general de los datos.": "dataset_overview",
        }

        for question, operation in examples.items():
            with self.subTest(question=question):
                self.assertEqual(_select_operation(question), operation)


if __name__ == "__main__":
    unittest.main()
