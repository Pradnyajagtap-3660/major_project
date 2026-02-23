import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";

export default function SafeRouteMap() {
  const { state } = useLocation();
  const { userLocation, shelter } = state;

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const shelterIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
    iconSize: [32, 32],
  });

  const userIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
    iconSize: [32, 32],
  });

  useEffect(() => {
    async function fetchRoutes() {
      try {

        console.log("🗺️ Requesting route from:", userLocation, "to:", shelter);
const response = await fetch("http://localhost:5001/api/safe-route",  {

          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userLocation: [userLocation.lon, userLocation.lat],
            shelterLocation: [shelter.lon, shelter.lat],
          }),
        });

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          setRoutes(data.routes);
          setSelectedRoute(0); // Default: select the first (safest) route by index
        } else {
          setError("No routes found. Try different locations.");
        }

        setLoading(false);
      } catch (err) {
        setError("Failed to fetch routes. Please try again.");
        setLoading(false);
      }
    }

    fetchRoutes();
  }, []);

  const getRiskBgColor = (type) => {
    if (type === 'safe') return '#dcfce7';
    if (type === 'moderate') return '#fef9c3';
    return '#fee2e2';
  };

  const getRiskBorderColor = (type) => {
    if (type === 'safe') return '#22c55e';
    if (type === 'moderate') return '#f59e0b';
    return '#ef4444';
  };

  const getRiskTextColor = (type) => {
    if (type === 'safe') return '#15803d';
    if (type === 'moderate') return '#b45309';
    return '#b91c1c';
  };

  return (
    <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ backgroundColor: "#1e3a5f", color: "white", padding: "10px 20px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>🚶 Routes to {shelter.name}</h2>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          textAlign: "center", padding: "20px",
          backgroundColor: "#f0f4ff", fontSize: "16px", color: "#555"
        }}>
          🔍 Finding best routes... Please wait
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: "#fee2e2", color: "#b91c1c",
          padding: "12px 20px", textAlign: "center"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Route Selection Cards */}
      {!loading && routes.length > 0 && (
        <div style={{
          display: "flex",
          gap: "10px",
          padding: "12px 16px",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          overflowX: "auto"
        }}>
          {routes.map((route, i) => (
            <div
              key={i}
              onClick={() => setSelectedRoute(i)}
              style={{
                flex: "1",
                minWidth: "160px",
                padding: "12px",
                borderRadius: "10px",
                border: `2px solid ${selectedRoute === i ? getRiskBorderColor(route.type) : '#e2e8f0'}`,
                backgroundColor: selectedRoute === i ? getRiskBgColor(route.type) : "white",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: selectedRoute === i ? `0 2px 8px ${getRiskBorderColor(route.type)}44` : "0 1px 3px #0001"
              }}
            >
              {/* Route Label */}
              <div style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: selectedRoute === i ? getRiskTextColor(route.type) : "#333",
                marginBottom: "8px"
              }}>
                {route.label}
              </div>

              {/* Route Stats */}
              <div style={{ fontSize: "12px", color: "#555", display: "flex", flexDirection: "column", gap: "3px" }}>
                <span>📏 {route.metadata.totalDistance} km</span>
                <span>⏱️ {route.metadata.duration} min</span>
                <span>⚠️ Risk: {(route.metadata.averageRisk * 100).toFixed(0)}%</span>
              </div>

              {/* Selected Badge */}
              {selectedRoute === i && (
                <div style={{
                  marginTop: "8px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: getRiskTextColor(route.type),
                  backgroundColor: getRiskBorderColor(route.type) + "22",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  textAlign: "center"
                }}>
                  ✓ Selected
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[userLocation.lat, userLocation.lon]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* User Marker */}
          <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
            <Popup>📍 You are here</Popup>
          </Marker>

          {/* Destination Marker */}
          <Marker position={[shelter.lat, shelter.lon]} icon={shelterIcon}>
            <Popup>🏥 {shelter.name}</Popup>
          </Marker>

          {/* Draw all routes - dimmed except selected */}
          {routes.map((route, i) => {
            const isSelected = selectedRoute === i;
            return (
              <Polyline
                key={i}
                positions={route.path.map((c) => [c[1], c[0]])}
                pathOptions={{
                  color: route.color,
                  weight: isSelected ? 6 : 3,
                  opacity: isSelected ? 0.95 : 0.3,
                  dashArray: isSelected ? null : "8, 6"
                }}
                eventHandlers={{
                  click: () => setSelectedRoute(i)
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* Bottom Info Bar for selected route */}
      {selectedRoute && routes.length > 0 && (() => {
        const route = routes[selectedRoute];
        if (!route) return null;
        return (
          <div style={{
            padding: "10px 20px",
            backgroundColor: getRiskBgColor(route.type),
            borderTop: `3px solid ${getRiskBorderColor(route.type)}`,
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            fontSize: "14px",
            fontWeight: "bold",
            color: getRiskTextColor(route.type)
          }}>
            <span>{route.label}</span>
            <span>📏 {route.metadata.totalDistance} km</span>
            <span>⏱️ {route.metadata.duration} min</span>
            <span>⚠️ Risk: {(route.metadata.averageRisk * 100).toFixed(0)}%</span>
          </div>
        );
      })()}

    </div>
  );
}
