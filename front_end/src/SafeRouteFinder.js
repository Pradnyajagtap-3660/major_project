import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SafeShelterFinder.css";

const SafeRouteFinder = () => {
  const [location, setLocation] = useState("");
    const navigate = useNavigate();

  return (
    <div className="shelter-container">
      <h2>🏠 Safe Route Finder</h2>
      <p>Find the nearest safe shelters/hospital in case of floods.</p>

       <button onClick={() => navigate("/safeshelterfinder")}>Shelter</button>
      <button onClick={() => navigate("/safehospitalfinder")}>Hospital</button>

      <div className="search-box">
        <input
          type="text"
          placeholder="Enter your location..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button>Search</button>
      </div>

      
    </div>
  );
};

export default SafeRouteFinder;
