import Sidebar from './components/Sidebar';
import SpacekitView from './components/SpacekitView';
import MapView from './components/MapView';
import './App.css';

function App() {
  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar-container">
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* 3D Visualization */}
        <section className="spacekit-section">
          <SpacekitView />
        </section>

        {/* 2D Map */}
        <section className="map-section">
          <MapView />
        </section>
      </main>
    </div>
  );
}

export default App;
