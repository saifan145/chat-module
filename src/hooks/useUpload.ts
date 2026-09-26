import { useState, useCallback } from "react";
import { trpc } from "@/utils/trpc";

export function useUpload(roomId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const initiateUploadMutation = trpc.upload.initiate.useMutation();

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
        if (file.size > MAX_FILE_SIZE_BYTES) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
          throw new Error(
            `"${file.name}" is ${fileSizeMB}MB, which exceeds the 20MB upload limit.`
          );
        }

        // Step 1: Request upload authorization from backend (Section 12)
        const initResult = await initiateUploadMutation.mutateAsync({
          roomId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSizeBytes: file.size,
        });

        // Step 2: Stream upload (with seamless fallback if cloud R2 CORS/auth fails)
        let response: Response;
        try {
          response = await fetch(initResult.uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });

          if (!response.ok) {
            throw new Error(`Cloud upload rejected with status ${response.status}`);
          }
        } catch (uploadErr: any) {
          // If direct cloud storage fails (CORS, network or R2 credentials), fallback to server storage
          console.warn("Direct cloud upload failed, retrying via server storage fallback:", uploadErr);
          const fallbackUrl = `/api/upload?key=${encodeURIComponent(initResult.key)}`;
          response = await fetch(fallbackUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });

          if (!response.ok) {
            throw new Error(`File upload failed with HTTP status ${response.status}`);
          }
        }

        setUploadProgress(100);
        setIsUploading(false);

        return {
          objectKey: initResult.key,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          publicUrl: initResult.publicUrl || `/uploads/${initResult.key}`,
        };
      } catch (err: any) {
        setIsUploading(false);
        setError(err.message || "Failed to upload file");
        throw err;
      }
    },
    [roomId, initiateUploadMutation]
  );

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    error,
  };
}
