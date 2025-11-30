import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";

export default function SafeRouteMap() {
  const { state } = useLocation();
  const { userLocation, shelter } = state;

  const [safePath, setSafePath] = useState(null);

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
        console.log("fbd")
        const response = await fetch("http://localhost:5000/api/safe-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userLocation: [userLocation.lon, userLocation.lat],
            shelterLocation: [shelter.lon, shelter.lat],
          }),
        });

        const data = await response.json();
        console.log("Safe Path Data:", data);
        setSafePath(data.path);
      } catch (err) {
        console.error("Route error:", err);
      }
    }

    fetchRoute();
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <h2 style={{ textAlign: "center" }}>🚶 Safest Route to {shelter.name}</h2>

      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={14}
        style={{ height: "90%", width: "100%" }}
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
        {safePath && (
          <Polyline
            positions={safePath.map((c) => [c[1], c[0]])}
            pathOptions={{ color: "blue", weight: 5 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
