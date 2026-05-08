
"""
Export all tables from a MySQL database into a single XLSX workbook
with one sheet per table and auto-fit column widths.

Usage:
  1. Install dependencies:
     pip install pandas openpyxl mysql-connector-python
  2. Edit the DB config below (or set via env vars) if needed.
  3. Run:
     python export_db_xlsx.py

Note: This script will attempt to load entire tables into memory. For
very large tables, consider exporting to CSV or streaming in chunks.
"""

import math
from pathlib import Path
import mysql.connector
import pandas as pd
from openpyxl.utils import get_column_letter
from openpyxl import load_workbook

# ---------- CONFIG - edit if needed ----------
DB_CONFIG = {
    'host': 'srv1639.hstgr.io',
    'user': 'u902868468_omsv2',
    'password': 'Hknull@7838@',
    'database': 'u902868468_omsv2',
    'port': 3306,
}
OUTPUT_FILE = Path('db_export.xlsx')
# ---------------------------------------------


def get_tables(conn):
    cur = conn.cursor()
    cur.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';")
    rows = cur.fetchall()
    cur.close()
    return [r[0] for r in rows]


def autofit_columns(xlsx_path: Path):
    wb = load_workbook(filename=str(xlsx_path))
    for sheetname in wb.sheetnames:
        ws = wb[sheetname]
        # Determine max length for each column
        max_length = {}
        for row in ws.iter_rows(values_only=True):
            for idx, cell in enumerate(row, start=1):
                if cell is None:
                    length = 0
                else:
                    length = len(str(cell))
                max_length[idx] = max(max_length.get(idx, 0), length)

        for idx, length in max_length.items():
            column_letter = get_column_letter(idx)
            # Add a small buffer and limit max width
            adjusted_width = min(max( (length + 2), 8), 60)
            ws.column_dimensions[column_letter].width = adjusted_width
    wb.save(filename=str(xlsx_path))


def main():
    print('Connecting to database...')
    conn = mysql.connector.connect(**DB_CONFIG)

    try:
        tables = get_tables(conn)
        if not tables:
            print('No tables found in database.')
            return

        print(f'Found {len(tables)} tables. Exporting to', OUTPUT_FILE)

        # Use pandas to write each table into a separate sheet
        with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
            for t in tables:
                print('Reading table', t)
                try:
                    df = pd.read_sql(f"SELECT * FROM `{t}`", conn)
                except Exception as e:
                    print(f'  Skipping table {t} - failed to read: {e}')
                    continue

                # Truncate sheet name to 31 chars (Excel limitation)
                sheet_name = t[:31]
                df.to_excel(writer, sheet_name=sheet_name, index=False)

        print('Adjusting column widths...')
        autofit_columns(OUTPUT_FILE)
        print('Export complete:', OUTPUT_FILE.resolve())

    finally:
        conn.close()


if __name__ == '__main__':
    main()
