import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import DatasetDetailsPage from '../pages/DatasetDetailsPage';
import NotFoundPage from '../pages/NotFoundPage';
import UploadPage from '../pages/UploadPage';
import { routes } from '../utils/routes';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path={routes.upload} element={<UploadPage />} />
          <Route path={routes.datasetDetails} element={<DatasetDetailsPage />} />
        </Route>
        <Route path="/dashboard" element={<Navigate to={routes.dashboard} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
