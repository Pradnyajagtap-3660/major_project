const https = require("https");

const CACHE_TTL_MS = 5 * 60 * 1000;
const geocodeCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "flood-response-app/1.0 (local-dev)",
          Accept: "application/json"
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 500;
          if (status >= 400) {
            const err = new Error(`Geocoder HTTP ${status}`);
            err.statusCode = status;
            return reject(err);
          }

          try {
            resolve(JSON.parse(data));
          } catch (parseErr) {
            reject(parseErr);
          }
        });
      }
    );

    req.on("error", reject);
  });
}

async function geocodeWithRetry(url, attempts = 3) {
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchJson(url);
    } catch (err) {
      lastError = err;
      const retryable = !err.statusCode || [425, 429, 500, 502, 503, 504].includes(err.statusCode);
      if (!retryable || i === attempts - 1) {
        break;
      }
      await sleep(250 * (i + 1));
    }
  }

  throw lastError;
}

exports.geocode = async (req, res) => {
  try {
    const query = (req.query.query || "").trim();

    if (!query) {
      return res.status(400).json({ error: "Missing query parameter: query" });
    }

    const cacheKey = query.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.value);
    }

    const baseUrl = "https://nominatim.openstreetmap.org/search";
    const commonParams = "&format=json&limit=5&countrycodes=in&addressdetails=1";
    const mumbaiBounds = "&viewbox=72.7764,19.2703,72.9781,18.8930&bounded=1";

    const simplified = query
      .replace(/institute|college|university|school|hospital|of|the/gi, "")
      .trim();

    const strategies = [
      `${baseUrl}?q=${encodeURIComponent(`${query}, Mumbai, India`)}${commonParams}${mumbaiBounds}`,
      `${baseUrl}?q=${encodeURIComponent(`${query}, Mumbai`)}${commonParams}&viewbox=72.7764,19.2703,72.9781,18.8930`,
      `${baseUrl}?q=${encodeURIComponent(`${simplified || query}, Mumbai`)}${commonParams}${mumbaiBounds}`
    ];

    let selected = null;
    for (const url of strategies) {
      try {
        const data = await geocodeWithRetry(url);
        if (Array.isArray(data) && data.length > 0) {
          selected = data[0];
          break;
        }
      } catch (err) {
        // Try the next strategy if one fails.
      }
    }

    if (!selected) {
      return res.status(404).json({ error: "Location not found" });
    }

    const payload = {
      lat: selected.lat,
      lon: selected.lon,
      display_name: selected.display_name
    };

    geocodeCache.set(cacheKey, {
      value: payload,
      expiresAt: Date.now() + CACHE_TTL_MS
    });

    res.json(payload);
  } catch (err) {
    console.error("❌ Geocode error:", err.message);
    res.status(502).json({
      error: "Geocoding failed",
      details: err.message
    });
  }
};
