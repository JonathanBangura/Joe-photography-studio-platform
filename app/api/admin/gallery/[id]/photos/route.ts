import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/admin-auth";
import {
  buildGalleryStoragePath,
  GALLERY_IMAGES_BUCKET,
  getStoragePathFromPublicUrl,
  isAllowedGalleryImage,
  isGalleryImageTooLarge,
} from "@/lib/storage";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const context = await requireAdminContext();
    if ("error" in context) return context.error;

    const { id: galleryId } = await params;
    const formData = await request.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (!galleryId || files.length === 0) {
      return NextResponse.json({ error: "Gallery and photos are required" }, { status: 400 });
    }

    const uploadedPhotos = [];

    for (const file of files) {
      if (!isAllowedGalleryImage(file)) {
        throw new Error(`${file.name} is not a supported image type`);
      }
      if (isGalleryImageTooLarge(file)) {
        throw new Error(`${file.name} is too large. Maximum size is 35 MB`);
      }

      const storagePath = buildGalleryStoragePath(galleryId, file.name);
      const { error: uploadError } = await context.supabase.storage
        .from(GALLERY_IMAGES_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw new Error(`${file.name}: ${uploadError.message}`);

      const { data: publicUrlData } = context.supabase.storage
        .from(GALLERY_IMAGES_BUCKET)
        .getPublicUrl(storagePath);

      const { data: photo, error: insertError } = await context.supabase
        .from("client_gallery_photos")
        .insert({
          gallery_id: galleryId,
          image_url: publicUrlData.publicUrl,
          thumbnail_url: publicUrlData.publicUrl,
          title: file.name,
          is_selected: false,
        })
        .select("*")
        .single();

      if (insertError) {
        await context.supabase.storage.from(GALLERY_IMAGES_BUCKET).remove([storagePath]);
        throw new Error(`${file.name}: ${insertError.message}`);
      }

      uploadedPhotos.push(photo);
    }

    await context.supabase.from("audit_logs").insert({
      user_id: context.user.id,
      action: "upload_gallery_photos",
      resource_type: "client_gallery",
      resource_id: galleryId,
      new_data: { gallery_id: galleryId, count: uploadedPhotos.length },
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ photos: uploadedPhotos });
  } catch (error) {
    console.error("Gallery photo upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload photos" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await requireAdminContext();
    if ("error" in context) return context.error;

    const { id: galleryId } = await params;
    const body = await request.json();
    const photoId = String(body.photo_id || "");
    const isSelected = Boolean(body.is_selected);

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID is required" }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("client_gallery_photos")
      .update({ is_selected: isSelected })
      .eq("id", photoId)
      .eq("gallery_id", galleryId)
      .select("*")
      .single();

    if (error) throw error;

    await context.supabase.from("audit_logs").insert({
      user_id: context.user.id,
      action: "update_gallery_photo_selection",
      resource_type: "client_gallery_photo",
      resource_id: photoId,
      new_data: data,
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ photo: data });
  } catch (error) {
    console.error("Gallery photo selection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update photo selection" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const context = await requireAdminContext();
    if ("error" in context) return context.error;

    const { id: galleryId } = await params;
    const body = await request.json();
    const photoId = String(body.photo_id || "");

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID is required" }, { status: 400 });
    }

    const { data: photo, error: photoError } = await context.supabase
      .from("client_gallery_photos")
      .select("*")
      .eq("id", photoId)
      .eq("gallery_id", galleryId)
      .single();

    if (photoError) throw photoError;

    const { error: deleteError } = await context.supabase
      .from("client_gallery_photos")
      .delete()
      .eq("id", photoId)
      .eq("gallery_id", galleryId);

    if (deleteError) throw deleteError;

    const storagePath = getStoragePathFromPublicUrl(photo.image_url);
    if (storagePath) {
      const { error: storageError } = await context.supabase.storage
        .from(GALLERY_IMAGES_BUCKET)
        .remove([storagePath]);

      if (storageError) {
        console.warn("Gallery photo storage delete warning:", storageError.message);
      }
    }

    await context.supabase.from("audit_logs").insert({
      user_id: context.user.id,
      action: "delete_gallery_photo",
      resource_type: "client_gallery_photo",
      resource_id: photoId,
      old_data: photo,
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Gallery photo delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete photo" },
      { status: 500 },
    );
  }
}
