import os
import sys

# Permite importar los módulos del backend (model, wc2026, backtest…) en los tests.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
