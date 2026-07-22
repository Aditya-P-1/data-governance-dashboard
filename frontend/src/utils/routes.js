export const routes = {
  dashboard: '/',
  upload: '/upload',
  datasetDetails: '/datasets/:datasetId/details',
};

export function buildDatasetDetailsPath(datasetId) {
  return `/datasets/${datasetId}/details`;
}
