import React from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import "./StatisticsPanel.css";

const StatisticsPanel = () => {
  // Example Data
  const shelters = 12;
  const hospitalsNearby = { "2 km": 5, "5 km": 12 };
  const routes = { open: 18, blocked: 7 };

  // Chart data
  const routeData = [
    { name: "Open Routes", value: routes.open },
    { name: "Blocked Routes", value: routes.blocked },
  ];

  const hospitalData = [
    { name: "2 km Radius", value: hospitalsNearby["2 km"] },
    { name: "5 km Radius", value: hospitalsNearby["5 km"] },
  ];

  const COLORS = ["#4CAF50", "#FF5733", "#2196F3", "#FFC300"];

  return (
    <div className="statistics-container">
      <h2>📊 Statistics & Analytics</h2>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Waterlogging spots</h3>
          <p>{shelters}</p>
        </div>
        <div className="stat-card">
          <h3>Safe Shelters</h3>
          <p>{hospitalsNearby["2 km"]}</p>
        </div>
        <div className="stat-card">
          <h3>Hospitals (5 km)</h3>
          <p>{hospitalsNearby["5 km"]}</p>
        </div>
      </div>

      <div className="charts">
        {/* Pie Chart for Routes */}
        <div className="chart-box">
          <h4>Routes Status</h4>
          <PieChart width={300} height={250}>
            <Pie
              data={routeData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {routeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        
      </div>
    </div>
  );
};

export default StatisticsPanel;
