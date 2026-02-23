import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";

export default function SafeRouteMap() {
  const { state } = useLocation();
  const { userLocation, shelter } = state;

  const [safePath, setSafePath] = useState(null);
  const [routeMetadata, setRouteMetadata] = useState(null);
  const [routeMessage, setRouteMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Custom icons
  const shelterIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
    iconSize: [28, 28],
  });

  const userIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
    iconSize: [32, 32],
  });

  // Fetch safest route from backend
  useEffect(() => {
    async function fetchRoute() {
      try {
        console.log("🗺️ Requesting route from:", userLocation, "to:", shelter);
        const response = await fetch("http://localhost:5001/api/safe-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userLocation: [userLocation.lon, userLocation.lat],
            shelterLocation: [shelter.lon, shelter.lat],
          }),
        });

        const data = await response.json();
        console.log("✅ Route API Response:", data);

        if (data.path) {
          setSafePath(data.path);
          setRouteMetadata(data.metadata);
          console.log("✅ Route found with", data.path.length, "coordinates");
        } else {
          setRouteMessage(data.message || "No route found");
          console.log("⚠️ No route available:", data.message);
        }

        setLoading(false);
      } catch (err) {
        console.error("❌ Route error:", err);
        setRouteMessage("Failed to fetch route. Please try again.");
        setLoading(false);
      }
    }

    fetchRoute();
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <div style={{ textAlign: "center", padding: "10px", backgroundColor: "#f0f0f0" }}>
        <h2 style={{ margin: "5px 0" }}>🚶 Safest Route to {shelter.name}</h2>

        {loading && (
          <p style={{ color: "#666", margin: "5px 0" }}>🔍 Finding safest route...</p>
        )}

        {routeMetadata && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            margin: "10px 0",
            fontSize: "14px"
          }}>
            <span>📏 Distance: {routeMetadata.totalDistance} km</span>
            <span>🛣️ Segments: {routeMetadata.segments}</span>
            <span style={{
              color: routeMetadata.safetyLevel === "Safe" ? "green" :
                     routeMetadata.safetyLevel === "Moderate" ? "orange" : "red",
              fontWeight: "bold"
            }}>
              🛡️ Safety: {routeMetadata.safetyLevel}
            </span>
            <span>⚠️ Risk: {(routeMetadata.averageRisk * 100).toFixed(0)}%</span>
          </div>
        )}

        {routeMessage && (
          <div style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "10px",
            margin: "10px auto",
            maxWidth: "600px",
            borderRadius: "5px",
            border: "1px solid #ffc107"
          }}>
            ⚠️ {routeMessage}
            <br />
            <small>Try selecting a closer location or a different destination in the same area.</small>
          </div>
        )}
      </div>

      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={14}
        style={{ height: "calc(100% - 120px)", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* User Marker */}
        <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Shelter Marker */}
        <Marker position={[shelter.lat, shelter.lon]} icon={shelterIcon}>
          <Popup>{shelter.name}</Popup>
        </Marker>

        {/* Safe Route */}
        {safePath && safePath.length > 0 && (
          <Polyline
            positions={safePath.map((c) => [c[1], c[0]])}
            pathOptions={{ color: "#2196F3", weight: 5, opacity: 0.7 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
