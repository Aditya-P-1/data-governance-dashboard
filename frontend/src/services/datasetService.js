import apiClient from './apiClient';

export async function getDashboardDatasets(params = {}) {
  const response = await apiClient.get('/datasets/dashboard', { params });
  return response.data.data;
}

export async function getDatasetDetails(datasetId) {
  const response = await apiClient.get(`/datasets/${datasetId}/details`);
  return response.data.data;
}
