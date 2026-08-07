import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/admin-auth";
import {
  buildPortfolioStoragePath,
  GALLERY_IMAGES_BUCKET,
  isAllowedGalleryImageType,
  MAX_GALLERY_IMAGE_SIZE_BYTES,
  MAX_PORTFOLIO_UPLOAD_FILES,
  PORTFOLIO_IMAGES_FOLDER,
} from "@/lib/storage";

type UploadRequestFile = {
  name?: unknown;
  size?: unknown;
  type?: unknown;
};

function parseUploadFile(value: unknown) {
  const file = value && typeof value === "object" ? value as UploadRequestFile : {};
  const name = String(file.name || "").trim();
  const type = String(file.type || "").trim().toLowerCase();
  const size = Number(file.size);

  if (!name) throw new Error("Every image must have a file name.");
  if (!isAllowedGalleryImageType(type)) {
    throw new Error(`${name} is not a supported image type.`);
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`${name} is empty or has an invalid size.`);
  }
  if (size > MAX_GALLERY_IMAGE_SIZE_BYTES) {
    throw new Error(`${name} is too large. Maximum size is 35 MB.`);
  }

  return { name, size, type };
}

export async function POST(request: Request) {
  try {
    const context = await requireAdminContext();
    if ("error" in context) return context.error;

    const body = await request.json();
    const requestedFiles = Array.isArray(body.files) ? body.files : [];

    if (requestedFiles.length === 0) {
      return NextResponse.json({ error: "Choose at least one image." }, { status: 400 });
    }
    if (requestedFiles.length > MAX_PORTFOLIO_UPLOAD_FILES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_PORTFOLIO_UPLOAD_FILES} images at once.` },
        { status: 400 },
      );
    }

    const files = requestedFiles.map((file: unknown) => parseUploadFile(file));
    const uploads = [];

    for (const file of files) {
      const path = buildPortfolioStoragePath(file.name);
      const { data, error } = await context.supabase.storage
        .from(GALLERY_IMAGES_BUCKET)
        .createSignedUploadUrl(path);

      if (error) throw new Error(`${file.name}: ${error.message}`);
      if (!data?.token) throw new Error(`${file.name}: Supabase did not return an upload token.`);

      const { data: publicUrlData } = context.supabase.storage
        .from(GALLERY_IMAGES_BUCKET)
        .getPublicUrl(path);

      uploads.push({
        name: file.name,
        path,
        token: data.token,
        url: publicUrlData.publicUrl,
      });
    }

    await context.supabase.from("audit_logs").insert({
      user_id: context.user.id,
      action: "create_portfolio_upload_tokens",
      resource_type: "gallery",
      new_data: {
        bucket: GALLERY_IMAGES_BUCKET,
        folder: PORTFOLIO_IMAGES_FOLDER,
        files,
      },
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json(
      { success: true, uploads },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Portfolio signed upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to prepare portfolio upload.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireAdminContext();
    if ("error" in context) return context.error;

    const body = await request.json();
    const paths = Array.isArray(body.paths)
      ? body.paths
        .map((path: unknown) => String(path || "").trim())
        .filter((path: string) => path.startsWith(`${PORTFOLIO_IMAGES_FOLDER}/`))
        .slice(0, MAX_PORTFOLIO_UPLOAD_FILES)
      : [];

    if (paths.length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error } = await context.supabase.storage
      .from(GALLERY_IMAGES_BUCKET)
      .remove(paths);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Portfolio upload cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clean up portfolio uploads.",
      },
      { status: 500 },
    );
  }
}
