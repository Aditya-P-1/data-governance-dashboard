const XLSX = require('xlsx');
const AppError = require('./AppError');

function isNonEmptyCell(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function normalizeHeaderCell(value, index) {
  const label = String(value ?? '').trim();

  return label || `column_${index + 1}`;
}

function isNonEmptyRow(row) {
  return Array.isArray(row) && row.some(isNonEmptyCell);
}

function parseWorkbookRows(filePath) {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new AppError('Uploaded file does not contain any worksheets or rows', 400);
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });

  if (!rows.length) {
    throw new AppError('Uploaded file is empty', 400);
  }

  return rows;
}

function extractDatasetMatrix(rows) {
  const firstDataIndex = rows.findIndex(isNonEmptyRow);

  if (firstDataIndex === -1) {
    throw new AppError('Uploaded file does not contain a header row', 400);
  }

  const headerRow = rows[firstDataIndex];
  const headers = headerRow.map(normalizeHeaderCell);
  const dataRows = rows.slice(firstDataIndex + 1).filter(isNonEmptyRow);
  const rowCount = dataRows.length;
  const columnCount = headers.length;

  return {
    headers,
    dataRows,
    rowCount,
    columnCount,
  };
}

module.exports = {
  extractDatasetMatrix,
  parseWorkbookRows,
};
