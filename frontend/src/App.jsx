import { useState } from "react";
import Sidebar from "./components/Sidebar";
import SpacekitView from "./components/SpacekitView";
import MapView from "./components/MapView";
import AIChatbot from "./components/AIChatbot";
import { Shield } from "lucide-react";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("3d");

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-brand">
            <Shield size={28} className="app-icon" />
            <h1 className="app-title">ASTROGUARD</h1>
          </div>
          <span className="app-subtitle">Asteroid Impact Simulator</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="app-body">
        {/* Sidebar */}
        <aside className="sidebar-container">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {/* 3D View Tab */}
          <section
            className={`view-panel ${activeTab === "3d" ? "active" : ""}`}
          >
            <SpacekitView />
          </section>

          {/* Map View Tab */}
          <section
            className={`view-panel ${activeTab === "map" ? "active" : ""}`}
          >
            <MapView />
          </section>
        </main>
      </div>

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}

export default App;
