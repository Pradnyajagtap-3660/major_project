import React, { useState } from "react";
import "./SafeShelterFinder.css";

const SafeShelterFinder = () => {
  const [location, setLocation] = useState("");
  const [shelters, setShelters] = useState([]);

  // Mock Data – replace later with API / database
  const allShelters = [
    { id: 1, name: "Shelter A", distance: "1.2 km", address: "Near Andheri Station" },
    { id: 2, name: "Shelter B", distance: "2.8 km", address: "Sion Circle" },
    { id: 3, name: "Shelter C", distance: "4.1 km", address: "Dadar East" },
  ];

  const handleSearch = () => {
    if (location.trim() === "") {
      alert("Enter your location to find nearby shelters!");
      return;
    }
    // Mock search: show all shelters
    setShelters(allShelters);
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
          shelters.map((shelter) => (
            <div key={shelter.id} className="shelter-card">
              <h3>{shelter.name}</h3>
              <p><strong>Distance:</strong> {shelter.distance}</p>
              <p><strong>Address:</strong> {shelter.address}</p>
              <button className="navigate-btn">🚶 Navigate</button>
            </div>
          ))
        ) : (
          <p className="no-shelter">No shelters found. Enter a location to search.</p>
        )}
      </div>
    </div>
  );
};

export default SafeShelterFinder;
