import { Outlet } from 'react-router-dom';
import Container from '../components/Container';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-shell__body">
        <Sidebar />
        <main className="app-shell__main">
          <Container>
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
}
