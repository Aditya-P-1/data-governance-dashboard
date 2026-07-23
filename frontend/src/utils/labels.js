export function formatEnumLabel(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
