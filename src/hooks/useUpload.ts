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
        // Step 1: Request presigned upload authorization from backend (Section 12)
        const initResult = await initiateUploadMutation.mutateAsync({
          roomId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSizeBytes: file.size,
        });

        // Step 2: Direct PUT upload to Cloudflare R2
        const response = await fetch(initResult.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!response.ok) {
          throw new Error(`Upload to R2 failed with HTTP status ${response.status}`);
        }

        setUploadProgress(100);
        setIsUploading(false);

        return {
          objectKey: initResult.key,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          publicUrl: initResult.publicUrl,
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
