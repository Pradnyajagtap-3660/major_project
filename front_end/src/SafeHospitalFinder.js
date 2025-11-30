import React, { useState, useEffect } from "react";
import "./SafeShelterFinder.css";
import { Hospital } from "lucide-react";

const SafeHospitalFinder = () => {
  const [location, setLocation] = useState("");
  const [hospital, setHospital] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [allHospital, setAllHospital] = useState([]);

  // ⭐ Fetch shelters from backend (lat/lon included)
  useEffect(() => {
    async function fetchHospitals() {
      try {
        const response = await fetch("http://localhost:5000/api/hospital-latlon");
        const data = await response.json();
        console.log(data);
        const formatted = data.map(hospital => ({
          id: hospital.osm_id,
          osm_type: hospital.osm_type,
          name: hospital.name,
          lat: parseFloat(hospital.lat),
          lon: parseFloat(hospital.lon)
        }));

        setAllHospital(formatted);
      } catch (error) {
        console.error("Error loading hospital:", error);
      }
    }

    fetchHospitals();
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

  
  
  const handleSearch = async () => {
  if (location.trim() === "") {
    alert("Enter your location!");
    return;
  }

  try {
    // 1️⃣ Convert user input → coordinates
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      location
    )}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: { "User-Agent": "SafeShelter-App" },
    });

    const data = await response.json();

    if (data.length === 0) {
      alert("Location not found!");
      return;
    }

    const userLat = parseFloat(data[0].lat);
    const userLon = parseFloat(data[0].lon);

    setUserLocation({ lat: userLat, lon: userLon });

    // 2️⃣ Compute distance using DB lat/lon
    const hospitalsWithDistance = allHospital.map(s => ({
      ...s,
      distance: getDistance(userLat, userLon, s.lat, s.lon)
    }));

    // ⭐ 3️⃣ Filter only shelters within 3 km radius
    const filtered = hospitalsWithDistance
      .filter(s => s.distance <= 3)       // <= 3 km only
      .sort((a, b) => a.distance - b.distance);

    if (filtered.length === 0) {
      alert("No shelters found within 3 km!");
    }

    // 4️⃣ Set result
    setHospital(filtered);

  } catch(err) {
    console.error(err);
    alert("Failed to fetch coordinates");
  }
};


  return (
    <div className="shelter-container">
      <h2>🏠 Safe Hospitals Finder</h2>
      <p>Find the nearest Hospitals  in case of floods.</p>

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
        {hospital.length > 0 ? (
           hospital
            .filter(hospital => hospital.name && hospital.name.trim() !== "") // ✅ Filter out shelters without name
            .map((hospital) => (
            <div key={hospital.id} className="shelter-card">
              <h3>{hospital.name}</h3>
              <p>
                <strong>Distance:</strong> {hospital.distance.toFixed(2)} km
              </p>
              <button className="navigate-btn">🚶 Navigate</button>
            </div>
          ))
        ) : (
          <p className="no-shelter">No hospital yet. Enter a location to search.</p>
        )}
      </div>
    </div>
  );
};

export default SafeHospitalFinder;
