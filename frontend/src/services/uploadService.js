import apiClient from './apiClient';

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/datasets/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data;
}
