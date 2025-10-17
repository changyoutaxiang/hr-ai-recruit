import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import XHRUpload from "@uppy/xhr-upload";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  candidateId: string;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export default function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  candidateId,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const supabase = getSupabaseClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uppy, setUppy] = useState<Uppy | null>(null);

  useEffect(() => {
    const initializeUppy = async () => {
      // 获取当前认证令牌
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'X-Candidate-ID': candidateId,
      };

      // 如果有认证令牌，添加到请求头
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const uppyInstance = new Uppy({
        restrictions: {
          maxNumberOfFiles,
          maxFileSize,
          allowedFileTypes: [".pdf"],
        },
      })
        .use(XHRUpload, {
          endpoint: `/api/objects/proxy-upload`,
          method: 'POST',
          formData: true,
          fieldName: 'file',
          headers,
        })
        .on("complete", (result) => {
          setIsModalOpen(false);
          onComplete?.(result);
        });

      setUppy(uppyInstance);
    };

    initializeUppy();

    // 清理函数
    return () => {
      if (uppy) {
        uppy.destroy();
      }
    };
  }, [candidateId, maxNumberOfFiles, maxFileSize, onComplete]);

  // 如果Uppy还没有初始化，显示加载状态
  if (!uppy) {
    return (
      <Button
        disabled
        className={buttonClassName}
        variant="outline"
      >
        Loading...
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className={buttonClassName}
        variant="outline"
      >
        {children}
      </Button>
      <DashboardModal
        uppy={uppy}
        open={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </>
  );
}
