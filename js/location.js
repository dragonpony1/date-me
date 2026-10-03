/* Date Me — where you are, what's around you, and the weather.
 *
 * All free, no keys:
 *   - OpenStreetMap Nominatim: city/zip -> coordinates, and back
 *   - Overpass (OpenStreetMap data): lakes, peaks, beaches, rivers... nearby
 *   - Open-Meteo: today's weather and elevation
 *
 * Features come back true / false / null (null = couldn't check). The engine
 * treats null generously for common things like lakes and strictly for rare
 * ones like the ocean.
 */
(function () {
  const DM = (window.DateMe = window.DateMe || {});

  async function getJSON(url, opts = {}, ms = 12000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(url, { ...opts, signal: ctl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function placeFromNominatim(r) {
    const a = r.address || {};
    const town = a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.county || r.name;
    const cc = (a.country_code || "").toUpperCase();
    const iso = a["ISO3166-2-lvl4"] || "";
    const region = cc === "US" && iso ? iso.split("-")[1] : a.state || a.country;
    return {
      label: [town, region].filter(Boolean).join(", "),
      lat: +r.lat,
      lon: +r.lon,
      cc,
      isCity: !!a.city,
      features: {},
      weather: null,
    };
  }

  const NOMINATIM = "https://nominatim.openstreetmap.org";

  async function geocode(text) {
    const q = text.trim();
    let url;
    if (/^\d{5}(-\d{4})?$/.test(q)) {
      url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=1&accept-language=en&countrycodes=us&postalcode=${encodeURIComponent(q.slice(0, 5))}`;
    } else {
      url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=1&accept-language=en&q=${encodeURIComponent(q)}`;
    }
    const list = await getJSON(url);
    if (!list || !list.length) return null;
    const place = placeFromNominatim(list[0]);
    // A zip lookup often names only the zip; ask what town it's in.
    if (!place.label || /^\d/.test(place.label)) {
      try { return { ...(await reverse(place.lat, place.lon)), lat: place.lat, lon: place.lon }; } catch (e) { /* keep zip label */ }
    }
    return place;
  }

  async function reverse(lat, lon) {
    const r = await getJSON(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=10&accept-language=en&lat=${lat}&lon=${lon}`);
    return placeFromNominatim({ ...r, lat, lon });
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("unsupported"));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
      );
    });
  }

  // ---------- what's nearby ----------
  const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

  // Order matters: answers come back in the same order.
  const PROBES = [
    ["lake", 'nwr["natural"="water"]["water"~"^(lake|reservoir)$"](around:30000,LAT,LON)'],
    ["coast", 'way["natural"="coastline"](around:30000,LAT,LON)'],
    ["beach", 'nwr["natural"="beach"](around:30000,LAT,LON)'],
    ["peaks", 'node["natural"="peak"](around:40000,LAT,LON)'],
    ["hiking", 'relation["route"="hiking"](around:30000,LAT,LON)'],
    ["river", 'way["waterway"="river"](around:15000,LAT,LON)'],
    ["hotspring", 'nwr["natural"="hot_spring"](around:80000,LAT,LON)'],
    ["ski", 'nwr["landuse"="winter_sports"](around:80000,LAT,LON)'],
    ["museums", 'nwr["tourism"~"^(museum|gallery|zoo|aquarium)$"](around:20000,LAT,LON)'],
    ["venues", 'nwr["amenity"~"^(theatre|cinema|arts_centre)$"](around:20000,LAT,LON)'],
  ];

  async function scan(lat, lon) {
    const body = "[out:json][timeout:25];\n" +
      PROBES.map(([, q]) => q.replace(/LAT/g, lat.toFixed(4)).replace(/LON/g, lon.toFixed(4)) + ";out count;").join("\n");
    let lastErr;
    for (const url of OVERPASS) {
      try {
        const data = await getJSON(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(body),
        }, 30000);
        const counts = {};
        (data.elements || []).forEach((el, i) => { if (PROBES[i]) counts[PROBES[i][0]] = +(el.tags && el.tags.total) || 0; });
        if (Object.keys(counts).length === PROBES.length) return counts;
        lastErr = new Error("short answer");
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }

  // Turn raw counts (or nothing) into yes/no features.
  function deriveFeatures(place, counts, weather, season) {
    const f = {};
    const elev = weather && weather.elevation;
    if (counts) {
      f.lake = counts.lake > 0;
      f.coast = counts.coast > 0;
      f.beach = counts.beach > 0;
      f.mountains = counts.peaks >= 5 || (elev != null && elev >= 1800 && counts.peaks >= 1);
      f.trails = counts.hiking > 0 || counts.peaks >= 3;
      f.river = counts.river > 0;
      f.hotspring = counts.hotspring > 0;
      f.ski = counts.ski > 0;
      f.city = place.isCity || counts.museums + counts.venues >= 4;
    } else {
      // No scan: only say what we can infer, leave the rest unknown.
      f.lake = null; f.trails = null; f.river = null;
      f.coast = null; f.beach = null; f.hotspring = null; f.ski = null;
      f.mountains = elev != null && elev >= 1400 ? true : null;
      f.city = place.isCity ? true : null;
    }
    f.snow = weather ? !!(weather.snowing || (season === "wi" && (weather.tmaxC <= 3 || (elev || 0) >= 1500))) : null;
    return f;
  }

  // ---------- weather ----------
  const WX = [
    [[0], "☀️", "Clear"], [[1, 2], "🌤️", "Partly cloudy"], [[3], "☁️", "Cloudy"], [[45, 48], "🌫️", "Foggy"],
    [[51, 53, 55, 56, 57], "🌦️", "Drizzle"], [[61, 63, 65, 66, 67], "🌧️", "Rain"], [[71, 73, 75, 77], "🌨️", "Snow"],
    [[80, 81, 82], "🌦️", "Showers"], [[85, 86], "🌨️", "Snow showers"], [[95, 96, 99], "⛈️", "Storms"],
  ];

  async function weather(lat, lon, cc) {
    const f = cc === "US" || cc === "LR" || cc === "MM";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
      `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,precipitation_probability_max` +
      `&timezone=auto&forecast_days=2${f ? "&temperature_unit=fahrenheit" : ""}`;
    const d = await getJSON(url);
    const code = d.current ? d.current.weather_code : d.daily.weather_code[0];
    const dayCode = d.daily.weather_code[0];
    const tmax = d.daily.temperature_2m_max[0];
    const tmaxC = f ? (tmax - 32) * 5 / 9 : tmax;
    const rainPct = (d.daily.precipitation_probability_max || [0])[0] || 0;
    const row = WX.find(([codes]) => codes.includes(code)) || WX[2];
    const wet = (c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
    const snowy = (c) => (c >= 71 && c <= 77) || c === 85 || c === 86;
    const rainy = rainPct >= 60 || wet(dayCode) || wet(code);
    return {
      temp: Math.round(d.current ? d.current.temperature_2m : tmax),
      unit: f ? "°F" : "°C",
      emoji: row[1],
      text: row[2],
      tmaxC,
      rainy,
      snowing: snowy(dayCode) || snowy(code),
      hot: tmaxC >= 35,
      cold: tmaxC <= -5,
      nice: !rainy && tmaxC >= 15 && tmaxC <= 30 && code <= 2,
      elevation: d.elevation,
      at: Date.now(),
    };
  }

  DM.Location = { geocode, reverse, getPosition, scan, weather, deriveFeatures };
})();
