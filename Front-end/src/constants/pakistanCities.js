// ─── Pakistani cities & destinations ──────────────────────────────────────
//
// Curated list of cities, towns, and destinations across all four provinces +
// Gilgit-Baltistan + AJK. Used for:
//   1. Origin/Destination autocomplete in TripCreator
//   2. Per-destination per-day budget hints
//
// `region` is the loose tourism region (Northern Areas, Punjab, Sindh, etc.).
// `dailyBudgetPKR` is a [low, high] tuple — low for budget travel
// (guesthouses, local food, public transport), high for premium
// (Serena/PC tier hotels, restaurants, private transport).
//
// Seasonal warning matters in the UI: most Northern Area destinations are
// snow-locked from Nov–April. We mark these so we can flag the user later
// (Round 8 currently just shows the budget hint; later rounds can use this
// to flag bad travel-date pairings).

export const PAKISTAN_CITIES = [
  // ── Major Metro Cities (year-round) ───────────────────────────────────
  { name: "Karachi",        region: "Sindh",            dailyBudgetPKR: [4000, 18000], season: "year-round" },
  { name: "Lahore",         region: "Punjab",           dailyBudgetPKR: [3500, 16000], season: "year-round" },
  { name: "Islamabad",      region: "Federal",          dailyBudgetPKR: [4500, 20000], season: "year-round" },
  { name: "Rawalpindi",     region: "Punjab",           dailyBudgetPKR: [3500, 14000], season: "year-round" },
  { name: "Peshawar",       region: "KPK",              dailyBudgetPKR: [3000, 12000], season: "year-round" },
  { name: "Quetta",         region: "Balochistan",      dailyBudgetPKR: [3000, 12000], season: "year-round" },
  { name: "Faisalabad",     region: "Punjab",           dailyBudgetPKR: [3000, 11000], season: "year-round" },
  { name: "Multan",         region: "Punjab",           dailyBudgetPKR: [3000, 12000], season: "year-round" },
  { name: "Hyderabad",      region: "Sindh",            dailyBudgetPKR: [2500, 10000], season: "year-round" },
  { name: "Sialkot",        region: "Punjab",           dailyBudgetPKR: [3000, 11000], season: "year-round" },
  { name: "Gujranwala",     region: "Punjab",           dailyBudgetPKR: [2500, 10000], season: "year-round" },
  { name: "Bahawalpur",     region: "Punjab",           dailyBudgetPKR: [2500, 10000], season: "year-round" },
  { name: "Sargodha",       region: "Punjab",           dailyBudgetPKR: [2500, 9000],  season: "year-round" },
  { name: "Sukkur",         region: "Sindh",            dailyBudgetPKR: [2500, 9000],  season: "year-round" },
  { name: "Larkana",        region: "Sindh",            dailyBudgetPKR: [2500, 9000],  season: "year-round" },
  { name: "Mardan",         region: "KPK",              dailyBudgetPKR: [2500, 9000],  season: "year-round" },
  { name: "Mirpur",         region: "AJK",              dailyBudgetPKR: [3000, 11000], season: "year-round" },
  { name: "Vehari",         region: "Punjab",           dailyBudgetPKR: [2000, 8000],  season: "year-round" },
  { name: "DG Khan",        region: "Punjab",           dailyBudgetPKR: [2500, 9000],  season: "year-round" },
  { name: "Sahiwal",        region: "Punjab",           dailyBudgetPKR: [2500, 9000],  season: "year-round" },
  { name: "Okara",          region: "Punjab",           dailyBudgetPKR: [2500, 9000],  season: "year-round" },
  { name: "Sheikhupura",    region: "Punjab",           dailyBudgetPKR: [2500, 9000],  season: "year-round" },

  // ── Gilgit-Baltistan (mostly summer-only Northern Areas) ────────────
  { name: "Gilgit",         region: "Gilgit-Baltistan", dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Hunza Valley",   region: "Gilgit-Baltistan", dailyBudgetPKR: [5000, 18000], season: "summer-only" },
  { name: "Karimabad",      region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 16000], season: "summer-only" },
  { name: "Aliabad",        region: "Gilgit-Baltistan", dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Gulmit",         region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 16000], season: "summer-only" },
  { name: "Passu",          region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 16000], season: "summer-only" },
  { name: "Sost",           region: "Gilgit-Baltistan", dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Khunjerab Pass", region: "Gilgit-Baltistan", dailyBudgetPKR: [5000, 18000], season: "summer-only" },
  { name: "Attabad Lake",   region: "Gilgit-Baltistan", dailyBudgetPKR: [5000, 17000], season: "summer-only" },
  { name: "Skardu",         region: "Gilgit-Baltistan", dailyBudgetPKR: [5000, 20000], season: "summer-only" },
  { name: "Shigar",         region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 18000], season: "summer-only" },
  { name: "Khaplu",         region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 17000], season: "summer-only" },
  { name: "Deosai Plains",  region: "Gilgit-Baltistan", dailyBudgetPKR: [6000, 20000], season: "summer-only" },
  { name: "Sheosar Lake",   region: "Gilgit-Baltistan", dailyBudgetPKR: [6000, 20000], season: "summer-only" },
  { name: "Astore",         region: "Gilgit-Baltistan", dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Rama Lake",      region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 16000], season: "summer-only" },
  { name: "Fairy Meadows",  region: "Gilgit-Baltistan", dailyBudgetPKR: [5500, 18000], season: "summer-only" },
  { name: "Nanga Parbat",   region: "Gilgit-Baltistan", dailyBudgetPKR: [6000, 22000], season: "summer-only" },
  { name: "Phander Valley", region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 15000], season: "summer-only" },
  { name: "Yasin Valley",   region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 15000], season: "summer-only" },
  { name: "Ghizer",         region: "Gilgit-Baltistan", dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Naltar Valley",  region: "Gilgit-Baltistan", dailyBudgetPKR: [4500, 16000], season: "summer-only" },
  { name: "Chilas",         region: "Gilgit-Baltistan", dailyBudgetPKR: [3500, 12000], season: "year-round" },

  // ── KPK Northern Destinations ──────────────────────────────────────
  { name: "Naran",          region: "KPK",              dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Kaghan",         region: "KPK",              dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Saif-ul-Malook", region: "KPK",              dailyBudgetPKR: [4500, 15000], season: "summer-only" },
  { name: "Babusar Top",    region: "KPK",              dailyBudgetPKR: [5000, 16000], season: "summer-only" },
  { name: "Shogran",        region: "KPK",              dailyBudgetPKR: [4000, 13000], season: "summer-only" },
  { name: "Siri Paye",      region: "KPK",              dailyBudgetPKR: [4500, 14000], season: "summer-only" },
  { name: "Balakot",        region: "KPK",              dailyBudgetPKR: [3500, 11000], season: "year-round" },
  { name: "Mansehra",       region: "KPK",              dailyBudgetPKR: [3000, 10000], season: "year-round" },
  { name: "Abbottabad",     region: "KPK",              dailyBudgetPKR: [3500, 12000], season: "year-round" },
  { name: "Nathia Gali",    region: "KPK",              dailyBudgetPKR: [4500, 15000], season: "year-round" },
  { name: "Ayubia",         region: "KPK",              dailyBudgetPKR: [4000, 13000], season: "year-round" },
  { name: "Thandiani",      region: "KPK",              dailyBudgetPKR: [4000, 12000], season: "summer-only" },
  { name: "Swat Valley",    region: "KPK",              dailyBudgetPKR: [4000, 14000], season: "year-round" },
  { name: "Mingora",        region: "KPK",              dailyBudgetPKR: [3000, 11000], season: "year-round" },
  { name: "Kalam",          region: "KPK",              dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Madyan",         region: "KPK",              dailyBudgetPKR: [3500, 12000], season: "summer-only" },
  { name: "Bahrain",        region: "KPK",              dailyBudgetPKR: [3500, 12000], season: "summer-only" },
  { name: "Mahodand Lake",  region: "KPK",              dailyBudgetPKR: [4500, 14000], season: "summer-only" },
  { name: "Ushu Valley",    region: "KPK",              dailyBudgetPKR: [4000, 13000], season: "summer-only" },
  { name: "Kumrat Valley",  region: "KPK",              dailyBudgetPKR: [4500, 14000], season: "summer-only" },
  { name: "Chitral",        region: "KPK",              dailyBudgetPKR: [4000, 13000], season: "summer-only" },
  { name: "Kalash Valleys", region: "KPK",              dailyBudgetPKR: [4500, 14000], season: "summer-only" },
  { name: "Bumburet",       region: "KPK",              dailyBudgetPKR: [4500, 14000], season: "summer-only" },
  { name: "Rumbur",         region: "KPK",              dailyBudgetPKR: [4500, 14000], season: "summer-only" },
  { name: "Birir",          region: "KPK",              dailyBudgetPKR: [4500, 14000], season: "summer-only" },
  { name: "Shandur Pass",   region: "KPK",              dailyBudgetPKR: [5000, 16000], season: "summer-only" },
  { name: "Dir",            region: "KPK",              dailyBudgetPKR: [3000, 10000], season: "summer-only" },

  // ── Punjab Destinations ────────────────────────────────────────────
  { name: "Murree",         region: "Punjab",           dailyBudgetPKR: [4000, 15000], season: "year-round" },
  { name: "Patriata",       region: "Punjab",           dailyBudgetPKR: [4000, 14000], season: "year-round" },
  { name: "Bhurban",        region: "Punjab",           dailyBudgetPKR: [5000, 18000], season: "year-round" },
  { name: "Khanpur Lake",   region: "Punjab",           dailyBudgetPKR: [3000, 10000], season: "year-round" },
  { name: "Soan Valley",    region: "Punjab",           dailyBudgetPKR: [3000, 10000], season: "year-round" },
  { name: "Khewra",         region: "Punjab",           dailyBudgetPKR: [3000, 10000], season: "year-round" },
  { name: "Katas Raj",      region: "Punjab",           dailyBudgetPKR: [3000, 10000], season: "year-round" },
  { name: "Cholistan",      region: "Punjab",           dailyBudgetPKR: [3500, 12000], season: "winter" },
  { name: "Derawar Fort",   region: "Punjab",           dailyBudgetPKR: [3500, 12000], season: "winter" },
  { name: "Harappa",        region: "Punjab",           dailyBudgetPKR: [2500, 9000],  season: "year-round" },
  { name: "Taxila",         region: "Punjab",           dailyBudgetPKR: [3000, 10000], season: "year-round" },
  { name: "Rohtas Fort",    region: "Punjab",           dailyBudgetPKR: [3000, 10000], season: "year-round" },

  // ── Sindh Destinations ─────────────────────────────────────────────
  { name: "Mohenjo-daro",   region: "Sindh",            dailyBudgetPKR: [3000, 11000], season: "winter" },
  { name: "Bhambore",       region: "Sindh",            dailyBudgetPKR: [2500, 9000],  season: "winter" },
  { name: "Karoonjhar",     region: "Sindh",            dailyBudgetPKR: [3000, 10000], season: "winter" },
  { name: "Thar Desert",    region: "Sindh",            dailyBudgetPKR: [3500, 12000], season: "winter" },
  { name: "Mithi",          region: "Sindh",            dailyBudgetPKR: [2500, 9000],  season: "winter" },
  { name: "Keenjhar Lake",  region: "Sindh",            dailyBudgetPKR: [3000, 10000], season: "year-round" },
  { name: "Gorakh Hill",    region: "Sindh",            dailyBudgetPKR: [3500, 11000], season: "winter" },
  { name: "Kund Malir",     region: "Balochistan",      dailyBudgetPKR: [4000, 13000], season: "winter" },

  // ── Balochistan Destinations ────────────────────────────────────────
  { name: "Gwadar",         region: "Balochistan",      dailyBudgetPKR: [3500, 13000], season: "winter" },
  { name: "Hingol",         region: "Balochistan",      dailyBudgetPKR: [3500, 12000], season: "winter" },
  { name: "Ormara",         region: "Balochistan",      dailyBudgetPKR: [3000, 11000], season: "winter" },
  { name: "Astola Island",  region: "Balochistan",      dailyBudgetPKR: [4500, 15000], season: "winter" },
  { name: "Ziarat",         region: "Balochistan",      dailyBudgetPKR: [3500, 12000], season: "summer-only" },
  { name: "Hanna Lake",     region: "Balochistan",      dailyBudgetPKR: [3000, 11000], season: "year-round" },
  { name: "Pir Ghaib",      region: "Balochistan",      dailyBudgetPKR: [3000, 10000], season: "summer-only" },

  // ── Azad Jammu & Kashmir ───────────────────────────────────────────
  { name: "Muzaffarabad",   region: "AJK",              dailyBudgetPKR: [3500, 12000], season: "year-round" },
  { name: "Neelum Valley",  region: "AJK",              dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Sharda",         region: "AJK",              dailyBudgetPKR: [4000, 13000], season: "summer-only" },
  { name: "Kel",            region: "AJK",              dailyBudgetPKR: [4000, 13000], season: "summer-only" },
  { name: "Arang Kel",      region: "AJK",              dailyBudgetPKR: [4500, 15000], season: "summer-only" },
  { name: "Taobat",         region: "AJK",              dailyBudgetPKR: [4500, 15000], season: "summer-only" },
  { name: "Ratti Gali",     region: "AJK",              dailyBudgetPKR: [5000, 16000], season: "summer-only" },
  { name: "Banjosa Lake",   region: "AJK",              dailyBudgetPKR: [3500, 12000], season: "year-round" },
  { name: "Pir Chinasi",    region: "AJK",              dailyBudgetPKR: [4000, 13000], season: "summer-only" },
  { name: "Leepa Valley",   region: "AJK",              dailyBudgetPKR: [4000, 14000], season: "summer-only" },
  { name: "Toli Pir",       region: "AJK",              dailyBudgetPKR: [4000, 13000], season: "summer-only" },
  { name: "Rawalakot",      region: "AJK",              dailyBudgetPKR: [3500, 12000], season: "year-round" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Filter cities by query, with simple matching: case-insensitive, prefers
 * matches that start with the query, then contains.
 */
export const searchCities = (query, limit = 8) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const c of PAKISTAN_CITIES) {
    const lower = c.name.toLowerCase();
    if (lower.startsWith(q)) starts.push(c);
    else if (lower.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
};

/**
 * Find the best city match for a free-text destination string. Used to
 * surface budget hints when the user types "Hunza" or "Hunza Valley".
 */
export const findCity = (text) => {
  if (!text) return null;
  const q = text.trim().toLowerCase();
  // Exact match first
  const exact = PAKISTAN_CITIES.find((c) => c.name.toLowerCase() === q);
  if (exact) return exact;
  // Then "contains city name" — e.g. "Hunza, Pakistan" → "Hunza Valley"
  return (
    PAKISTAN_CITIES.find((c) =>
      q.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(q.split(",")[0].trim())
    ) || null
  );
};

/**
 * Format a daily budget tuple as a readable hint string.
 */
export const formatBudgetHint = (city) => {
  if (!city || !city.dailyBudgetPKR) return null;
  const [low, high] = city.dailyBudgetPKR;
  const fmt = (n) => `PKR ${(n / 1000).toFixed(0)}k`;
  return `Avg daily budget for ${city.name}: ${fmt(low)}–${fmt(high)} per person`;
};