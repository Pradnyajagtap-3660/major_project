import React, { useState, useEffect } from "react";
import "./SafeShelterFinder.css";  // same CSS works
import { useNavigate } from "react-router-dom";

const SafeHospitalFinder = () => {
  const [location, setLocation] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [allHospitals, setAllHospitals] = useState([]);
  const navigate = useNavigate();

  // ⭐ Fetch hospitals from backend
  useEffect(() => {
    async function fetchHospitals() {
      try {
        const response = await fetch("http://localhost:5000/api/hospital-latlon");
        const data = await response.json();

        const formatted = data.map(h => ({
          id: h.osm_id,
          osm_type: h.osm_type,
          name: h.name,
          lat: parseFloat(h.lat),
          lon: parseFloat(h.lon)
        }));

        setAllHospitals(formatted);
      } catch (error) {
        console.error("Error loading hospitals:", error);
      }
    }

    fetchHospitals();
  }, []);

  // ⭐ Haversine distance calculation
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ⭐ Enhanced geocoding function with fallback strategies
  const geocodeLocation = async (query) => {
    const baseUrl = "https://nominatim.openstreetmap.org/search";
    const commonParams = "&format=json&limit=5&countrycodes=in&addressdetails=1";
    const mumbaiBounds = "&viewbox=72.7764,19.2703,72.9781,18.8930&bounded=1";

    // Try different search strategies
    const strategies = [
      // Strategy 1: Exact query with Mumbai bounds
      `${baseUrl}?q=${encodeURIComponent(query + ", Mumbai, India")}${commonParams}${mumbaiBounds}`,

      // Strategy 2: Exact query without strict bounds (nearby areas)
      `${baseUrl}?q=${encodeURIComponent(query + ", Mumbai")}${commonParams}&viewbox=72.7764,19.2703,72.9781,18.8930`,

      // Strategy 3: Simplified query (remove common words)
      `${baseUrl}?q=${encodeURIComponent(
        query.replace(/institute|college|university|school|hospital|of|the/gi, '').trim() + ", Mumbai"
      )}${commonParams}${mumbaiBounds}`,
    ];

    for (const url of strategies) {
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "SafeHospital-App" },
        });
        const data = await response.json();

        if (data && data.length > 0) {
          return data[0]; // Return first match from successful strategy
        }
      } catch (err) {
        continue; // Try next strategy
      }
    }

    return null; // No results from any strategy
  };

  // ⭐ Search hospital
  const handleSearch = async () => {
    if (location.trim() === "") {
      alert("Enter your location!");
      return;
    }

    try {
      // 1️⃣ Convert address → lat/lon with smart geocoding
      const result = await geocodeLocation(location);

      if (!result) {
        alert(`Location "${location}" not found in Mumbai!\n\nTips:\n✓ Try shorter names: "Don Bosco Kurla" instead of full name\n✓ Use area names: "Kurla", "Bandra", "Andheri"\n✓ Add landmarks: "Kurla Station", "Bandra East"\n✓ Check spelling`);
        return;
      }

      const userLat = parseFloat(result.lat);
      const userLon = parseFloat(result.lon);

      // Show found location name for confirmation
      console.log("📍 Found location:", result.display_name);

      setUserLocation({ lat: userLat, lon: userLon });

      // 2️⃣ Add distance
      const hospitalsWithDistance = allHospitals.map(h => ({
        ...h,
        distance: getDistance(userLat, userLon, h.lat, h.lon)
      }));

      // ⭐ 3️⃣ Filter hospitals within 4 km (hospital distance usually larger)
      const filtered = hospitalsWithDistance
        .filter(h => h.distance <= 4)
        .sort((a, b) => a.distance - b.distance);

      if (filtered.length === 0) {
        alert("No nearby hospitals found within 4 km!");
      }

      setHospitals(filtered);

    } catch (err) {
      console.error(err);
      alert("Failed to fetch coordinates");
    }
  };

  return (
    <div className="shelter-container">
      <h2>🏥 Safe Hospital Finder</h2>
      <p>Find the nearest hospitals quickly during emergencies.</p>

      <div className="search-box">
        <input
          type="text"
          placeholder="Enter your location..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="shelter-list">
        {hospitals.length > 0 ? (
          hospitals
            .filter(h => h.name && h.name.trim() !== "")
            .map((hospital) => (
              <div key={hospital.id} className="shelter-card">
                <h3>{hospital.name}</h3>
                <p>
                  <strong>Distance:</strong> {hospital.distance.toFixed(2)} km
                </p>
                <button
                  className="navigate-btn"
                  onClick={() =>
                    navigate("/route", {
                      state: {
                        userLocation,
                        shelter: hospital, // same variable name used in your Route page
                      },
                    })
                  }
                >
                  🚑 Navigate
                </button>
              </div>
            ))
        ) : (
          <p className="no-shelter">No hospitals yet. Enter a location to search.</p>
        )}
      </div>
    </div>
  );
};

export default SafeHospitalFinder;
