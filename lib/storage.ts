export const GALLERY_IMAGES_BUCKET = "gallery-images";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const MAX_GALLERY_IMAGE_SIZE_BYTES = 35 * 1024 * 1024;

export function isAllowedGalleryImage(file: File) {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

export function isGalleryImageTooLarge(file: File) {
  return file.size > MAX_GALLERY_IMAGE_SIZE_BYTES;
}

export function sanitizeFileName(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${baseName || "photo"}.${extension}`;
}

export function buildGalleryStoragePath(galleryId: string, fileName: string) {
  const safeName = sanitizeFileName(fileName);
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${galleryId}/${uniqueId}-${safeName}`;
}

export function getStoragePathFromPublicUrl(
  publicUrl: string,
  bucketName = GALLERY_IMAGES_BUCKET,
) {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
