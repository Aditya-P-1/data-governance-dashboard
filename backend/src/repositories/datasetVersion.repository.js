async function updateDatasetVersionParsing(transaction, datasetVersionId, data) {
  return transaction.datasetVersion.update({
    where: {
      id: datasetVersionId,
    },
    data,
  });
}

module.exports = {
  updateDatasetVersionParsing,
};
