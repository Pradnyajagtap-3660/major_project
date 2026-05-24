const https = require('https');
const pool = require('../db');

// Approximate coordinates of major Mumbai areas for DB flood risk lookup
const MUMBAI_AREAS = {
  kurla: [72.8851, 19.0771],
  dharavi: [72.8519, 19.0417],
  sion: [72.8619, 19.0397],
  andheri: [72.8462, 19.1197],
  bandra: [72.8347, 19.0601],
  juhu: [72.8296, 19.1075],
  dadar: [72.8425, 19.0178],
  chembur: [72.8997, 19.0619],
  ghatkopar: [72.9081, 19.0868],
  vikhroli: [72.9202, 19.1085],
  bhandup: [72.9392, 19.1463],
  mulund: [72.9568, 19.1764],
  powai: [72.9069, 19.1271],
  malad: [72.8481, 19.1867],
  borivali: [72.8567, 19.2329],
  kandivali: [72.8378, 19.2048],
  goregaon: [72.8496, 19.1664],
  worli: [72.8215, 19.0102],
  matunga: [72.8601, 19.0255],
  colaba: [72.8128, 18.9066],
  thane: [72.9781, 19.2183],
  jogeshwari: [72.8481, 19.1317],
  mankhurd: [72.9268, 19.0508],
  govandi: [72.9188, 19.0577],
  trombay: [72.9381, 19.04],
  byculla: [72.8371, 18.9784],
  mumbai: [72.8777, 19.0760],
  'vile parle': [72.8492, 19.1],
  santacruz: [72.8380, 19.0811],
  'lbs marg': [72.8772, 19.0814],
};

function detectArea(message) {
  const lower = message.toLowerCase();
  const sorted = Object.keys(MUMBAI_AREAS).sort((a, b) => b.length - a.length);
  for (const area of sorted) {
    if (lower.includes(area)) return area;
  }
  return null;
}

function riskLevel(r) {
  if (r < 0.4) return 'LOW';
  if (r < 0.7) return 'MODERATE';
  return 'HIGH';
}

function riskAdvice(level) {
  if (level === 'HIGH') {
    return 'High risk route. Prefer evacuation support, avoid waterlogged stretches, and follow BMC alerts (1916).';
  }
  if (level === 'MODERATE') {
    return 'Moderate risk route. Travel only if necessary and avoid low-lying roads during heavy rain.';
  }
  return 'Low risk route currently, but keep monitoring weather and official advisories.';
}

async function getAreaRiskFromDB(lon, lat) {
  const result = await pool.query(
    `SELECT AVG(flood_risk) AS avg_risk, MAX(flood_risk) AS max_risk, COUNT(*) AS road_count
     FROM roads_in_risk
     WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, 1200)`,
    [lon, lat]
  );

  const row = result.rows[0];
  if (!row || !row.avg_risk || parseInt(row.road_count, 10) === 0) return null;

  return {
    avgRisk: parseFloat(row.avg_risk),
    maxRisk: parseFloat(row.max_risk),
    roadCount: parseInt(row.road_count, 10),
  };
}

async function getHospitalNameExpr() {
  const cols = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'hospital';`
  );

  const names = new Set(cols.rows.map((r) => r.column_name));
  if (names.has('name')) return "NULLIF(name, '')";
  if (names.has('hospital')) return "NULLIF(hospital, '')";
  if (names.has('tags')) return "NULLIF(tags->>'name', '')";
  return "NULLIF(amenity, '')";
}

async function getNearestShelters(lon, lat, limit = 3) {
  const result = await pool.query(
    `SELECT
      COALESCE(NULLIF(name, ''), 'Shelter') AS name,
      ST_Distance(geom::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) / 1000.0 AS distance_km
     FROM shelter
     ORDER BY geom <-> ST_SetSRID(ST_Point($1, $2), 4326)
     LIMIT $3`,
    [lon, lat, limit]
  );

  return result.rows.map((r) => ({
    name: r.name,
    distanceKm: parseFloat(parseFloat(r.distance_km).toFixed(2)),
  }));
}

async function getNearestHospitals(lon, lat, limit = 3) {
  const preferredName = await getHospitalNameExpr();
  const nameExpr = `COALESCE(${preferredName}, NULLIF(amenity, ''), 'Hospital')`;

  const result = await pool.query(
    `SELECT
      ${nameExpr} AS name,
      ST_Distance(geom::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) / 1000.0 AS distance_km
     FROM hospital
     ORDER BY geom <-> ST_SetSRID(ST_Point($1, $2), 4326)
     LIMIT $3`,
    [lon, lat, limit]
  );

  return result.rows.map((r) => ({
    name: r.name,
    distanceKm: parseFloat(parseFloat(r.distance_km).toFixed(2)),
  }));
}

function fetchOSRMDirectRoute(startLon, startLat, endLon, endLat) {
  return new Promise((resolve) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code === 'Ok' && parsed.routes?.length) {
            resolve(parsed.routes[0]);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function fetchOSRMAlternatives(startLon, startLat, endLon, endLat) {
  return new Promise((resolve) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&alternatives=true`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code === 'Ok' && Array.isArray(parsed.routes)) {
            resolve(parsed.routes);
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

function getOffsetWaypoint(startLon, startLat, endLon, endLat, offsetMeters) {
  const midLon = (startLon + endLon) / 2;
  const midLat = (startLat + endLat) / 2;

  const dLon = endLon - startLon;
  const dLat = endLat - startLat;
  const len = Math.sqrt(dLon * dLon + dLat * dLat) || 1;

  const perpLon = -dLat / len;
  const perpLat = dLon / len;
  const degreeOffset = offsetMeters / 111000;

  return {
    lon: midLon + perpLon * degreeOffset,
    lat: midLat + perpLat * degreeOffset,
  };
}

async function fetchHybridRouteOptions(startLon, startLat, endLon, endLat) {
  const osrmRoutes = await fetchOSRMAlternatives(startLon, startLat, endLon, endLat);

  const straightLineDeg = Math.sqrt(
    Math.pow(endLon - startLon, 2) + Math.pow(endLat - startLat, 2)
  );
  const straightLineMeters = straightLineDeg * 111000;
  const wpOffsetSmall = Math.min(300, Math.max(150, straightLineMeters * 0.2));
  const wpOffsetLarge = Math.min(800, Math.max(400, straightLineMeters * 0.5));

  const wp1 = getOffsetWaypoint(startLon, startLat, endLon, endLat, wpOffsetSmall);
  const wp2 = getOffsetWaypoint(startLon, startLat, endLon, endLat, -wpOffsetSmall);
  const wp3 = getOffsetWaypoint(startLon, startLat, endLon, endLat, wpOffsetLarge);
  const wp4 = getOffsetWaypoint(startLon, startLat, endLon, endLat, -wpOffsetLarge);

  const wpRoutes = await Promise.all([
    fetchOSRMRouteVia(startLon, startLat, endLon, endLat, wp1.lon, wp1.lat),
    fetchOSRMRouteVia(startLon, startLat, endLon, endLat, wp2.lon, wp2.lat),
    fetchOSRMRouteVia(startLon, startLat, endLon, endLat, wp3.lon, wp3.lat),
    fetchOSRMRouteVia(startLon, startLat, endLon, endLat, wp4.lon, wp4.lat),
  ]);

  const allRoutes = [...osrmRoutes];
  for (const r of wpRoutes) {
    if (r) allRoutes.push(r);
  }

  if (!allRoutes.length) return [];

  const osrmRefDist = osrmRoutes.length > 0
    ? osrmRoutes[0].distance
    : Math.min(...allRoutes.map((r) => r.distance));
  const maxAllowedDist = Math.max(osrmRefDist * 3.5, straightLineMeters * 4);
  const filteredRoutes = allRoutes.filter((r) => r.distance <= maxAllowedDist);
  const absoluteMaxDist = Math.max(osrmRefDist * 4, straightLineMeters * 5);
  const fallbackRoutes = allRoutes.filter((r) => r.distance <= absoluteMaxDist);
  const routePool = filteredRoutes.length >= 2 ? filteredRoutes
    : fallbackRoutes.length >= 2 ? fallbackRoutes
    : allRoutes;

  const routesWithRisk = [];
  for (const route of routePool) {
    const risk = await analyzeRouteRisk(route.geometry.coordinates);
    const avgRisk = parseFloat(risk?.avg_risk) || 0;
    const maxRisk = parseFloat(risk?.max_risk) || 0;
    routesWithRisk.push({ route, avgRisk, maxRisk });
  }

  routesWithRisk.sort((a, b) => a.avgRisk - b.avgRisk);

  const distinct = [];
  for (const candidate of routesWithRisk) {
    if (distinct.length >= 3) break;
    const tooSimilarRisk = distinct.some((r) => Math.abs(r.avgRisk - candidate.avgRisk) < 0.02);
    const tooSimilarDist = distinct.some(
      (r) => Math.abs(r.route.distance - candidate.route.distance) / Math.max(r.route.distance, candidate.route.distance) < 0.05
    );
    if (!tooSimilarRisk && !tooSimilarDist) {
      distinct.push(candidate);
    }
  }
  for (const candidate of routesWithRisk) {
    if (distinct.length >= 3) break;
    if (!distinct.includes(candidate)) distinct.push(candidate);
  }
  distinct.sort((a, b) => a.avgRisk - b.avgRisk);

  return distinct.map((candidate, i) => {
    const level = riskLevel(candidate.avgRisk);
    const routeType = i === 0 ? 'Safest Route' : level === 'LOW' ? 'Safe Alternative' : level === 'MODERATE' ? 'Moderate Route' : 'High Risk Route';
    return {
      rank: i + 1,
      routeType,
      level,
      avgRisk: candidate.avgRisk,
      maxRisk: candidate.maxRisk,
      distanceKm: parseFloat((candidate.route.distance / 1000).toFixed(2)),
      durationMin: Math.round(candidate.route.duration / 60),
    };
  });
}

function fetchOSRMRouteVia(startLon, startLat, endLon, endLat, viaLon, viaLat) {
  return new Promise((resolve) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${viaLon},${viaLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code === 'Ok' && parsed.routes?.length) {
            resolve(parsed.routes[0]);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function analyzeRouteRisk(routeCoordinates) {
  const lineString = `LINESTRING(${routeCoordinates.map((c) => `${c[0]} ${c[1]}`).join(',')})`;
  const result = await pool.query(
    `SELECT
      AVG(flood_risk) AS avg_risk,
      MAX(flood_risk) AS max_risk,
      COUNT(*) AS risky_segments
     FROM roads_in_risk
     WHERE ST_DWithin(geom, ST_GeomFromText($1, 4326), 0.001)
       AND flood_risk > 0.3`,
    [lineString]
  );

  return result.rows[0];
}

async function findDestinationByName(destinationText, userLon, userLat) {
  const text = destinationText.trim();
  if (!text) return null;
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!normalizedText) return null;

  const preferredHospitalName = await getHospitalNameExpr();
  const hospitalNameExpr = preferredHospitalName
    ? `COALESCE(${preferredHospitalName}, NULLIF(amenity, ''), 'Hospital')`
    : `COALESCE(NULLIF(amenity, ''), 'Hospital')`;
  const shelterNameExpr = `COALESCE(NULLIF(name, ''), 'Shelter')`;
  const shelterNormExpr = `regexp_replace(lower(${shelterNameExpr}), '[^a-z0-9]+', '', 'g')`;
  const hospitalNormExpr = `regexp_replace(lower(${hospitalNameExpr}), '[^a-z0-9]+', '', 'g')`;

  const result = await pool.query(
    `WITH candidates AS (
      SELECT
        'shelter'::text AS kind,
        ${shelterNameExpr} AS name,
        ST_X(geom) AS lon,
        ST_Y(geom) AS lat,
        ST_Distance(geom::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography) / 1000.0 AS distance_km
      FROM shelter
      WHERE ${shelterNameExpr} ILIKE $1 OR ${shelterNormExpr} LIKE '%' || $4 || '%'
      UNION ALL
      SELECT
        'hospital'::text AS kind,
        ${hospitalNameExpr} AS name,
        ST_X(geom) AS lon,
        ST_Y(geom) AS lat,
        ST_Distance(geom::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography) / 1000.0 AS distance_km
      FROM hospital
      WHERE ${hospitalNameExpr} ILIKE $1 OR ${hospitalNormExpr} LIKE '%' || $4 || '%'
    )
    SELECT kind, name, lon, lat, distance_km
    FROM candidates
    ORDER BY distance_km ASC
    LIMIT 1`,
    [`%${text}%`, userLon, userLat, normalizedText]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    kind: row.kind,
    name: row.name,
    lon: parseFloat(row.lon),
    lat: parseFloat(row.lat),
    distanceKmFromUser: parseFloat(parseFloat(row.distance_km).toFixed(2)),
  };
}

function extractDestinationFromRouteQuery(message) {
  const text = message.trim().replace(/[?.!]+$/g, '');
  const patterns = [
    /(?:how do i get to|how to get to|how to reach|directions to|way to|navigate to|take me to|route to|can i go to|should i go to)\s+(.+)$/i,
    /(?:risk to get to|risk to reach|route risk to|how risky is it to reach|how risky is it to get to)\s+(.+)$/i,
    /(?:how far is|eta to|time to reach|time to get to)\s+(.+)$/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }

  const lower = text.toLowerCase();
  const toIndex = lower.lastIndexOf(' to ');
  if (toIndex >= 0) return text.slice(toIndex + 4).trim();

  return '';
}

async function getLocationContext(location) {
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    return null;
  }

  const { lat, lon } = location;
  const [risk, shelters, hospitals] = await Promise.all([
    getAreaRiskFromDB(lon, lat),
    getNearestShelters(lon, lat, 3),
    getNearestHospitals(lon, lat, 3),
  ]);

  return { lat, lon, risk, shelters, hospitals };
}

function buildLocationSummary(locationContext) {
  if (!locationContext) return 'No live user location was provided.';

  const riskText = locationContext.risk
    ? `Local flood risk: avg ${(locationContext.risk.avgRisk * 100).toFixed(0)}%, max ${(locationContext.risk.maxRisk * 100).toFixed(0)}%, level ${riskLevel(locationContext.risk.avgRisk)}.`
    : 'Local flood risk data: unavailable.';

  const shelters = locationContext.shelters.length
    ? locationContext.shelters.map((s) => `${s.name} (${s.distanceKm} km)`).join(', ')
    : 'No nearby shelters found.';

  const hospitals = locationContext.hospitals.length
    ? locationContext.hospitals.map((h) => `${h.name} (${h.distanceKm} km)`).join(', ')
    : 'No nearby hospitals found.';

  return `${riskText} Nearest shelters: ${shelters}. Nearest hospitals: ${hospitals}.`;
}

function callOpenAIChat(messages, model) {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const isGroq = !!process.env.GROQ_API_KEY;
  console.log(`[LLM] Using ${isGroq ? 'Groq' : 'OpenAI'}, key present: ${!!apiKey}`);
  if (!apiKey) return Promise.resolve(null);
  const groqModel = 'llama-3.1-8b-instant';

  const payload = JSON.stringify({
    model: isGroq ? groqModel : model,
    temperature: 0.2,
    messages,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: isGroq ? 'api.groq.com' : 'api.openai.com',
        path: isGroq ? '/openai/v1/chat/completions' : '/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              console.error(`[LLM] API error status ${res.statusCode}:`, data);
              return resolve(null);
            }

            const parsed = JSON.parse(data);
            const text = parsed?.choices?.[0]?.message?.content?.trim();
            resolve(text || null);
          } catch (e) {
            console.error('[LLM] Parse error:', e.message, data.slice(0, 200));
            resolve(null);
          }
        });
      }
    );

    req.on('error', (e) => { console.error('[LLM] Request error:', e.message); resolve(null); });
    req.write(payload);
    req.end();
  });
}

function getRuleBasedReply(message, locationContext) {
  const lower = message.toLowerCase().trim();

  if (/^(hi|hello|hey|hii|namaste|good morning|good evening|good afternoon)\b/.test(lower)) {
    return "Hello! 👋 I'm your Flood Safety Assistant. Share your question, and I can guide you using your location-based flood risk data when available.";
  }

  if (/contact|helpline|number|call|emergency|ndrf|police|ambulance|fire/.test(lower)) {
    return '📞 Emergency Contacts (Mumbai):\n• Fire: 101\n• Ambulance: 108\n• Police: 100\n• BMC Disaster Management: 1916\n• NDRF: 011-24363260';
  }

  if (locationContext && /near me|my area|around me|here|current location|nearby/.test(lower)) {
    return `📍 Based on your location:\n${buildLocationSummary(locationContext)}`;
  }

  const area = detectArea(lower);
  if (area) {
    return `I detected *${area}*. Ask me things like:\n• flood risk in ${area}\n• nearest shelter near ${area}\n• safest action during heavy rain`;
  }

  if (/during flood|what to do|stay safe|advice|help/.test(lower)) {
    return '🌊 During flood:\n1. Move to higher ground quickly\n2. Avoid walking/driving through water\n3. Switch off electricity if water enters\n4. Follow BMC alerts and evacuate early when told';
  }

  if (/evacuation guide|evacuat|how to evacuate/.test(lower)) {
    return '🚶 Evacuation guide:\n1. Leave early when alerts are issued\n2. Carry medicines, documents, water, phone charger\n3. Use nearest shelter route in app\n4. Avoid underpasses/low-lying roads\n5. Inform family and check on elderly neighbors';
  }

  if (/before flood|prepare|preparedness|emergency kit|flood kit|ready for flood/.test(lower)) {
    return '📦 Before flood preparedness:\n1. Keep medicines, first-aid, torch, batteries\n2. Store documents in waterproof pouch\n3. Save emergency contacts (100, 101, 108, 1916)\n4. Keep phone/power bank charged\n5. Know nearest shelter and route';
  }

  if (/after flood|return home|after water recedes|post flood/.test(lower)) {
    return '🏠 After flood safety:\n1. Return only after official clearance\n2. Avoid fallen wires and contaminated water\n3. Boil drinking water\n4. Check structural/electrical safety before entering\n5. Seek medical care for cuts/infections';
  }

  if (/stuck in car|car in water|vehicle in water|car stalled|engine stalled/.test(lower)) {
    return '🚗 If your vehicle is stuck in floodwater:\n1. Do not restart engine\n2. Exit quickly if water rises\n3. Move to higher ground\n4. Call emergency services if trapped\n5. Avoid underpasses during heavy rain';
  }

  if (/power cut|electric|electrocution|shock risk|main switch/.test(lower)) {
    return '⚡ Electrical safety:\n1. Turn off main power if water enters home\n2. Do not touch wet appliances/sockets\n3. Stay away from fallen power lines\n4. Call electricity emergency support immediately';
  }

  if (/route risk levels|risk levels|safe route meaning|moderate route meaning|high risk route meaning/.test(lower)) {
    return 'Route risk levels in this app:\n• Safe: avg route flood risk < 40%\n• Moderate: avg route flood risk 40% to <70%\n• High Risk: avg route flood risk >= 70%\n\nSafest Route = the lowest-risk option among available routes.';
  }

  return 'I can help with: flood risk near your location, nearest shelters/hospitals, evacuation guidance, and emergency contacts. Ask: "What is flood risk near me?"';
}

async function getReply(message, location) {
  const locationContext = await getLocationContext(location);
  const lower = message.toLowerCase();

  const asksNearestShelter = /nearest shelter|closest shelter|shelter near me|nearby shelter/.test(lower);
  const asksNearestHospital = /nearest hospital|closest hospital|hospital near me|nearby hospital/.test(lower);

  if (asksNearestShelter || asksNearestHospital) {
    const mentionedArea = detectArea(lower);

    let searchLon, searchLat, areaLabel;
    if (mentionedArea) {
      [searchLon, searchLat] = MUMBAI_AREAS[mentionedArea];
      areaLabel = mentionedArea[0].toUpperCase() + mentionedArea.slice(1);
    } else if (locationContext) {
      searchLon = locationContext.lon;
      searchLat = locationContext.lat;
      areaLabel = 'your location';
    } else {
      return 'Please enable location or mention a Mumbai area (e.g. "nearest shelter in Kurla") so I can find results.';
    }

    if (asksNearestShelter) {
      const shelters = await getNearestShelters(searchLon, searchLat, 3);
      if (!shelters.length) return `I could not find nearby shelters in ${areaLabel} right now.`;
      const lines = shelters.map((s) => `• ${s.name} (${s.distanceKm} km)`);
      return [`🏕️ Nearest shelters near ${areaLabel}:`, ...lines, 'Ask: "How do I get to <shelter name>?" for route options.'].join('\n');
    }

    const hospitals = await getNearestHospitals(searchLon, searchLat, 3);
    if (!hospitals.length) return `I could not find nearby hospitals in ${areaLabel} right now.`;
    const lines = hospitals.map((h) => `• ${h.name} (${h.distanceKm} km)`);
    return [`🏥 Nearest hospitals near ${areaLabel}:`, ...lines, 'Ask: "How do I get to <hospital name>?" for route options.'].join('\n');
  }

  const asksRouteRisk = /risk to get to|risk to reach|route risk to|safe to go to|safest route to|how risky is.*to|get to .*risk|reach .*risk|can i go to|should i go to/.test(lower);
  const asksDirections = /how do i get to|how to get to|how to reach|directions to|way to|navigate to|take me to|route to|how far is|eta to|time to reach|time to get to/.test(lower);
  const routeIntent = asksRouteRisk || asksDirections;

  if (routeIntent) {
    if (!location || Number.isNaN(location.lat) || Number.isNaN(location.lon)) {
      return 'Please enable location so I can calculate route risk from your current position.';
    }

    const destinationRaw = extractDestinationFromRouteQuery(message);
    if (!destinationRaw) {
      return 'Tell me the destination name, for example: "What is the risk to get to S.M. Shetty School Ground?"';
    }

    const destination = await findDestinationByName(destinationRaw, location.lon, location.lat);
    if (!destination) {
      return `I couldn't find "${destinationRaw}" in nearby shelters/hospitals. Try a shorter or exact name.`;
    }

    const options = await fetchHybridRouteOptions(location.lon, location.lat, destination.lon, destination.lat);
    if (!options.length) {
      return `I found ${destination.name}, but couldn't calculate route options right now. Please try again.`;
    }
    const safest = options[0];
    const optionLines = options.map((opt) =>
      `• ${opt.routeType}: ${opt.distanceKm} km (${opt.durationMin} min), avg risk ${(opt.avgRisk * 100).toFixed(0)}%, max ${(opt.maxRisk * 100).toFixed(0)}%`
    );

    if (asksDirections && !asksRouteRisk) {
      return [
        `🧭 Best way to reach ${destination.name} (${destination.kind}):`,
        ...optionLines,
        `✅ Recommended: ${safest.routeType} (${safest.distanceKm} km, ${safest.durationMin} min)`,
        `⚠️ Flood risk on recommended route: ${(safest.avgRisk * 100).toFixed(0)}% (${safest.level})`,
        `In the app: Safe Route Finder -> ${destination.kind === 'shelter' ? 'Shelters' : 'Hospitals'} -> "${destination.name}" -> Navigate.`,
      ].join('\n');
    }

    return [
      `📍 Route risk to ${destination.name} (${destination.kind}):`,
      ...optionLines,
      `• Nearby straight-line distance: ${destination.distanceKmFromUser} km`,
      `✅ Recommended: ${safest.routeType}`,
      `⚠️ ${riskAdvice(safest.level)}`,
    ].join('\n');
  }

  // Deterministic answer for area-risk questions to keep numbers grounded in DB.
  const detectedArea = detectArea(message);
  const mentionsRisk = /risk|flood|danger|safe|waterlog|status|condition/.test(lower);
  if (detectedArea && mentionsRisk) {
    const [lon, lat] = MUMBAI_AREAS[detectedArea];
    const risk = await getAreaRiskFromDB(lon, lat);
    if (!risk) {
      return `I couldn't find reliable flood risk data for ${detectedArea} right now.`;
    }
    return `📍 ${detectedArea[0].toUpperCase() + detectedArea.slice(1)} flood risk: avg ${(risk.avgRisk * 100).toFixed(0)}%, max ${(risk.maxRisk * 100).toFixed(0)}% (${riskLevel(risk.avgRisk)}).`;
  }

  const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const systemPrompt = [
    'You are a flood emergency assistant for Mumbai.',
    'Give short, actionable guidance with clear safety priority.',
    'Use the provided location context as factual source; do not invent coordinates, shelters, or risk numbers.',
    'If risk is high, strongly advise evacuation and official alerts.',
    'Never provide medical/legal guarantees.',
  ].join(' ');

  const userPrompt = [
    `User message: ${message}`,
    `Location context: ${buildLocationSummary(locationContext)}`,
  ].join('\n');

  const aiReply = await callOpenAIChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    openAiModel
  );

  if (aiReply) return aiReply;

  return getRuleBasedReply(message, locationContext);
}

exports.chatbot = async (req, res) => {
  try {
    const { message, location } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const normalizedLocation =
      location && typeof location.lat !== 'undefined' && typeof location.lon !== 'undefined'
        ? { lat: Number(location.lat), lon: Number(location.lon) }
        : null;

    const reply = await getReply(message, normalizedLocation);

    // For route queries, also return destination coords so frontend can open /route directly
    let destination = null;
    const lower = message.toLowerCase();
    const asksDirections = /how do i get to|how to get to|how to reach|directions to|way to|navigate to|take me to|route to/i.test(lower);
    if (asksDirections && normalizedLocation) {
      try {
        const destinationRaw = extractDestinationFromRouteQuery(message);
        if (destinationRaw) {
          destination = await findDestinationByName(destinationRaw, normalizedLocation.lon, normalizedLocation.lat);
        }
      } catch (_) {}
    }

    return res.json({ reply, destination });
  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({
      reply: 'Sorry, something went wrong. Please try again.',
    });
  }
};
