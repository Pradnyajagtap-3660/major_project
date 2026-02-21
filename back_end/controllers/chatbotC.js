const pool = require('../db');

// Approximate coordinates of major Mumbai areas for DB flood risk lookup
const MUMBAI_AREAS = {
  'kurla': [72.8851, 19.0771],
  'dharavi': [72.8519, 19.0417],
  'sion': [72.8619, 19.0397],
  'andheri': [72.8462, 19.1197],
  'bandra': [72.8347, 19.0601],
  'juhu': [72.8296, 19.1075],
  'dadar': [72.8425, 19.0178],
  'chembur': [72.8997, 19.0619],
  'ghatkopar': [72.9081, 19.0868],
  'vikhroli': [72.9202, 19.1085],
  'bhandup': [72.9392, 19.1463],
  'mulund': [72.9568, 19.1764],
  'kanjurmarg': [72.9281, 19.1129],
  'kanjur marg': [72.9281, 19.1129],
  'powai': [72.9069, 19.1271],
  'malad': [72.8481, 19.1867],
  'borivali': [72.8567, 19.2329],
  'kandivali': [72.8378, 19.2048],
  'goregaon': [72.8496, 19.1664],
  'worli': [72.8215, 19.0102],
  'matunga': [72.8601, 19.0255],
  'colaba': [72.8128, 18.9066],
  'thane': [72.9781, 19.2183],
  'jogeshwari': [72.8481, 19.1317],
  'mankhurd': [72.9268, 19.0508],
  'govandi': [72.9188, 19.0577],
  'trombay': [72.9381, 19.0400],
  'antop hill': [72.8663, 19.0139],
  'byculla': [72.8371, 18.9784],
  'bhiwandi': [73.0587, 19.2996],
  'kalyan': [73.1372, 19.2403],
  'mumbai': [72.8777, 19.0760],
  'vile parle': [72.8492, 19.1000],
  'santacruz': [72.8380, 19.0811],
  'lbs marg': [72.8772, 19.0814],
  'tilak nagar': [72.8983, 19.0751],
  'ghatla': [72.9023, 19.0690],
};

// Query flood risk from DB for given coordinates
async function getAreaRiskFromDB(lon, lat) {
  try {
    const result = await pool.query(`
      SELECT
        AVG(flood_risk) as avg_risk,
        MAX(flood_risk) as max_risk,
        COUNT(*) as road_count
      FROM roads_in_risk
      WHERE ST_DWithin(geom, ST_SetSRID(ST_Point($1, $2), 4326), 0.01)
    `, [lon, lat]);
    const row = result.rows[0];
    if (!row || !row.avg_risk || parseInt(row.road_count) === 0) return null;
    return {
      avgRisk: parseFloat(row.avg_risk),
      maxRisk: parseFloat(row.max_risk),
      roadCount: parseInt(row.road_count),
    };
  } catch (err) {
    console.error('DB risk query error:', err.message);
    return null;
  }
}

// Detect if message mentions a known Mumbai area
function detectArea(message) {
  const lower = message.toLowerCase();
  // Sort by length descending so longer names (e.g. "lbs marg") are matched first
  const sorted = Object.keys(MUMBAI_AREAS).sort((a, b) => b.length - a.length);
  for (const area of sorted) {
    if (lower.includes(area)) return area;
  }
  return null;
}

// Build risk response text from DB data
function buildRiskResponse(areaName, data) {
  const pct = Math.round(data.avgRisk * 100);
  const cap = areaName.charAt(0).toUpperCase() + areaName.slice(1);
  if (data.avgRisk < 0.4) {
    return `✅ *${cap}* has LOW flood risk (avg ${pct}%). Roads in this area are generally safe during normal monsoon conditions. Stay alert to weather updates.`;
  } else if (data.avgRisk < 0.7) {
    return `⚠️ *${cap}* has MODERATE flood risk (avg ${pct}%). Exercise caution, avoid low-lying roads during heavy rain, and keep an eye on official alerts.`;
  } else {
    return `🚨 *${cap}* has HIGH flood risk (avg ${pct}%). Many roads in this area are prone to waterlogging. Avoid unnecessary travel during rain. Keep an evacuation plan ready and know your nearest shelter.`;
  }
}

// Match message to intent and return response
async function getReply(message) {
  const lower = message.toLowerCase().trim();

  // --- Greetings ---
  if (/^(hi|hello|hey|hii|namaste|good morning|good evening|good afternoon)\b/.test(lower)) {
    return "Hello! 👋 I'm your Flood Safety Assistant. I can help you with:\n• Flood safety tips\n• Flood risk in Mumbai areas\n• Emergency contacts\n• Evacuation advice\n\nWhat would you like to know?";
  }

  // --- Area flood risk query ---
  const areaKeywords = ['risk', 'safe', 'flood', 'danger', 'waterlog', 'flooded', 'status', 'condition'];
  const mentionsRisk = areaKeywords.some(k => lower.includes(k));
  const detectedArea = detectArea(lower);

  if (detectedArea && (mentionsRisk || true)) {
    const coords = MUMBAI_AREAS[detectedArea];
    const data = await getAreaRiskFromDB(coords[0], coords[1]);
    if (data) {
      return buildRiskResponse(detectedArea, data);
    } else {
      return `ℹ️ I couldn't find flood risk data for *${detectedArea}* in our database. Please check official BMC flood alerts at mcgm.gov.in.`;
    }
  }

  // --- Which areas to avoid / high risk areas / safe areas ---
  if (/which area|area.*avoid|avoid.*area|dangerous area|high.?risk area|flood.?(prone|affected|zone)|worst area|most.*risk|where.*avoid|should.*avoid|not (to |)go|safe area|safe zone|safer area|which.*safe|least.*risk|low.?risk area/.test(lower)) {
    const keyAreas = ['kurla', 'dharavi', 'sion', 'andheri', 'bandra', 'dadar', 'chembur', 'ghatkopar', 'vikhroli', 'mankhurd', 'govandi', 'worli', 'powai', 'malad', 'borivali', 'matunga', 'byculla', 'jogeshwari'];
    const results = await Promise.all(
      keyAreas.map(async (area) => {
        const coords = MUMBAI_AREAS[area];
        const data = await getAreaRiskFromDB(coords[0], coords[1]);
        return data ? { area, avgRisk: data.avgRisk } : null;
      })
    );
    const valid = results.filter(r => r !== null).sort((a, b) => b.avgRisk - a.avgRisk);
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const highRisk = valid.filter(r => r.avgRisk >= 0.7);
    const moderate = valid.filter(r => r.avgRisk >= 0.4 && r.avgRisk < 0.7);
    const low = valid.filter(r => r.avgRisk < 0.4);

    let reply = '🗺️ *Mumbai Flood Risk Areas (live from our database):*\n\n';
    if (highRisk.length > 0) {
      reply += '🚨 *Avoid these HIGH RISK areas:*\n';
      reply += highRisk.slice(0, 6).map(r => `• ${cap(r.area)} — ${Math.round(r.avgRisk * 100)}% risk`).join('\n');
      reply += '\n\n';
    }
    if (moderate.length > 0) {
      reply += '⚠️ *Use caution in MODERATE RISK areas:*\n';
      reply += moderate.slice(0, 4).map(r => `• ${cap(r.area)} — ${Math.round(r.avgRisk * 100)}% risk`).join('\n');
      reply += '\n\n';
    }
    if (low.length > 0) {
      reply += '✅ *Relatively SAFE areas:*\n';
      reply += low.slice(0, 4).map(r => `• ${cap(r.area)} — ${Math.round(r.avgRisk * 100)}% risk`).join('\n');
      reply += '\n\n';
    }
    if (valid.length === 0) {
      reply = 'ℹ️ Could not retrieve area risk data right now. Please check BMC flood alerts at mcgm.gov.in.';
    } else {
      reply += '⚠️ Risk levels change during heavy rain. Always follow official BMC alerts.';
    }
    return reply;
  }

  // --- What to do during flood ---
  if (/during flood|what (to|should) (i|we) do|flood (tips|advice|help)|how to (stay|be) safe/.test(lower) ||
      (lower.includes('flood') && (lower.includes('do') || lower.includes('help') || lower.includes('advice')))) {
    return "🌊 *During a Flood — What To Do:*\n\n1. Move to higher ground immediately\n2. Don't walk or drive through floodwater — even 15 cm can knock you down\n3. Turn off electricity at the main switch if water is entering\n4. Avoid contact with floodwater — it may be contaminated\n5. Keep your phone charged and follow official alerts\n6. Go to your nearest flood shelter if asked to evacuate\n\n⚠️ Never ignore evacuation orders from authorities!";
  }

  // --- Evacuation ---
  if (/evacuat|escape|leave home|where to go|run|flee/.test(lower)) {
    return "🚶 *Evacuation Guide:*\n\n1. Leave as soon as you receive an evacuation alert — don't wait for water to enter\n2. Take: medicines, important documents, phone + charger, water & food for 3 days\n3. Inform a family member or neighbour of your plans\n4. Use this app to find your nearest shelter\n5. Follow official evacuation routes — avoid roads near rivers or low-lying areas\n6. Help elderly and disabled neighbours if it's safe to do so";
  }

  // --- After flood ---
  if (/after flood|flood over|water recede|go back|return home/.test(lower)) {
    return "🏠 *After the Flood:*\n\n1. Don't return home until officials say it's safe\n2. Check for structural damage before entering your building\n3. Boil all drinking water for at least 10 minutes\n4. Beware of snakes, insects, and other animals in floodwater\n5. Avoid downed power lines — treat them as live\n6. Document damage with photos for insurance claims\n7. Watch for signs of mould and ventilate your home";
  }

  // --- Prepare / Before flood ---
  if (/prepar|before flood|flood kit|emergency kit|stock|ready/.test(lower)) {
    return "📦 *Flood Preparedness Checklist:*\n\n✅ Keep an emergency kit: torch, batteries, first aid box, medicines, water (5 litres/person/day), dry food\n✅ Store important documents in a waterproof bag\n✅ Know your nearest shelter and evacuation route\n✅ Save emergency contacts on your phone\n✅ Keep your vehicle fuel tank at least half full during monsoon\n✅ Never park in low-lying areas or near drains during heavy rain";
  }

  // --- Emergency contacts ---
  if (/contact|helpline|number|call|emergency|ndrf|police|ambulance|fire/.test(lower)) {
    return "📞 *Emergency Contacts (Mumbai):*\n\n🚒 Fire: 101\n🚑 Ambulance: 108\n👮 Police: 100\n🌊 NDRF (National Disaster): 011-24363260\n🏙️ BMC Disaster Management: 1916\n🏥 BMC Emergency: 022-23012459\n\nSave these numbers before the monsoon season!";
  }

  // --- Flood shelters ---
  if (/shelter|camp|refuge|safe place|where (to|can) (go|stay)/.test(lower)) {
    return "🏕️ *Finding a Flood Shelter:*\n\nUse the **Shelters** section of this app to find the nearest government flood shelter near you. Shelters are typically set up in:\n• Schools and colleges\n• Community halls\n• MCGM-designated centres\n\nYou can also call BMC Disaster Management on **1916** for the nearest open shelter.";
  }

  // --- First aid ---
  if (/first aid|injur|wound|sick|ill|medic|hospital/.test(lower)) {
    return "🩺 *Flood First Aid Tips:*\n\n• For cuts from floodwater: clean with clean water, apply antiseptic\n• For signs of contaminated water ingestion (vomiting, diarrhoea): seek medical help immediately\n• For electrocution risk: don't touch the person — cut the power source first, then call 108\n• For hypothermia (shivering, confusion): move to warm dry place, wrap in blanket\n• For trapped persons: call 101 (Fire) or 100 (Police) — don't attempt rescue in fast water yourself\n\nUse the **Hospitals** section of this app to find the nearest hospital.";
  }

  // --- What is flood risk / how it's calculated ---
  if (/what is flood risk|how.*risk.*calculat|risk mean|risk score/.test(lower)) {
    return "📊 *What is Flood Risk?*\n\nFlood risk in this app is calculated using real road network data for Mumbai. Each road is given a risk score from 0 to 1 based on:\n• Historical flood data\n• Elevation and drainage capacity\n• Proximity to rivers, nullah, and low-lying zones\n\n🟢 Low risk (0–40%): Generally safe during normal rain\n🟡 Moderate risk (40–70%): Possible waterlogging in heavy rain\n🔴 High risk (70–100%): Frequent flooding, avoid during monsoon";
  }

  // --- Waterlogging ---
  if (/waterlog|water log|standing water|submerged|underpass|subway/.test(lower)) {
    return "💧 *Waterlogging Safety:*\n\n• Never drive through a waterlogged underpass — water can be deeper than it looks\n• If your vehicle stalls in water, exit immediately and move to higher ground\n• Avoid walking near open manholes — covers may have been displaced by floodwater\n• Report waterlogging to BMC: call 1916 or use the MCGM app\n• In this app, red/orange markers on the map show known waterlogging hotspots";
  }

  // --- App usage / how to use ---
  if (/how.*use|what.*app|feature|route|path|find|navigate/.test(lower)) {
    return "📱 *How to Use This App:*\n\n🗺️ **Safe Route**: Find the safest driving/walking route from your location to a shelter or hospital — avoiding flooded roads\n🏥 **Hospitals**: Find the nearest open hospitals during the flood\n🏕️ **Shelters**: Locate government flood shelters near you\n🌊 **Flood Map**: See real-time flood risk zones and waterlogging hotspots on the map\n\nTip: Use the Safe Route feature first — it shows 3 route options ranked from safest to riskiest!";
  }

  // --- Fallback ---
  return "I'm not sure about that. I can help you with:\n\n• 🌊 Flood safety tips (ask 'what to do during flood')\n• 📍 Flood risk in an area (ask 'flood risk in Kurla')\n• 🚶 Evacuation guidance\n• 📞 Emergency contacts\n• 🩺 First aid tips\n• 📦 Flood preparedness\n\nTry asking one of these!";
}

exports.chatbot = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const reply = await getReply(message);
    res.json({ reply });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ reply: 'Sorry, something went wrong. Please try again.' });
  }
};
