function toJsonSafe(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(item => toJsonSafe(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, toJsonSafe(entryValue)]),
    );
  }

  return value;
}

module.exports = {
  toJsonSafe,
};
