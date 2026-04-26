import { getImageUrl } from "./cloudinary";

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

/**
 * Resolve the best Cloudinary image for a destination string.
 * Fuzzy match: "Hunza Valley, Pakistan" still matches "Hunza Valley".
 * Priority: Cloudinary → Wikimedia fallback → placeholder
 */
const getDestinationImage = (
  destinationStr = "",
  width = 800,
  height = 500,
) => {
  const dest = destinationStr.toLowerCase().trim();
  const firstWord = dest.split(",")[0].trim();

  const matchedKey =
    Object.keys(CLOUDINARY_IMAGES).find((k) => k.toLowerCase() === dest) ||
    Object.keys(CLOUDINARY_IMAGES).find(
      (k) =>
        dest.includes(k.toLowerCase()) || k.toLowerCase().includes(firstWord),
    );

  if (matchedKey)
    return getImageUrl(CLOUDINARY_IMAGES[matchedKey], width, height);

  const fallbackKey = Object.keys(FALLBACK_IMAGES).find(
    (k) =>
      dest.includes(k.toLowerCase()) || k.toLowerCase().includes(firstWord),
  );
  if (fallbackKey) return FALLBACK_IMAGES[fallbackKey];

  return `https://placehold.co/${width}x${height}/1a1a2e/white?text=${encodeURIComponent(destinationStr || "Pakistan")}`;
};

export default getDestinationImage;
