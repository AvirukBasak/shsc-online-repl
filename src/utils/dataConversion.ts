import { Nullable } from "@/types";
import sharp from "sharp";

const SHARP_JPEG_OPTIONS: sharp.JpegOptions = { progressive: true, quality: 90, mozjpeg: true };

export interface ImgWithWidth<N> {
  buffer: Buffer;
  type: string;
  width: N;
}

export async function resizeImageMultiWidth(
  imageBuffer: Buffer
): Promise<{ small: ImgWithWidth<30>; medium: ImgWithWidth<90>; large: ImgWithWidth<500> }> {
  const promises = [
    // WARNING: resize before encoding, not after
    // NOTE: setting a quality is unncessary but doesn't hurt
    sharp(imageBuffer).resize(30).jpeg(SHARP_JPEG_OPTIONS).toBuffer(),
    sharp(imageBuffer).resize(90).jpeg(SHARP_JPEG_OPTIONS).toBuffer(),
    sharp(imageBuffer).resize(500).jpeg(SHARP_JPEG_OPTIONS).toBuffer(),
  ];
  const [small, medium, large] = await Promise.all(promises);
  return {
    small: { buffer: small as Buffer, width: 30, type: "image/jpeg" },
    medium: { buffer: medium as Buffer, width: 90, type: "image/jpeg" },
    large: { buffer: large as Buffer, width: 500, type: "image/jpeg" },
  };
}

export async function resizeImage<N extends number>(imageBuffer: Buffer, n: N): Promise<ImgWithWidth<N>> {
  // WARNING: resize before encoding, not after
  // NOTE: setting a quality is unncessary but doesn't hurt
  const buffer = await sharp(imageBuffer).resize(n).jpeg(SHARP_JPEG_OPTIONS).toBuffer();
  return { buffer: buffer, width: n, type: "image/jpeg" };
}

export async function convertToJpeg(imageBuffer: Buffer): Promise<ImgWithWidth<Nullable<number>>> {
  const image = sharp(imageBuffer).jpeg(SHARP_JPEG_OPTIONS);
  const metadata = await image.metadata();
  const buffer = await image.toBuffer();
  return { buffer, type: "image/jpeg", width: metadata.width ?? null };
}
