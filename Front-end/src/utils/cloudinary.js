// Front-end/src/utils/cloudinary.js

const CLOUD_NAME = "dxw9cdojt"; // Your cloud name from the working URL

// Get image URL with transformations (resize, optimize)
export const getImageUrl = (
  publicId,
  width = 800,
  height = 500,
  quality = "auto",
) => {
  if (!publicId) return "";

  // Remove any extension if present
  const cleanPublicId = publicId.replace(/\.(jpg|jpeg|png|webp)$/i, "");

  // Add transformations
  const transformations = `c_fill,w_${width},h_${height},q_${quality},f_auto`;

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${cleanPublicId}`;
};

// Get raw image URL (no transformations)
export const getRawImageUrl = (publicId) => {
  if (!publicId) return "";
  const cleanPublicId = publicId.replace(/\.(jpg|jpeg|png|webp)$/i, "");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${cleanPublicId}`;
};

export default { getImageUrl, getRawImageUrl };
