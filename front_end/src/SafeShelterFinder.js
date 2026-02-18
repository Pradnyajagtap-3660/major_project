import React, { useState, useEffect } from "react";
import "./SafeShelterFinder.css";
import { useNavigate } from "react-router-dom";

const SafeShelterFinder = () => {
  const [location, setLocation] = useState("");
  const [shelters, setShelters] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [allShelters, setAllShelters] = useState([]);
  const navigate = useNavigate();
  

  // ⭐ Fetch shelters from backend (lat/lon included)
  useEffect(() => {
    async function fetchShelters() {
      try {
        const response = await fetch("http://localhost:5000/api/shelter-latlon");
        const data = await response.json();
        console.log(data);
        const formatted = data.map(shelter => ({
          id: shelter.osm_id,
          osm_type: shelter.osm_type,
          name: shelter.name,
          lat: parseFloat(shelter.lat),
          lon: parseFloat(shelter.lon)
        }));

        setAllShelters(formatted);
      } catch (error) {
        console.error("Error loading shelters:", error);
      }
    }

    fetchShelters();
  }, []);

  // ⭐ Haversine distance function
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
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
          headers: { "User-Agent": "SafeShelter-App" },
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

  const handleSearch = async () => {
  if (location.trim() === "") {
    alert("Enter your location!");
    return;
  }

  try {
    // 1️⃣ Convert user input → coordinates with smart geocoding
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

    // 2️⃣ Compute distance using DB lat/lon
    const sheltersWithDistance = allShelters.map(s => ({
      ...s,
      distance: getDistance(userLat, userLon, s.lat, s.lon)
    }));

    // ⭐ 3️⃣ Filter only shelters within 3 km radius
    const filtered = sheltersWithDistance
      .filter(s => s.distance <= 3)       // <= 3 km only
      .sort((a, b) => a.distance - b.distance);

    if (filtered.length === 0) {
      alert("No shelters found within 3 km!");
    }

    // 4️⃣ Set result
    setShelters(filtered);

  } catch(err) {
    console.error(err);
    alert("Failed to fetch coordinates");
  }
};


  return (
    <div className="shelter-container">
      <h2>🏠 Safe Shelter Finder</h2>
      <p>Find the nearest safe shelters in case of floods.</p>

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
        {shelters.length > 0 ? (
           shelters
            .filter(shelter => shelter.name && shelter.name.trim() !== "") // ✅ Filter out shelters without name
            .map((shelter) => (
            <div key={shelter.id} className="shelter-card">
              <h3>{shelter.name}</h3>
              <p>
                <strong>Distance:</strong> {shelter.distance.toFixed(2)} km
              </p>
              <button className="navigate-btn"  onClick={() => navigate("/route", {
              state: {
                userLocation,
                shelter
              }
             })}>🚶 Navigate</button>
            </div>
          ))
        ) : (
          <p className="no-shelter">No shelters yet. Enter a location to search.</p>
        )}
      </div>
    </div>
  );
};

export default SafeShelterFinder;
