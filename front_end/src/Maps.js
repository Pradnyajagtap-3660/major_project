// import React from 'react'
// import { MapContainer, TileLayer, Marker, Popup, LayersControl, LayerGroup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "./maps.css";

// // Simple custom icons
// const blueIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
//   iconSize: [25, 25],
// });

// const redIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252039.png",
//   iconSize: [25, 25],
// });

// const Maps = () => {
//   return (
//     <div style={{ height: "80vh", width: "100%" }}>
//       <MapContainer center={[19.076, 72.8777]} zoom={12} style={{ height: "100%", width: "100%", borderRadius: "16px" }}>
//         {/* Base Map */}
//         <TileLayer
//           attribution='&copy; <a href="http://osm.org/">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {/* Layer Control */}
//         <LayersControl position="topright">
//           {/* Waterlogging Points */}
//           <LayersControl.Overlay checked name="Waterlogging">
//             <LayerGroup>
//               <Marker position={[19.07, 72.87]} icon={redIcon}>
//                 <Popup>Waterlogging Area - Sion</Popup>
//               </Marker>
//               <Marker position={[19.1, 72.85]} icon={redIcon}>
//                 <Popup>Waterlogging Area - Andheri</Popup>
//               </Marker>
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* Shelters */}
//           <LayersControl.Overlay name="Shelters">
//             <LayerGroup>
//               <Marker position={[19.08, 72.89]} icon={blueIcon}>
//                 <Popup>Shelter - School</Popup>
//               </Marker>
//               <Marker position={[19.06, 72.88]} icon={blueIcon}>
//                 <Popup>Shelter - Community Hall</Popup>
//               </Marker>
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* Hospitals */}
//           <LayersControl.Overlay name="Hospitals">
//             <LayerGroup>
//               <Marker position={[19.09, 72.87]}>
//                 <Popup>Hospital - City Care</Popup>
//               </Marker>
//               <Marker position={[19.1, 72.89]}>
//                 <Popup>Hospital - LifeLine</Popup>
//               </Marker>
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* Roads */}
//           <LayersControl.Overlay name="Main Roads">
//             <LayerGroup>
//               {/* Example road markers */}
//               <Marker position={[19.11, 72.87]}>
//                 <Popup>Main Road - Highway 1</Popup>
//               </Marker>
//               <Marker position={[19.12, 72.86]}>
//                 <Popup>Main Road - Link Road</Popup>
//               </Marker>
//             </LayerGroup>
//           </LayersControl.Overlay>
//         </LayersControl>
//       </MapContainer>
//     </div>
//   );
// }

// export default Maps;



// import React, { useEffect, useState } from "react";
// import { MapContainer, TileLayer, Marker, Popup, LayersControl, LayerGroup, GeoJSON } from "react-leaflet";
// import L from "leaflet";
// import axios from "axios";
// import "leaflet/dist/leaflet.css";
// import "./maps.css";

// // Custom icons
// const redIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252039.png", // flood marker
//   iconSize: [25, 25],
// });

// const blueIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png", // waterlogging or general marker
//   iconSize: [25, 25],
// });

// const hospitalIcon = new L.Icon({
//   iconUrl: "https://e7.pngegg.com/pngimages/618/567/png-clipart-red-cross-illustration-hospital-plus-and-minus-signs-symbol-american-red-cross-red-cross-miscellaneous-angle.png",
//   iconSize: [20, 20],
// });

// const shelterIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/69/69524.png", // house/shelter
//   iconSize: [28, 28],
// });


// const Maps = () => {
//   const [floodData, setFloodData] = useState([]);
//   const [hospitalData, setHospitalData] = useState([]);
//   const [shelterData, setShelterData] = useState([]);
//   const [vulernableData, setVulernableData] = useState([]);

//   // Fetch all data from backend
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//        // const floodRes = await axios.get("http://localhost:5001/api/flood-risk");
//         const hospRes = await axios.get("http://localhost:5001/api/hospitals");
//         const shelterRes = await axios.get("http://localhost:5001/api/shelters");
//         const vulernableRes = await axios.get("http://localhost:5001/api/vulernable_zone");

//         setVulernableData(vulernableRes.data);

//         // setFloodData(floodRes.data);
//         setHospitalData(hospRes.data);
//         setShelterData(shelterRes.data);
//       } catch (err) {
//         console.error("Error fetching data:", err);
//       }
//     };
//     fetchData();
//   }, []);

//   return (
//     <div style={{ height: "80vh", width: "100%" }}>
//       <MapContainer
//         center={[19.076, 72.8777]}
//         zoom={12}
//         style={{ height: "100%", width: "100%", borderRadius: "16px" }}
//       >
//         {/* Base Map */}
//         <TileLayer
//           attribution='&copy; <a href="http://osm.org/">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {/* Layer Control */}
//          <LayersControl position="topright">
//           {/* 🌊 Flood Risk Zones */}
//           {/* <LayersControl.Overlay checked name="Flood Risk">
//             <LayerGroup>
//               {floodData.map((feature, i) => (
//                 <GeoJSON
//                   key={i}
//                   data={JSON.parse(feature.geometry)}
//                   style={{
//                     color:
//                       feature.risk === "High"
//                         ? "red"
//                         : feature.risk === "Medium"
//                         ? "orange"
//                         : "green",
//                     weight: 1,
//                     fillOpacity: 0.4,
//                   }}
//                 />
//               ))}
//             </LayerGroup>
//           </LayersControl.Overlay> */}

//           {/* ⚠️ Vulnerable Zones */}


              

         
         

//           {/* 🏥 Hospitals */}
//           <LayersControl.Overlay name="Hospitals">
//             <LayerGroup>
//               {hospitalData.map((hosp, i) => {
//                 const geom = JSON.parse(hosp.geometry);
//                 return (
//                   <Marker
//                     key={i}
//                     position={[geom.coordinates[1], geom.coordinates[0]]}
//                     icon={hospitalIcon}
//                   >
//                     <Popup>{hosp.name || "Hospital"}</Popup>
//                   </Marker>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* 🏠 Shelters */}
//           <LayersControl.Overlay name="Shelters">
//             <LayerGroup>
//               {shelterData.map((shel, i) => {
//                 const geom = JSON.parse(shel.geometry);
//                 return (
//                   <Marker
//                     key={i}
//                     position={[geom.coordinates[1], geom.coordinates[0]]}
//                     icon={shelterIcon}
//                   >
//                     <Popup>{shel.shelter_name || "Shelter"}</Popup>
//                   </Marker>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>
//         </LayersControl>
//       </MapContainer>
//     </div>
//   );
// };

// export default Maps;



// import React, { useEffect, useState } from "react";
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   LayersControl,
//   LayerGroup,
//   GeoJSON,
// } from "react-leaflet";
// import L from "leaflet";
// import axios from "axios";
// import * as turf from "@turf/turf";
// import "leaflet/dist/leaflet.css";
// import "./maps.css";

// // Custom icons
// const redIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252039.png",
//   iconSize: [25, 25],
// });

// const hospitalIcon = new L.Icon({
//   iconUrl: "https://e7.pngegg.com/pngimages/618/567/png-clipart-red-cross-illustration-hospital-plus-and-minus-signs-symbol-american-red-cross-red-cross-miscellaneous-angle.png",
//   iconSize: [20, 20],
// });

// const shelterIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/69/69524.png",
//   iconSize: [28, 28],
// });

// const Maps = () => {
//   const [floodData, setFloodData] = useState([]);
//   const [hospitalData, setHospitalData] = useState([]);
//   const [shelterData, setShelterData] = useState([]);
//   const [vulnerableData, setVulnerableData] = useState([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         // const floodRes = await axios.get("http://localhost:5001/api/flood-risk");
//         const hospRes = await axios.get("http://localhost:5001/api/hospitals");
//         const shelterRes = await axios.get("http://localhost:5001/api/shelters");
//         const vulnerableRes = await axios.get(
//           "http://localhost:5001/api/vulernable_zone"
//         );

//         console.log(setVulnerableData(vulnerableRes.data));
//         // setFloodData(floodRes.data);
//         setHospitalData(hospRes.data);
//         setShelterData(shelterRes.data);
//       } catch (err) {
//         console.error("Error fetching data:", err);
//       }
//     };

//     fetchData();
//   }, []);

//   return (
//     <div style={{ height: "80vh", width: "100%" }}>
//       <MapContainer
//         center={[19.076, 72.8777]}
//         zoom={12}
//         style={{ height: "100%", width: "100%", borderRadius: "16px" }}
//       >
//         <TileLayer
//           attribution='&copy; <a href="http://osm.org/">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         <LayersControl position="topright">
//           {/* 🌊 Flood Risk Zones (optional) */}
//           {/* <LayersControl.Overlay checked name="Flood Risk">
//             <LayerGroup>
//               {floodData.map((feature, i) => (
//                 <GeoJSON
//                   key={`flood-${i}`}
//                   data={JSON.parse(feature.geometry)}
//                   style={{
//                     color:
//                       feature.risk === "High"
//                         ? "red"
//                         : feature.risk === "Medium"
//                         ? "orange"
//                         : "green",
//                     weight: 1,
//                     fillOpacity: 0.4,
//                   }}
//                 />
//               ))}
//             </LayerGroup>
//           </LayersControl.Overlay> */}

//           {/* ⚠️ Vulnerable Zones */}
//           <LayersControl.Overlay checked name="Vulnerable Zones">
//             <LayerGroup>
//               {vulnerableData.map((zone, i) => {
//                 const geom = zone.geometry;

//                 // Render MultiPolygon as GeoJSON
//                 const geoJsonElement = (
//                   <GeoJSON
//                     key={`vuln-geojson-${i}`}
//                     data={geom}
//                     style={{
//                       color: "red",
//                       weight: 1,
//                       fillOpacity: 0.3,
//                     }}
//                   />
//                 );

//                 // Centroid marker for reference
//                 const centroid = turf.centroid(geom);
//                 const markerElement = (
//                   <Marker
//                     key={`vuln-marker-${i}`}
//                     position={[
//                       centroid.geometry.coordinates[1],
//                       centroid.geometry.coordinates[0],
//                     ]}
//                     icon={redIcon}
//                   >
//                     <Popup>Vulnerable Zone</Popup>
//                   </Marker>
//                 );

//                 return (
//                   <React.Fragment key={i}>
//                     {geoJsonElement}
//                     {markerElement}
//                   </React.Fragment>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* 🏥 Hospitals */}
//           <LayersControl.Overlay name="Hospitals">
//             <LayerGroup>
//               {hospitalData.map((hosp, i) => {
//                 const geom = JSON.parse(hosp.geometry);
//                 return (
//                   <Marker
//                     key={`hosp-${i}`}
//                     position={[geom.coordinates[1], geom.coordinates[0]]}
//                     icon={hospitalIcon}
//                   >
//                     <Popup>{hosp.name || "Hospital"}</Popup>
//                   </Marker>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* 🏠 Shelters */}
//           <LayersControl.Overlay name="Shelters">
//             <LayerGroup>
//               {shelterData.map((shel, i) => {
//                 const geom = JSON.parse(shel.geometry);
//                 return (
//                   <Marker
//                     key={`shel-${i}`}
//                     position={[geom.coordinates[1], geom.coordinates[0]]}
//                     icon={shelterIcon}
//                   >
//                     <Popup>{shel.shelter_name || "Shelter"}</Popup>
//                   </Marker>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>
//         </LayersControl>
//       </MapContainer>
//     </div>
//   );
// };

// export default Maps;


// import React, { useEffect, useState } from "react";
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   LayersControl,
//   LayerGroup,
//   GeoJSON,
// } from "react-leaflet";
// import L from "leaflet";
// import axios from "axios";
// import * as turf from "@turf/turf";
// import "leaflet/dist/leaflet.css";
// import "./maps.css";

// // Custom icons
// const redIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252039.png",
//   iconSize: [25, 25],
// });

// const hospitalIcon = new L.Icon({
//   iconUrl:
//     "https://e7.pngegg.com/pngimages/618/567/png-clipart-red-cross-illustration-hospital-plus-and-minus-signs-symbol-american-red-cross-red-cross-miscellaneous-angle.png",
//   iconSize: [20, 20],
// });

// const shelterIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/69/69524.png",
//   iconSize: [28, 28],
// });

// const Maps = () => {
//   const [hospitalData, setHospitalData] = useState([]);
//   const [shelterData, setShelterData] = useState([]);
//   const [vulnerableData, setVulnerableData] = useState([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const hospRes = await axios.get("http://localhost:5001/api/hospitals");
//         const shelterRes = await axios.get("http://localhost:5001/api/shelters");
//         const vulnerableRes = await axios.get(
//           "http://localhost:5001/api/vulernable_zone"
//         );

//         console.log("✅ Vulnerable Zones:", vulnerableRes.data[0]);
//         console.log("✅ First Zone Geometry:", vulnerableRes.data[0]?.geometry);

//         setVulnerableData(vulnerableRes.data);
//         setHospitalData(hospRes.data);
//         setShelterData(shelterRes.data);
//       } catch (err) {
//         console.error("Error fetching data:", err);
//       }
//     };

//     fetchData();
//   }, []);

//   return (
//     <div style={{ height: "80vh", width: "100%" }}>
//       <MapContainer
//         center={[19.076, 72.8777]}
//         zoom={12}
//         style={{ height: "100%", width: "100%", borderRadius: "16px" }}
//       >
//         <TileLayer
//           attribution='&copy; <a href="http://osm.org/">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         <LayersControl position="topright">
//           {/* ⚠️ Vulnerable Zones */}
//           {/* <LayersControl.Overlay checked name="Vulnerable Zones">
//             <LayerGroup>
//               {vulnerableData.map((zone, i) => {
//                 let geom = zone.geometry;

//                 // 🔧 In case backend still sends string
//                 if (typeof geom === "string") {
//                   try {
//                     geom = JSON.parse(geom);
//                   } catch {
//                     console.warn("Invalid GeoJSON format for zone", zone.id);
//                     return null;
//                   }
//                 }

//                 if (!geom || !geom.type) {
//                   console.warn("Skipping invalid geometry", geom);
//                   return null;
//                 }

//                 // Render MultiPolygon as GeoJSON
//                 const geoJsonElement = (
//                   <GeoJSON
//                     key={`vuln-geojson-${i}`}
//                     data={geom}
//                     style={{
//                       color: "red",
//                       weight: 1,
//                       fillOpacity: 0.3,
//                     }}
//                   />
//                 );

//                 // Centroid marker for reference
//                 const centroid = turf.centroid(geom);
//                 const markerElement = (
//                   <Marker
//                     key={`vuln-marker-${i}`}
//                     position={[
//                       centroid.geometry.coordinates[1],
//                       centroid.geometry.coordinates[0],
//                     ]}
//                     icon={redIcon}
//                   >
//                     <Popup>Vulnerable Zone</Popup>
//                   </Marker>
//                 );

//                 return (
//                   <React.Fragment key={i}>
//                     {geoJsonElement}
//                     {markerElement}
//                   </React.Fragment>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay> */}

//           <LayersControl.Overlay checked name="Vulnerable Zones">
//   <LayerGroup>
//     {vulnerableData.map((zone, i) => {
//       try {
//         const geom = JSON.parse(zone.geometry);
//         return (
//           <GeoJSON
//             key={`vuln-${i}`}
//             data={geom}
//             style={{
//               color: "red",
//               weight: 2,
//               fillOpacity: 0.4,
//             }}
//           />
//         );
//       } catch (err) {
//         console.error("Invalid GeoJSON at index", i, err);
//         return null;
//       }
//     })}
//   </LayerGroup>
// </LayersControl.Overlay>


//           {/* 🏥 Hospitals */}
//           <LayersControl.Overlay name="Hospitals">
//             <LayerGroup>
//               {hospitalData.map((hosp, i) => {
//                 const geom = JSON.parse(hosp.geometry);
//                 return (
//                   <Marker
//                     key={`hosp-${i}`}
//                     position={[geom.coordinates[1], geom.coordinates[0]]}
//                     icon={hospitalIcon}
//                   >
//                     <Popup>{hosp.name || "Hospital"}</Popup>
//                   </Marker>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* 🏠 Shelters */}
//           <LayersControl.Overlay name="Shelters">
//             <LayerGroup>
//               {shelterData.map((shel, i) => {
//                 const geom = JSON.parse(shel.geometry);
//                 return (
//                   <Marker
//                     key={`shel-${i}`}
//                     position={[geom.coordinates[1], geom.coordinates[0]]}
//                     icon={shelterIcon}
//                   >
//                     <Popup>{shel.shelter_name || "Shelter"}</Popup>
//                   </Marker>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>
//         </LayersControl>
//       </MapContainer>
//     </div>
//   );
// };

// export default Maps;

import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  LayerGroup,
  GeoJSON,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";
import "./maps.css";

// Custom icons
const redIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252039.png",
  iconSize: [25, 25],
});

const hospitalIcon = new L.Icon({
  iconUrl:
    "https://e7.pngegg.com/pngimages/618/567/png-clipart-red-cross-illustration-hospital-plus-and-minus-signs-symbol-american-red-cross-red-cross-miscellaneous-angle.png",
  iconSize: [20, 20],
});

const shelterIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/69/69524.png",
  iconSize: [28, 28],
});

const parseGeometry = (geometry) => {
  if (!geometry) return null;
  if (typeof geometry === "string") {
    try {
      return JSON.parse(geometry);
    } catch {
      return null;
    }
  }
  if (typeof geometry === "object") return geometry;
  return null;
};

const Maps = () => {
  const [hospitalData, setHospitalData] = useState([]);
  const [shelterData, setShelterData] = useState([]);
  const [vulnerableData, setVulnerableData] = useState([]);
  const mapRef = useRef();
  const zoneStyle = {
    weight: 1.2,
    opacity: 0.8,
    fill: false,
    fillOpacity: 0,
  };

  // Fetch hospitals and shelters (small datasets)
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const hospRes = await axios.get("http://localhost:5001/api/hospitals");
        const shelterRes = await axios.get("http://localhost:5001/api/shelters");
        setHospitalData(hospRes.data);
        setShelterData(shelterRes.data);
      } catch (err) {
        console.error("Error fetching hospitals/shelters:", err);
      }
    };
    fetchStaticData();
  }, []);

  // ✅ Fetch vulnerable zones dynamically when map moves
  const FetchZonesOnMove = () => {
    const map = useMapEvents({
      moveend: async () => {
        const bounds = map.getBounds();
        const minLng = bounds.getWest();
        const minLat = bounds.getSouth();
        const maxLng = bounds.getEast();
        const maxLat = bounds.getNorth();

        try {
          const res = await axios.get(
            `http://localhost:5001/api/vulernable_zone?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`
          );

          setVulnerableData(res.data);
          console.log(`✅ Loaded ${res.data.length} zones in this view`);
        } catch (err) {
          console.error("Error fetching vulnerable zones:", err);
        }
      },
    });
    return null;
  };

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <MapContainer
        center={[19.076, 72.8777]}
        zoom={13}
        style={{ height: "100%", width: "100%", borderRadius: "16px" }}
        whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Dynamic data loader */}
        <FetchZonesOnMove />

        <LayersControl position="topright">
          {/* 🔴 Vulnerable Zones */}
          {/* <LayersControl.Overlay checked name="Vulnerable Zones">
            <LayerGroup>
              {vulnerableData.map((zone, i) => {
                try {
                  const geom = JSON.parse(zone.geometry);
                  return (
                    <GeoJSON
                      key={`vuln-${i}`}
                      data={geom}
                      style={{
                        color: "red",
                        weight: 1,
                        fillOpacity: 0.3,
                      }}
                    />
                  );
                } catch (err) {
                  console.warn("Invalid GeoJSON at index", i);
                  return null;
                }
              })}
            </LayerGroup>
          </LayersControl.Overlay> */}

          {/* <LayersControl.Overlay checked name="Vulnerable Zones">
            <LayerGroup>
              {vulnerableData.map((zone, i) => {
                try {
                  const geom = JSON.parse(zone.geometry);

                  // 🎨 Set color based on Vul_Class
                  let color = "red";
                  if (zone.Vul_Class === "High") color = "#FF0000";     // Bright Red
                  else if (zone.Vul_Class === "Medium") color = "#FFA500"; // Orange
                  else if (zone.Vul_Class === "Low") color = "#00FF00";    // Green

                  return (
                    <GeoJSON
                      key={`vuln-${zone.id || i}`}
                      data={geom}
                      style={{
                        color: color,
                        weight: 1,
                        fillOpacity: 0.4,
                      }}
                    >
                      <Popup>
                        <b>Zone ID:</b> {zone.id} <br />
                        <b>Vulnerability:</b> {zone.vul_class}
                      </Popup>
                    </GeoJSON>
                  );
                } catch (err) {
                  console.warn("Invalid GeoJSON at index", i);
                  return null;
                }
              })}
            </LayerGroup>
          </LayersControl.Overlay> */}


          {/* 🧭 VULNERABILITY ZONES LAYERS */}
<LayersControl.Overlay name="All Vulnerable Zones">
  <LayerGroup>
    {vulnerableData.map((zone, i) => {
      try {
        const geom = parseGeometry(zone.geometry);
        if (!geom) return null;
        let color = "#FF0000"; // Default: High
        if (zone.Vul_Class === "Medium") color = "#FFA500";
        else if (zone.Vul_Class === "Low") color = "#00FF00";

        return (
          <GeoJSON
            key={`vuln-all-${zone.id || i}`}
            data={geom}
            style={{
              color,
              ...zoneStyle,
            }}
          >
            <Popup>
              <b>Zone ID:</b> {zone.id} <br />
              <b>Vulnerability:</b> {zone.Vul_Class}
            </Popup>
          </GeoJSON>
        );
      } catch (err) {
        console.warn("Invalid GeoJSON at index", i);
        return null;
      }
    })}
  </LayerGroup>
</LayersControl.Overlay>

{/* 🔴 HIGH ZONES */}
<LayersControl.Overlay name="High Zones">
  <LayerGroup>
    {vulnerableData
      .filter((zone) => zone.Vul_Class === "High")
      .map((zone, i) => {
        const geom = parseGeometry(zone.geometry);
        if (!geom) return null;
        return (
          <GeoJSON
            key={`vuln-high-${zone.id || i}`}
            data={geom}
            style={{
              color: "#FF0000",
              ...zoneStyle,
            }}
          >
            <Popup>
              <b>Zone ID:</b> {zone.id} <br />
              <b>Vulnerability:</b> High
            </Popup>
          </GeoJSON>
        );
      })}
  </LayerGroup>
</LayersControl.Overlay>

{/* 🟧 MEDIUM ZONES */}
<LayersControl.Overlay name="Medium Zones">
  <LayerGroup>
    {vulnerableData
      .filter((zone) => zone.Vul_Class === "Medium")
      .map((zone, i) => {
        const geom = parseGeometry(zone.geometry);
        if (!geom) return null;
        return (
          <GeoJSON
            key={`vuln-medium-${zone.id || i}`}
            data={geom}
            style={{
              color: "#FFA500",
              ...zoneStyle,
            }}
          >
            <Popup>
              <b>Zone ID:</b> {zone.id} <br />
              <b>Vulnerability:</b> Medium
            </Popup>
          </GeoJSON>
        );
      })}
  </LayerGroup>
</LayersControl.Overlay>

{/* 🟩 LOW ZONES */}
<LayersControl.Overlay name="Low Zones">
  <LayerGroup>
    {vulnerableData
      .filter((zone) => zone.Vul_Class === "Low")
      .map((zone, i) => {
        const geom = parseGeometry(zone.geometry);
        if (!geom) return null;
        return (
          <GeoJSON
            key={`vuln-low-${zone.id || i}`}
            data={geom}
            style={{
              color: "#00FF00",
              ...zoneStyle,
            }}
          >
            <Popup>
              <b>Zone ID:</b> {zone.id} <br />
              <b>Vulnerability:</b> Low
            </Popup>
          </GeoJSON>
        );
      })}
  </LayerGroup>
</LayersControl.Overlay>


          {/* 🏥 Hospitals */}
          <LayersControl.Overlay name="Hospitals">
            <LayerGroup>
              {hospitalData.map((hosp, i) => {
                const geom = parseGeometry(hosp.geometry);
                if (!geom?.coordinates) return null;
                return (
                  <Marker
                    key={`hosp-${i}`}
                    position={[geom.coordinates[1], geom.coordinates[0]]}
                    icon={hospitalIcon}
                  >
                    <Popup>{hosp.name || "Hospital"}</Popup>
                  </Marker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>

          {/* 🏠 Shelters */}
          <LayersControl.Overlay name="Shelters">
            <LayerGroup>
              {shelterData.map((shel, i) => {
                const geom = parseGeometry(shel.geometry);
                if (!geom?.coordinates) return null;
                return (
                  <Marker
                    key={`shel-${i}`}
                    position={[geom.coordinates[1], geom.coordinates[0]]}
                    icon={shelterIcon}
                  >
                    <Popup>{shel.shelter_name || "Shelter"}</Popup>
                  </Marker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
};

export default Maps;  //working version with dynamic fetching of vulnerable zones

// import React, { useEffect, useState, useRef } from "react";
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   LayersControl,
//   LayerGroup,
//   GeoJSON,
//   useMapEvents,
// } from "react-leaflet";
// import L from "leaflet";
// import axios from "axios";
// import "leaflet/dist/leaflet.css";
// import "./maps.css";

// // Custom icons
// const hospitalIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/1483/1483336.png",
//   iconSize: [25, 25],
// });

// const shelterIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/69/69524.png",
//   iconSize: [28, 28],
// });

// const Maps = () => {
//   const [hospitalData, setHospitalData] = useState([]);
//   const [shelterData, setShelterData] = useState([]);
//   const [vulnerableData, setVulnerableData] = useState([]);
//   const mapRef = useRef();
//   const fetchingRef = useRef(false); // prevent duplicate fetches

//   // Fetch hospitals and shelters once
//   useEffect(() => {
//     const fetchStaticData = async () => {
//       try {
//         const [hospRes, shelterRes] = await Promise.all([
//           axios.get("http://localhost:5001/api/hospitals"),
//           axios.get("http://localhost:5001/api/shelters"),
//         ]);
//         setHospitalData(hospRes.data);
//         setShelterData(shelterRes.data);
//       } catch (err) {
//         console.error("Error fetching hospitals/shelters:", err);
//       }
//     };
//     fetchStaticData();
//   }, []);

//   // Incremental zone loading
//   const fetchZonesChunk = async (minLng, minLat, maxLng, maxLat, offset = 0, allData = []) => {
//     if (fetchingRef.current) return allData; // skip if already fetching
//     fetchingRef.current = true;

//     try {
//       const res = await axios.get(
//         `http://localhost:5001/api/vulernable_zone?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}&offset=${offset}&limit=10000`
//       );

//       const newZones = res.data;
//       const mergedData = [...allData, ...newZones];
//       console.log(`✅ Loaded ${newZones.length} zones (Total: ${mergedData.length})`);

//       // If got full 10k, maybe more data exists → fetch next chunk
//       if (newZones.length === 10000) {
//         fetchingRef.current = false;
//         return fetchZonesChunk(minLng, minLat, maxLng, maxLat, offset + 10000, mergedData);
//       } else {
//         fetchingRef.current = false;
//         return mergedData;
//       }
//     } catch (err) {
//       fetchingRef.current = false;
//       console.error("Error fetching vulnerable zones:", err);
//       return allData;
//     }
//   };

//   // Fetch when map moves
//   const FetchZonesOnMove = () => {
//     const map = useMapEvents({
//       moveend: async () => {
//         const bounds = map.getBounds();
//         const minLng = bounds.getWest();
//         const minLat = bounds.getSouth();
//         const maxLng = bounds.getEast();
//         const maxLat = bounds.getNorth();

//         const zones = await fetchZonesChunk(minLng, minLat, maxLng, maxLat);
//         setVulnerableData(zones);
//       },
//     });
//     return null;
//   };

//   return (
//     <div style={{ height: "80vh", width: "100%" }}>
//       <MapContainer
//         center={[19.076, 72.8777]}
//         zoom={13}
//         style={{ height: "100%", width: "100%", borderRadius: "16px" }}
//         whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
//       >
//         <TileLayer
//           attribution='&copy; <a href="http://osm.org/">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {/* Dynamic zones loader */}
//         <FetchZonesOnMove />

//         <LayersControl position="topright">
//           {/* 🔴 Vulnerable Zones */}
//           <LayersControl.Overlay checked name="Vulnerable Zones">
//             <LayerGroup>
//               {vulnerableData.map((zone, i) => {
//                 try {
//                   const geom = JSON.parse(zone.geometry);
//                   return (
//                     // <GeoJSON
//                     //   key={`vuln-${zone.id || i}`}
//                     //   data={geom}
//                     //   style={{
//                     //     color: "red",
//                     //     weight: 1,
//                     //     fillOpacity: 0.3,
//                     //   }}
//                     // />
//                     <GeoJSON
//                       key={`vuln-${zone.id || i}-${Math.random()}`}
//                       data={geom}
//                       style={{
//                         color: "red",
//                         weight: 1,
//                         fillOpacity: 0.3,
//                       }}
//                     />


//                   );
//                 } catch {
//                   return null;
//                 }
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* 🏥 Hospitals */}
//           <LayersControl.Overlay name="Hospitals">
//             <LayerGroup>
//               {hospitalData.map((hosp, i) => {
//                 const geom = JSON.parse(hosp.geometry);
//                 return (
//                   <Marker
//                     key={`hosp-${i}`}
//                     position={[geom.coordinates[1], geom.coordinates[0]]}
//                     icon={hospitalIcon}
//                   >
//                     <Popup>{hosp.name || "Hospital"}</Popup>
//                   </Marker>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>

//           {/* 🏠 Shelters */}
//           <LayersControl.Overlay name="Shelters">
//             <LayerGroup>
//               {shelterData.map((shel, i) => {
//                 const geom = JSON.parse(shel.geometry);
//                 return (
//                   <Marker
//                     key={`shel-${i}`}
//                     position={[geom.coordinates[1], geom.coordinates[0]]}
//                     icon={shelterIcon}
//                   >
//                     <Popup>{shel.shelter_name || "Shelter"}</Popup>
//                   </Marker>
//                 );
//               })}
//             </LayerGroup>
//           </LayersControl.Overlay>
//         </LayersControl>
//       </MapContainer>
//     </div>
//   );
// };

// export default Maps;  pagination working version
