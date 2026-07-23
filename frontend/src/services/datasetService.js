import apiClient from './apiClient';

export async function getDashboardDatasets(params = {}) {
  const response = await apiClient.get('/datasets/dashboard', { params });
  return response.data.data;
}

export async function getDatasetDetails(datasetId) {
  const response = await apiClient.get(`/datasets/${datasetId}/details`);
  return response.data.data;
}

export async function trackDatasetView(datasetId) {
  const response = await apiClient.post(`/datasets/${datasetId}/track-view`);
  return response.data.data;
}

export async function overrideColumnClassification(datasetId, payload) {
  const response = await apiClient.post(`/datasets/${datasetId}/classifications/override`, payload);
  return response.data.data;
}
