async function replaceDatasetColumns(transaction, datasetVersionId, columns) {
  await transaction.datasetColumn.deleteMany({
    where: {
      datasetVersionId,
    },
  });

  if (columns.length) {
    await transaction.datasetColumn.createMany({
      data: columns.map(column => ({
        datasetVersionId,
        ...column,
      })),
    });
  }

  return transaction.datasetColumn.findMany({
    where: {
      datasetVersionId,
    },
    orderBy: {
      ordinal: 'asc',
    },
  });
}

module.exports = {
  replaceDatasetColumns,
};
