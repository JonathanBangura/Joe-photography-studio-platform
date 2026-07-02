"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Download,
  Eye,
  ExternalLink,
  Heart,
  ImagePlus,
  Lock,
  Loader2,
  Mail,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
  formatFileSize,
  isAllowedGalleryImage,
  isGalleryImageTooLarge,
} from "@/lib/storage";
type ClientRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone?: string | null;
  } | null;
};

type ServiceRecord = {
  id: string;
  name: string;
  session_type?: string | null;
};

type StaffRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type BookingRecord = {
  id: string;
  booking_reference: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  service?: ServiceRecord | null;
  staff?: StaffRecord | null;
};

type GalleryPhotoRecord = {
  id: string;
  gallery_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  title: string | null;
  is_selected: boolean | null;
  photo_stage?: "selection" | "edited" | null;
  download_enabled?: boolean | null;
  created_at: string;
};

type GalleryRecord = {
  id: string;
  client_id: string | null;
  booking_id: string | null;
  title: string;
  access_code: string | null;
  expires_at: string | null;
  is_active: boolean | null;
  status?:
    | "draft"
    | "published"
    | "selection_submitted"
    | "editing"
    | "final_uploaded"
    | "delivered"
    | "completed"
    | null;
  selection_submitted_at?: string | null;
  delivered_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  client?: ClientRecord | null;
  booking?: BookingRecord | null;
  photos?: GalleryPhotoRecord[] | null;
};

interface GalleryDetailClientProps {
  initialGallery: GalleryRecord;
}

function getClientName(client?: ClientRecord | null) {
  return (
    client?.full_name ||
    client?.profile?.full_name ||
    client?.email ||
    client?.profile?.email ||
    "Unknown Client"
  );
}

function getClientEmail(client?: ClientRecord | null) {
  return client?.email || client?.profile?.email || "No email";
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

function getPhotoStage(photo: GalleryPhotoRecord) {
  return photo.photo_stage === "edited" ? "edited" : "selection";
}

function getGalleryStatusLabel(status?: string | null, isActive?: boolean | null) {
  if (!status) return isActive ? "Published" : "Draft";
  const labels: Record<string, string> = {
    draft: "Draft",
    published: "Published for Selection",
    selection_submitted: "Selection Submitted",
    editing: "Editing in Progress",
    final_uploaded: "Final Photos Uploaded",
    delivered: "Delivered",
    completed: "Completed",
  };
  return labels[status] || status.replace(/_/g, " ");
}

export function GalleryDetailClient({
  initialGallery,
}: GalleryDetailClientProps) {
  const router = useRouter();
  const [gallery, setGallery] = useState<GalleryRecord>(initialGallery);
  const [photos, setPhotos] = useState<GalleryPhotoRecord[]>(
    initialGallery.photos || [],
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStage, setUploadStage] = useState<"selection" | "edited">("selection");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhotoRecord | null>(
    null,
  );
  const [previewPhoto, setPreviewPhoto] = useState<GalleryPhotoRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(
    null,
  );
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSendingGalleryEmail, setIsSendingGalleryEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const proofPhotos = useMemo(
    () => photos.filter((photo) => getPhotoStage(photo) === "selection"),
    [photos],
  );
  const finalPhotos = useMemo(
    () => photos.filter((photo) => getPhotoStage(photo) === "edited"),
    [photos],
  );
  const selectedPhotos = useMemo(
    () => proofPhotos.filter((photo) => photo.is_selected),
    [proofPhotos],
  );
  const selectedCount = selectedPhotos.length;
  const galleryStatus = gallery.status || (gallery.is_active ? "published" : "draft");
  const galleryLink =
    typeof window !== "undefined" && gallery.access_code
      ? `${window.location.origin}/gallery/${gallery.access_code}`
      : "";

  const refreshPhotos = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("client_gallery_photos")
      .select("*")
      .eq("gallery_id", gallery.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to refresh photos");
      return;
    }

    setPhotos((data || []) as GalleryPhotoRecord[]);
  };

  const copyGalleryLink = async () => {
    if (!galleryLink) return;
    await navigator.clipboard.writeText(galleryLink);
    toast.success("Gallery link copied");
  };

  const sendGalleryLinkEmail = async () => {
    try {
      setIsSendingGalleryEmail(true);

      const response = await fetch(`/api/admin/gallery/${gallery.id}/email`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send gallery link");
      }

      if (result.gallery) {
        setGallery({
          ...gallery,
          ...result.gallery,
          client: gallery.client,
          booking: gallery.booking,
          photos,
        } as GalleryRecord);
      }

      toast.success("Gallery link sent to customer");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send gallery link",
      );
    } finally {
      setIsSendingGalleryEmail(false);
    }
  };

  const handleFileSelection = (files: FileList | null) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) return;

    const validFiles: File[] = [];

    for (const file of nextFiles) {
      if (!isAllowedGalleryImage(file)) {
        toast.error(`${file.name} is not a supported image type`);
        continue;
      }
      if (isGalleryImageTooLarge(file)) {
        toast.error(`${file.name} is too large. Maximum size is 35 MB`);
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles(validFiles);
  };

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Choose photos first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append("photo_stage", uploadStage);

      const response = await fetch(`/api/admin/gallery/${gallery.id}/photos`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload photos");
      }

      const uploadedPhotos = (result.photos || []) as GalleryPhotoRecord[];

      setPhotos([...uploadedPhotos, ...photos]);
      if (uploadStage === "edited") {
        setGallery((current) => ({ ...current, status: "final_uploaded" }));
      }
      setSelectedFiles([]);
      setUploadProgress(100);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(
        `${uploadedPhotos.length} ${uploadStage === "edited" ? "final edited" : "proof"} photo${uploadedPhotos.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photos",
      );
      await refreshPhotos();
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const updateGalleryStatus = async (
    status:
      | "draft"
      | "published"
      | "selection_submitted"
      | "editing"
      | "final_uploaded"
      | "delivered"
      | "completed",
  ) => {
    try {
      setIsUpdatingStatus(true);

      const response = await fetch(`/api/admin/gallery/${gallery.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update gallery status");
      }

      if (result.gallery) {
        setGallery({
          ...gallery,
          ...result.gallery,
          client: gallery.client,
          booking: gallery.booking,
          photos,
        } as GalleryRecord);
      } else {
        setGallery({
          ...gallery,
          is_active: status !== "draft",
        });
      }

      const labelMap: Record<string, string> = {
        draft: "Draft",
        published: "Published for Selection",
        selection_submitted: "Selection Submitted",
        editing: "Editing In Progress",
        final_uploaded: "Final Photos Uploaded",
        delivered: "Final Delivery",
        completed: "Completed",
      };

      toast.success(`Gallery status updated to ${labelMap[status]}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update gallery status",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const togglePublish = async () => {
    await updateGalleryStatus(gallery.is_active ? "draft" : "published");
  };

  const togglePhotoSelection = async (photo: GalleryPhotoRecord) => {
    const nextValue = !photo.is_selected;

    const response = await fetch(`/api/admin/gallery/${gallery.id}/photos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: photo.id, is_selected: nextValue }),
    });
    const result = await response.json();

    if (!response.ok) {
      console.error(result.error);
      toast.error(result.error || "Failed to update photo selection");
      return;
    }

    setPhotos(
      photos.map((item) =>
        item.id === photo.id ? (result.photo as GalleryPhotoRecord) : item,
      ),
    );
  };

  const deletePhoto = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    const response = await fetch(`/api/admin/gallery/${gallery.id}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: deleteTarget.id }),
    });
    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error || "Failed to delete photo");
      setIsDeleting(false);
      return;
    }

    setPhotos(photos.filter((photo) => photo.id !== deleteTarget.id));
    setDeleteTarget(null);
    setIsDeleting(false);
    toast.success("Photo deleted");
  };

  const sanitizeDownloadName = (name: string) => {
    return (
      name
        .trim()
        .replace(/[^a-zA-Z0-9\s._-]/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 80) || "Client"
    );
  };

  const getPhotoExtension = (photo: GalleryPhotoRecord) => {
    const source = photo.title || photo.image_url;
    const cleanSource = source.split("?")[0];
    const extension = cleanSource.includes(".")
      ? cleanSource.split(".").pop()?.toLowerCase()
      : "jpg";
    if (!extension || extension.length > 5) return "jpg";
    return extension;
  };

  const downloadPhoto = async (
    photo: GalleryPhotoRecord,
    fileName?: string,
  ) => {
    setDownloadingPhotoId(photo.id);
    try {
      const response = await fetch(photo.image_url);
      if (!response.ok) throw new Error("Could not fetch original photo");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download =
        fileName ||
        photo.title ||
        `gallery-photo-${photo.id}.${getPhotoExtension(photo)}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download photo");
    } finally {
      setDownloadingPhotoId(null);
    }
  };

  const downloadSelectedPhotos = async () => {
    if (selectedPhotos.length === 0) {
      toast.error("No selected photos to download");
      return;
    }

    setIsDownloadingSelected(true);
    const clientName = sanitizeDownloadName(getClientName(gallery.client));

    try {
      for (let index = 0; index < selectedPhotos.length; index++) {
        const photo = selectedPhotos[index];
        const extension = getPhotoExtension(photo);
        await downloadPhoto(
          photo,
          `${clientName} Selected ${index + 1}.${extension}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      toast.success(
        `${selectedPhotos.length} selected photo${selectedPhotos.length === 1 ? "" : "s"} downloaded`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to download selected photos");
    } finally {
      setIsDownloadingSelected(false);
    }
  };

  const renderPhotoGrid = (
    items: GalleryPhotoRecord[],
    emptyTitle: string,
    emptyDescription: string,
  ) => {
    if (items.length === 0) {
      return (
        <div className="py-16 text-center">
          <ImagePlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="font-semibold">{emptyTitle}</h3>
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((photo) => {
          const isEdited = getPhotoStage(photo) === "edited";
          return (
            <div
              key={photo.id}
              className="group overflow-hidden rounded-xl border bg-card"
            >
              <div
                className="relative aspect-[4/3] cursor-pointer bg-muted"
                onClick={() => setPreviewPhoto(photo)}
              >
                <Image
                  src={photo.image_url}
                  alt={photo.title || "Gallery photo"}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute left-3 top-3 flex gap-2">
                  <Badge variant={isEdited ? "default" : "secondary"}>
                    {isEdited ? (
                      <>
                        <Sparkles className="mr-1 h-3 w-3" />
                        Final
                      </>
                    ) : (
                      "Proof"
                    )}
                  </Badge>
                  {!isEdited && (
                    <Badge variant="outline" className="bg-background/90">
                      <Lock className="mr-1 h-3 w-3" />
                      Client download off
                    </Badge>
                  )}
                </div>
                <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3 pt-12 opacity-0 transition-opacity group-hover:opacity-100">
                  {!isEdited ? (
                    <Button
                      size="icon"
                      variant={photo.is_selected ? "default" : "secondary"}
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePhotoSelection(photo);
                      }}
                      title="Toggle selected"
                    >
                      <Heart
                        className={
                          photo.is_selected
                            ? "h-4 w-4 fill-current"
                            : "h-4 w-4"
                        }
                      />
                    </Button>
                  ) : (
                    <Badge className="bg-green-600 text-white">Download ready</Badge>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPreviewPhoto(photo);
                      }}
                      title="Preview photo"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadPhoto(photo);
                      }}
                      title={isEdited ? "Download final photo" : "Download proof internally"}
                      disabled={downloadingPhotoId === photo.id}
                    >
                      {downloadingPhotoId === photo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(photo);
                      }}
                      title="Delete photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {photo.is_selected && !isEdited && (
                  <Badge className="absolute bottom-3 left-3">
                    <Heart className="mr-1 h-3 w-3 fill-current" />
                    Selected
                  </Badge>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">
                  {photo.title || "Untitled photo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {formatDate(photo.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{gallery.title}</h1>
            <Badge variant={gallery.is_active ? "default" : "secondary"}>
              {getGalleryStatusLabel(galleryStatus, gallery.is_active)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Upload photos, manage delivery access, and monitor client
            selections.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={copyGalleryLink}
            disabled={!gallery.access_code}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          {gallery.access_code && (
            <Button asChild variant="outline">
              <Link href={`/gallery/${gallery.access_code}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Client View
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={sendGalleryLinkEmail}
            disabled={!gallery.access_code || isSendingGalleryEmail}
          >
            {isSendingGalleryEmail ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send Link
          </Button>
          <Button
            variant="outline"
            onClick={downloadSelectedPhotos}
            disabled={selectedCount === 0 || isDownloadingSelected}
          >
            {isDownloadingSelected ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Selected ({selectedCount})
          </Button>
          <Button
            onClick={togglePublish}
            variant={gallery.is_active ? "secondary" : "default"}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : gallery.is_active ? (
              <X className="mr-2 h-4 w-4" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {gallery.is_active ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="outline"
            onClick={() => updateGalleryStatus("editing")}
            disabled={isUpdatingStatus || !gallery.booking_id}
          >
            Mark Editing
          </Button>
          <Button
            variant="outline"
            onClick={() => updateGalleryStatus("final_uploaded")}
            disabled={isUpdatingStatus || !gallery.booking_id || finalPhotos.length === 0}
          >
            Mark Finals Uploaded
          </Button>
          <Button
            variant="outline"
            onClick={() => updateGalleryStatus("delivered")}
            disabled={isUpdatingStatus || !gallery.booking_id || finalPhotos.length === 0}
          >
            Mark Delivered
          </Button>
          <Button
            variant="outline"
            onClick={() => updateGalleryStatus("completed")}
            disabled={isUpdatingStatus || !gallery.booking_id}
          >
            Mark Completed
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Proof Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proofPhotos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected Proofs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Final Edited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finalPhotos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Access Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-lg font-semibold">
              {gallery.access_code || "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Gallery Photos
              </CardTitle>
              <CardDescription>
                Choose whether these files are client selection proofs or final edited photos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[260px_1fr] md:items-end">
                <div className="space-y-2">
                  <Label>Upload Target</Label>
                  <Select value={uploadStage} onValueChange={(value) => setUploadStage(value as "selection" | "edited")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selection">Selection Proofs</SelectItem>
                      <SelectItem value="edited">Final Edited Photos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  {uploadStage === "selection"
                    ? "Proof photos are view-and-select only for the client. Downloads stay disabled."
                    : "Final edited photos appear in the delivery area and become downloadable after you mark the gallery delivered."}
                </div>
              </div>

              <div className="rounded-lg border border-dashed p-6 text-center">
                <ImagePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <Label
                  htmlFor="photo-upload"
                  className="cursor-pointer font-medium"
                >
                  Choose {uploadStage === "selection" ? "proof" : "final edited"} photos
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can select multiple JPG, PNG, WEBP, or GIF files at once. Maximum file size is 35 MB per photo.
                </p>
                <Input
                  ref={fileInputRef}
                  id="photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="mt-4"
                  onChange={(event) => handleFileSelection(event.target.files)}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">Ready to upload</h3>
                    <span className="text-sm text-muted-foreground">
                      {selectedFiles.length} file
                      {selectedFiles.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="max-h-40 space-y-2 overflow-y-auto text-sm">
                    {selectedFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                      >
                        <span className="truncate">{file.name}</span>
                        <span className="ml-3 shrink-0 text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-muted-foreground">
                    Uploading photos... {uploadProgress}%
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={isUploading || selectedFiles.length === 0}
                >
                  Clear
                </Button>
                <Button
                  onClick={uploadPhotos}
                  disabled={isUploading || selectedFiles.length === 0}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload {uploadStage === "selection" ? "Proofs" : "Finals"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gallery Workspace</CardTitle>
              <CardDescription>
                Keep client selection proofs separate from final edited delivery files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="proofs" className="space-y-5">
                <TabsList className="grid h-auto w-full grid-cols-3">
                  <TabsTrigger value="proofs">Selection Proofs ({proofPhotos.length})</TabsTrigger>
                  <TabsTrigger value="finals">Final Edited ({finalPhotos.length})</TabsTrigger>
                  <TabsTrigger value="selected">Client Selection ({selectedCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="proofs" className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Proofs are for viewing and selecting only. The client cannot download these files from the public gallery.
                  </div>
                  {renderPhotoGrid(
                    proofPhotos,
                    "No proof photos uploaded yet",
                    "Upload selection proofs above to let the client choose images for editing.",
                  )}
                </TabsContent>

                <TabsContent value="finals" className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Final edited photos are the only files the client can download after this gallery is marked delivered.
                  </div>
                  {renderPhotoGrid(
                    finalPhotos,
                    "No final edited photos uploaded yet",
                    "Switch the upload target to Final Edited Photos when the edits are ready.",
                  )}
                </TabsContent>

                <TabsContent value="selected" className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-lg border bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">Client selected {selectedCount} proof photo{selectedCount === 1 ? "" : "s"}.</p>
                      <p className="text-muted-foreground">Use this tab as the editor&apos;s working list.</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={downloadSelectedPhotos}
                      disabled={selectedCount === 0 || isDownloadingSelected}
                    >
                      {isDownloadingSelected ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download Selected
                    </Button>
                  </div>
                  {renderPhotoGrid(
                    selectedPhotos,
                    "No client selections yet",
                    "Selected proof photos will appear here once the client chooses their favorites.",
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Details</CardTitle>
              <CardDescription>
                Client and booking information linked to this gallery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">{getClientName(gallery.client)}</p>
                <p className="text-muted-foreground">
                  {getClientEmail(gallery.client)}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Booking</p>
                <p className="font-medium">
                  {gallery.booking?.booking_reference ||
                    gallery.booking_id?.slice(0, 8) ||
                    "N/A"}
                </p>
                <p className="text-muted-foreground">
                  {gallery.booking?.service?.name || "Service not set"}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Shoot Date</p>
                  <p className="font-medium">
                    {formatDate(gallery.booking?.booking_date)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gallery Status</p>
                  <p className="font-medium capitalize">
                    {getGalleryStatusLabel(galleryStatus, gallery.is_active)}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className="font-medium">{formatDate(gallery.expires_at)}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Assigned Photographer</p>
                <p className="font-medium">
                  {gallery.booking?.staff?.full_name ||
                    gallery.booking?.staff?.email ||
                    "Not assigned"}
                </p>
              </div>
              {galleryLink && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground">Client Link</p>
                    <button
                      type="button"
                      onClick={copyGalleryLink}
                      className="break-all text-left text-primary hover:underline"
                    >
                      {galleryLink}
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Actions</CardTitle>
              <CardDescription>
                Move this gallery through the studio delivery workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant={gallery.is_active ? "secondary" : "default"}
                onClick={() => updateGalleryStatus(gallery.is_active ? "draft" : "published")}
                disabled={isUpdatingStatus}
              >
                {gallery.is_active ? (
                  <X className="mr-2 h-4 w-4" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {gallery.is_active ? "Move to Draft" : "Publish for Selection"}
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => updateGalleryStatus("selection_submitted")}
                disabled={isUpdatingStatus || !gallery.booking_id || selectedCount === 0}
              >
                Lock Selection & Start Editing
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => updateGalleryStatus("editing")}
                disabled={isUpdatingStatus || !gallery.booking_id}
              >
                Mark Editing In Progress
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => updateGalleryStatus("final_uploaded")}
                disabled={isUpdatingStatus || !gallery.booking_id || finalPhotos.length === 0}
              >
                Mark Final Photos Uploaded
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => updateGalleryStatus("delivered")}
                disabled={isUpdatingStatus || !gallery.booking_id || finalPhotos.length === 0}
              >
                Deliver Final Downloads
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => updateGalleryStatus("completed")}
                disabled={isUpdatingStatus || !gallery.booking_id}
              >
                Mark Job Closed
              </Button>
              {!gallery.booking_id && (
                <p className="text-xs text-muted-foreground">
                  Workflow actions require this gallery to be linked to a booking.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={!!previewPhoto}
        onOpenChange={(open) => !open && setPreviewPhoto(null)}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {previewPhoto?.title || "Gallery photo preview"}
            </DialogTitle>
            <DialogDescription>
              Preview this {previewPhoto && getPhotoStage(previewPhoto) === "edited" ? "final edited photo" : "selection proof"}. Proof downloads are available here for staff only.
            </DialogDescription>
          </DialogHeader>
          {previewPhoto && (
            <div className="space-y-4">
              <div className="relative max-h-[70vh] min-h-[420px] overflow-hidden rounded-xl bg-muted">
                <Image
                  src={previewPhoto.image_url}
                  alt={previewPhoto.title || "Gallery photo preview"}
                  fill
                  sizes="90vw"
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  <p>
                    {getPhotoStage(previewPhoto) === "edited"
                      ? "Final edited delivery file"
                      : previewPhoto.is_selected
                      ? "Selected by client/admin"
                      : "Not selected"}
                  </p>
                  <p>Uploaded {formatDate(previewPhoto.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {getPhotoStage(previewPhoto) === "selection" && (
                    <Button
                      variant="outline"
                      onClick={() => togglePhotoSelection(previewPhoto)}
                    >
                      <Heart
                        className={
                          previewPhoto.is_selected
                            ? "mr-2 h-4 w-4 fill-current"
                            : "mr-2 h-4 w-4"
                        }
                      />
                      {previewPhoto.is_selected ? "Unselect" : "Mark Selected"}
                    </Button>
                  )}
                  <Button
                    onClick={() => downloadPhoto(previewPhoto)}
                    disabled={downloadingPhotoId === previewPhoto.id}
                  >
                    {downloadingPhotoId === previewPhoto.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {getPhotoStage(previewPhoto) === "edited" ? "Download Final" : "Download Proof"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete photo?</DialogTitle>
            <DialogDescription>
              This removes the photo record and attempts to delete the uploaded
              image from Supabase Storage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deletePhoto}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
