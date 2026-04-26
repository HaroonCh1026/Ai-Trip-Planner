import { Icon } from "../components/Icon";
import { getImageUrl } from "../utils/cloudinary";

// Then your CLOUDINARY_IMAGES mapping:
const CLOUDINARY_IMAGES = {
  "Hunza Valley": "hunza-valley_qujui1",
  Skardu: "skardu_bn1ldp",
  Lahore: "lahore_aoeovr",
  Gwadar: "gwadar_hb4i0b",
  "Fairy Meadows": "fairy-meadows_zkhhzl",
  "Swat Valley": "swat-valley_mwdfvy",
  Karachi: "karachi_annn2z",
  Islamabad: "islamabad_ixd5cq",
  Peshawar: "peshawar_qeydz4",
  "Neelum Valley": "neelum-valley_rkbv8g",
  Multan: "multan_nyhg8s",
  "Naran Kaghan": "naran-kaghan_ogxvks",
  Murree: "murree_mffscb",
  Bahawalpur: "bahawalpur_ikoeoo",
  Quetta: "quetta_kdgx8s",
  "Kashmir Valley": "kashmir-valley_q3j4c9",
};
// Fallback Wikimedia URLs (in case Cloudinary fails)
const FALLBACK_IMAGES = {
  "Hunza Valley":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hunza_Valley_Pakistan.jpg/800px-Hunza_Valley_Pakistan.jpg",
  Skardu:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Skardu_Valley.jpg/800px-Skardu_Valley.jpg",
  Lahore:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Badshahi_Mosque_April_2008.jpg/800px-Badshahi_Mosque_April_2008.jpg",
  Gwadar:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Gwadar_Port_Pakistan.jpg/800px-Gwadar_Port_Pakistan.jpg",
  "Fairy Meadows":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Fairy_meadows_Nanga_Parbat.jpg/800px-Fairy_meadows_Nanga_Parbat.jpg",
  "Swat Valley":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Swat_Valley_Pakistan.jpg/800px-Swat_Valley_Pakistan.jpg",
  Karachi:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Clifton_Beach_Karachi.jpg/800px-Clifton_Beach_Karachi.jpg",
  Islamabad:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Faisal_Mosque_Islamabad.jpg/800px-Faisal_Mosque_Islamabad.jpg",
  Peshawar:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Peshawar_old_city.jpg/800px-Peshawar_old_city.jpg",
  "Neelum Valley":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neelum_Valley_AJK.jpg/800px-Neelum_Valley_AJK.jpg",
  Multan:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Shrine_of_Shah_Rukn-e-Alam_Multan.jpg/800px-Shrine_of_Shah_Rukn-e-Alam_Multan.jpg",
  "Naran Kaghan":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Lake_Saiful_Malook.jpg/800px-Lake_Saiful_Malook.jpg",
  Murree:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Murree_Mall_Road.jpg/800px-Murree_Mall_Road.jpg",
  Bahawalpur:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Derawar_Fort.jpg/800px-Derawar_Fort.jpg",
  Quetta:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Quetta_Valley.jpg/800px-Quetta_Valley.jpg",
  "Kashmir Valley":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Kashmir_Valley.jpg/800px-Kashmir_Valley.jpg",
};

// Get image URL with Cloudinary + fallback
const getImgUrl = (name, width = 800, height = 500) => {
  const publicId = CLOUDINARY_IMAGES[name];
  if (publicId) {
    // Use Cloudinary
    return getImageUrl(publicId, width, height);
  }
  // Fallback to Wikimedia
  return (
    FALLBACK_IMAGES[name] ||
    `https://placehold.co/${width}x${height}/1a1a2e/white?text=${encodeURIComponent(name)}`
  );
};

// ── Sample trips ─────────────────────────────────────────────────────────────
export const SAMPLE_TRIPS = [
  {
    id: 1,
    destination: "Hunza Valley, Pakistan",
    origin: "Lahore, Pakistan",
    days: 6,
    budget: 85000,
    dates: "Jun 10 – Jun 16, 2025",
    image: getImgUrl("Hunza Valley", 800, 500),
    status: "completed",
    itinerary: [
      {
        day: 1,
        title: "Departure & Arrival in Gilgit",
        activities: [
          {
            time: "08:00 AM",
            type: "activity",
            name: "Departure from Lahore Airport",
            location: "Allama Iqbal Airport, Lahore",
          },
          {
            time: "01:30 PM",
            type: "activity",
            name: "Check-in at Gilgit Serena Hotel",
            location: "Jutial, Gilgit",
          },
          {
            time: "04:00 PM",
            type: "activity",
            name: "Kargah Buddha Rock Carving",
            location: "Kargah, Gilgit",
          },
          {
            time: "07:00 PM",
            type: "restaurant",
            name: "Dinner at Hunza Dining Hall",
            location: "Karimabad, Hunza",
          },
        ],
        hotel: {
          name: "Gilgit Serena Hotel",
          price: "PKR 25,000/night",
          rating: 4.8,
          why: "Premier accommodation in Gilgit, strategically located for Northern expeditions",
        },
        dailyCost: 35000,
      },
    ],
  },
  {
    id: 2,
    destination: "Gwadar, Balochistan",
    origin: "Karachi, Pakistan",
    days: 4,
    budget: 120000,
    dates: "Nov 05 – Nov 09, 2025",
    image: getImgUrl("Gwadar", 800, 500),
    status: "upcoming",
    itinerary: [],
  },
];

// ── Destinations ─────────────────────────────────────────────────────────────
export const DESTINATIONS = [
  {
    name: "Hunza Valley",
    img: getImgUrl("Hunza Valley", 800, 500),
    desc: "Azure lakes, ancient forts and snow-capped Karakoram peaks.",
  },
  {
    name: "Skardu",
    img: getImgUrl("Skardu", 800, 500),
    desc: "Gateway to K2 and world's greatest mountain adventure.",
  },
  {
    name: "Lahore",
    img: getImgUrl("Lahore", 800, 500),
    desc: "Mughal grandeur meets vibrant food streets and culture.",
  },
  {
    name: "Gwadar",
    img: getImgUrl("Gwadar", 800, 500),
    desc: "Arabia Sea coastline, deep blue waters and golden sunsets.",
  },
  {
    name: "Fairy Meadows",
    img: getImgUrl("Fairy Meadows", 800, 500),
    desc: "Alpine paradise at the foot of Nanga Parbat.",
  },
  {
    name: "Swat Valley",
    img: getImgUrl("Swat Valley", 800, 500),
    desc: "Switzerland of the East — lush green meadows and rivers.",
  },
  {
    name: "Karachi",
    img: getImgUrl("Karachi", 800, 500),
    desc: "Pakistan's metropolis — beaches, bazaars and bold flavors.",
  },
  {
    name: "Islamabad",
    img: getImgUrl("Islamabad", 800, 500),
    desc: "Serene capital city nestled against the Margalla Hills.",
  },
  {
    name: "Peshawar",
    img: getImgUrl("Peshawar", 800, 500),
    desc: "One of South Asia's oldest cities — a tapestry of history.",
  },
  {
    name: "Neelum Valley",
    img: getImgUrl("Neelum Valley", 800, 500),
    desc: "Crystal rivers and dense pine forests in AJK.",
  },
  {
    name: "Multan",
    img: getImgUrl("Multan", 800, 500),
    desc: "City of saints — shrines, mangoes and blue pottery.",
  },
  {
    name: "Naran Kaghan",
    img: getImgUrl("Naran Kaghan", 800, 500),
    desc: "Famous for Lake Saif-ul-Malook and breathtaking landscapes.",
  },
  {
    name: "Murree",
    img: getImgUrl("Murree", 800, 500),
    desc: "Colonial-era hill station with pine forests and mountain views.",
  },
  {
    name: "Bahawalpur",
    img: getImgUrl("Bahawalpur", 800, 500),
    desc: "Home to Derawar Fort and the Cholistan Desert.",
  },
  {
    name: "Quetta",
    img: getImgUrl("Quetta", 800, 500),
    desc: "Fruit orchards, Hazarganji Chiltan National Park and rich culture.",
  },
  {
    name: "Kashmir Valley",
    img: getImgUrl("Kashmir Valley", 800, 500),
    desc: "Heaven on Earth — serene lakes and Mughal gardens.",
  },
];

// ── Features (UNCHANGED) ─────────────────────────────────────────────────────
export const FEATURES = [
  {
    icon: "plane",
    title: "Intelligent Itineraries",
    desc: "Experience advanced travel planning with itineraries crafted by Google Gemini AI.",
  },
  {
    icon: "map",
    title: "Seamless Navigation",
    desc: "Every location and point of interest is integrated with live navigation tools.",
  },
  {
    icon: "sparkle",
    title: "Strategic Interface",
    desc: "Conversational planning designed to understand your unique travel requirements.",
  },
  {
    icon: "activity",
    title: "Rapid Generation",
    desc: "Secure a complete travel blueprint including logistics and costs in under 30 seconds.",
  },
  {
    icon: "user",
    title: "Enterprise Reliability",
    desc: "Optimized for consistent performance across all professional devices.",
  },
  {
    icon: "lock",
    title: "Enhanced Privacy",
    desc: "Secured with industry-standard authentication and data encryption protocols.",
  },
];

// ── Testimonials (UNCHANGED) ─────────────────────────────────────────────────
export const TESTIMONIALS = [
  {
    name: "Haris Ahmed",
    role: "Corporate Strategist",
    text: "Finally, a platform that understands the logistical challenges of Northern Pakistan. The itinerary accuracy is unmatched.",
    rating: 5,
  },
  {
    name: "Ayesha Khan",
    role: "Travel Documentarian",
    text: "The integration of local transport nuances and security protocols makes this an essential tool for any serious traveler in the region.",
    rating: 5,
  },
  {
    name: "Zainab Malik",
    role: "Operations Lead",
    text: "The budget forecasting in PKR is incredibly precise. It eliminated all the guesswork from our recent expedition to Skardu.",
    rating: 5,
  },
];

// ── Blogs (ONLY IMAGES CHANGED) ──────────────────────────────────────────────
export const BLOGS = [
  {
    id: 1,
    title: "The Ultimate Guide to Hunza Valley",
    category: "Expedition",
    excerpt:
      "From the majestic Passu Cones to the ancient Altit Fort, discover why Hunza is the crown jewel of Pakistani tourism. A complete logistics guide for 2025.",
    image: getImgUrl("Hunza Valley", 800, 500),
    readTime: "8 min read",
    date: "March 15, 2025",
  },
  {
    id: 2,
    title: "Skardu: Gateway to K2 Base Camp",
    category: "Adventure",
    excerpt:
      "Everything you need to know about trekking permits, acclimatization, and choosing the right Skardu-based outfitter for your K2 expedition.",
    image: getImgUrl("Skardu", 800, 500),
    readTime: "11 min read",
    date: "April 02, 2025",
  },
  {
    id: 3,
    title: "Lahore: A Culinary & Architectural Masterclass",
    category: "Culture",
    excerpt:
      "A deep dive into the Walled City's spice markets, the Badshahi Mosque, and the historical legacy of the Mughal Empire reimagined for 2025.",
    image: getImgUrl("Lahore", 800, 500),
    readTime: "6 min read",
    date: "May 10, 2025",
  },
];

// ── CHATBOT_QUESTIONS (UNCHANGED) ────────────────────────────────────────────
export const CHATBOT_QUESTIONS = [
  {
    id: "origin",
    question: "Please provide your point of departure.",
    placeholder: "e.g., Karachi, Pakistan",
    type: "text",
  },
  {
    id: "destination",
    question: "Where is your intended destination?",
    placeholder: "e.g., Hunza, Pakistan",
    type: "text",
  },
  {
    id: "days",
    question: "What is the intended duration of your stay in days?",
    placeholder: "e.g., 7",
    type: "number",
  },
  {
    id: "startDate",
    question: "What is your anticipated departure date?",
    placeholder: "e.g., 2025-06-15",
    type: "date",
  },
  {
    id: "budget",
    question: "What is your projected total budget in PKR?",
    placeholder: "e.g., 150000",
    type: "number",
  },
  {
    id: "preferences",
    question:
      "Specify travel preferences (e.g., Culture, Culinary, Architecture, Nature).",
    placeholder: "e.g., Culture, Food",
    type: "text",
  },
];
