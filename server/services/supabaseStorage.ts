import { createClient } from '@supabase/supabase-js';

// 检查必需的环境变量
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

// 使用服务角色密钥创建 Supabase 客户端（具有完全访问权限）
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Storage bucket 名称
const RESUME_BUCKET = 'resumes';

/**
 * Supabase Storage 服务类
 * 处理文件上传、下载和管理
 */
export class SupabaseStorageService {
  /**
   * 确保 resumes bucket 存在
   * 如果不存在则创建（首次运行时）
   */
  async ensureBucketExists(): Promise<void> {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === RESUME_BUCKET);

      if (!bucketExists) {
        console.log(`Creating ${RESUME_BUCKET} bucket...`);
        const { error: createError } = await supabase.storage.createBucket(RESUME_BUCKET, {
          public: false, // 私有 bucket，需要签名 URL 访问
          fileSizeLimit: 10485760, // 10MB 限制
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log(`${RESUME_BUCKET} bucket created successfully`);
        }
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  }

  /**
   * 上传简历文件到 Supabase Storage
   * @param candidateId 候选人 ID
   * @param fileBuffer 文件二进制数据
   * @param filename 原始文件名
   * @param contentType 文件 MIME 类型
   * @returns 文件在 storage 中的路径
   */
  async uploadResume(
    candidateId: string,
    fileBuffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    // 二次校验：文件类型
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(contentType)) {
      throw new Error(
        `Invalid file type: ${contentType}. Only PDF, DOC, and DOCX files are allowed.`
      );
    }

    // 二次校验：文件大小（10MB 限制）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxSize) {
      throw new Error(
        `File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 10MB.`
      );
    }

    // 生成唯一的文件路径：resumes/{candidateId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_'); // 清理文件名
    const filePath = `${candidateId}/${timestamp}-${sanitizedFilename}`;

    // 上传文件到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: false, // 不覆盖已存在的文件
        cacheControl: '3600' // 1小时缓存
      });

    if (error) {
      console.error('Error uploading file to Supabase Storage:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    console.log(`File uploaded successfully: ${data.path}`);
    return data.path;
  }

  /**
   * 获取简历文件的签名访问 URL
   * @param filePath 文件在 storage 中的路径
   * @param expiresIn 签名 URL 有效期（秒），默认 1 小时
   * @returns 签名 URL
   */
  async getResumeSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    if (!data?.signedUrl) {
      throw new Error('No signed URL returned from Supabase');
    }

    return data.signedUrl;
  }

  /**
   * 删除简历文件
   * @param filePath 文件在 storage 中的路径
   */
  async deleteResume(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(RESUME_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log(`File deleted successfully: ${filePath}`);
  }

  /**
   * 列出候选人的所有简历文件
   * @param candidateId 候选人 ID
   * @returns 文件列表
   */
  async listCandidateResumes(candidateId: string): Promise<Array<{
    name: string;
    path: string;
    size: number;
    createdAt: string;
  }>> {
    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .list(candidateId);

    if (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return (data || []).map(file => ({
      name: file.name,
      path: `${candidateId}/${file.name}`,
      size: file.metadata?.size || 0,
      createdAt: file.created_at
    }));
  }

  /**
   * 获取文件的公共 URL（仅适用于公共 bucket）
   * 注意：当前配置为私有 bucket，应使用 getResumeSignedUrl
   * @param filePath 文件路径
   * @returns 公共 URL
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(RESUME_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}

// 导出单例实例
export const supabaseStorageService = new SupabaseStorageService();

// 服务器启动时确保 bucket 存在
supabaseStorageService.ensureBucketExists().catch(err => {
  console.error('Failed to ensure bucket exists:', err);
});
