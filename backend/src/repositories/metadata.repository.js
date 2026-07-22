async function replaceDatasetMetadata({
  transaction,
  datasetId,
  datasetVersionId,
  datasetEntries,
  versionEntries,
}) {
  const versionKeys = versionEntries.map(entry => entry.key);
  const datasetKeys = datasetEntries.map(entry => entry.key);
  const normalizedDatasetEntries = datasetEntries.map(entry => ({
    ...entry,
    datasetId,
    datasetVersionId: null,
  }));
  const normalizedVersionEntries = versionEntries.map(entry => ({
    ...entry,
    datasetId,
    datasetVersionId,
  }));

  if (datasetKeys.length) {
    await transaction.metadataEntry.deleteMany({
      where: {
        datasetId,
        datasetVersionId: null,
        key: {
          in: datasetKeys,
        },
      },
    });
  }

  if (versionKeys.length) {
    await transaction.metadataEntry.deleteMany({
      where: {
        datasetId,
        datasetVersionId,
        key: {
          in: versionKeys,
        },
      },
    });
  }

  if (datasetEntries.length) {
    await transaction.metadataEntry.createMany({
      data: normalizedDatasetEntries,
    });
  }

  if (versionEntries.length) {
    await transaction.metadataEntry.createMany({
      data: normalizedVersionEntries,
    });
  }
}

module.exports = {
  replaceDatasetMetadata,
};
