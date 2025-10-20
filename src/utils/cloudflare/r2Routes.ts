import express from "express";
import multer from "multer";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { getSignedUrl, uploadFolderToR2, uploadFileToR2, deleteFolderFromR2 } from "./r2Operations";
import { logger } from "../logger";

const router = express.Router();
const execAsync = promisify(exec);

// Configure multer for file uploads
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|txt|json/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

/**
 * Convert video to HLS format using FFmpeg
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Directory for HLS output
 */
export async function convertToHLS(inputPath: string, outputDir: string): Promise<void> {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const command = `ffmpeg -i "${inputPath}" -profile:v baseline -level 3.0 -start_number 0 -hls_time 4 -hls_list_size 0 -f hls "${outputDir}/output.m3u8"`;
    await execAsync(command);
    logger.info(`Video converted to HLS: ${outputDir}`);
  } catch (error) {
    logger.error('FFmpeg conversion error:', error as Error);
    throw new Error('Video conversion failed');
  }
}

/**
 * Extract thumbnail from video using FFmpeg
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path for thumbnail output
 */
export async function extractThumbnail(inputPath: string, outputPath: string): Promise<void> {
  try {
    const command = `ffmpeg -ss 00:00:01 -i "${inputPath}" -vframes 1 -q:v 2 "${outputPath}"`;
    await execAsync(command);
    logger.info(`Thumbnail extracted: ${outputPath}`);
  } catch (error) {
    logger.error('Thumbnail extraction error:', error as Error);
    throw new Error('Thumbnail extraction failed');
  }
}

/**
 * Delete folder recursively
 * @param {string} folderPath - Path to folder to delete
 */
export const deleteFolderRecursive = async (folderPath: string): Promise<void> => {
  try {
    await fs.promises.rm(folderPath, { recursive: true, force: true });
    logger.info(`✅ Deleted folder: ${folderPath}`);
  } catch (err) {
    logger.error(`❌ Failed to delete folder ${folderPath}`, err as Error);
  }
};

/**
 * Generate unique ID for file operations
 */
function generateFileId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Video upload endpoint
router.post("/upload-video", upload.single("video"), async (req, res) => {
  let filePath: string | undefined;
  let outputDir: string | undefined;
  let thumbnailPath: string | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No video file provided"
      });
    }

    filePath = req.file.path;
    const id = generateFileId();
    outputDir = `output/${id}`;
    thumbnailPath = `${outputDir}/thumbnail.jpg`;

    logger.info(`Processing video upload: ${req.file.originalname}`);

    // Convert video to HLS
    await convertToHLS(filePath, outputDir);
    
    // Extract thumbnail
    await extractThumbnail(filePath, thumbnailPath);
    
    // Upload to R2
    await uploadFolderToR2(outputDir, `videos/${id}`);

    // Get signed URLs
    const videoUrl = getSignedUrl(`videos/${id}/output.m3u8`);
    const thumbnailUrl = getSignedUrl(`videos/${id}/thumbnail.jpg`);

    return res.json({
      success: true,
      data: {
        id,
        videoUrl,
        thumbnailUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    logger.error("❌ Error in /upload-video:", err as Error);
    return res.status(500).json({
      success: false,
      error: "Video processing failed"
    });
  } finally {
    // Cleanup temporary files
    try {
      if (filePath) await fs.promises.unlink(filePath);
      if (thumbnailPath) await fs.promises.unlink(thumbnailPath);
      if (outputDir) await deleteFolderRecursive(outputDir);
    } catch (cleanupError) {
      logger.error("Cleanup error:", cleanupError as Error);
    }
  }
});

// Image upload endpoint
router.post("/upload-image", upload.single("image"), async (req, res) => {
  let filePath: string | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided"
      });
    }

    filePath = req.file.path;
    const id = generateFileId();
    const key = `images/${id}/${req.file.originalname}`;

    logger.info(`Processing image upload: ${req.file.originalname}`);

    const result = await uploadFileToR2(filePath, key);
    
    const imageUrl = getSignedUrl(key);

    return res.json({
      success: true,
      data: {
        id,
        imageUrl,
        key,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    logger.error("❌ Error in /upload-image:", err as Error);
    return res.status(500).json({
      success: false,
      error: "Image upload failed"
    });
  } finally {
    // Cleanup temporary file
    try {
      if (filePath) await fs.promises.unlink(filePath);
    } catch (cleanupError) {
      logger.error("Cleanup error:", cleanupError as Error);
    }
  }
});

// Document upload endpoint
router.post("/upload-document", upload.single("document"), async (req, res) => {
  let filePath: string | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No document file provided"
      });
    }

    filePath = req.file.path;
    const id = generateFileId();
    const key = `documents/${id}/${req.file.originalname}`;

    logger.info(`Processing document upload: ${req.file.originalname}`);

    const result = await uploadFileToR2(filePath, key);
    
    const documentUrl = getSignedUrl(key);

    return res.json({
      success: true,
      data: {
        id,
        documentUrl,
        key,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    logger.error("❌ Error in /upload-document:", err as Error);
    return res.status(500).json({
      success: false,
      error: "Document upload failed"
    });
  } finally {
    // Cleanup temporary file
    try {
      if (filePath) await fs.promises.unlink(filePath);
    } catch (cleanupError) {
      logger.error("Cleanup error:", cleanupError as Error);
    }
  }
});

// Multiple file upload endpoint
router.post("/upload-multiple", upload.array("files", 10), async (req, res) => {
  const files = req.files as unknown as Express.Multer.File[];
  const uploadedFiles: any[] = [];
  const errors: any[] = [];

  try {
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files provided"
      });
    }

    logger.info(`Processing multiple file upload: ${files.length} files`);

    for (const file of files) {
      try {
        const id = generateFileId();
        const key = `uploads/${id}/${file.originalname}`;
        
        await uploadFileToR2(file.path, key);
        const fileUrl = getSignedUrl(key);
        
        uploadedFiles.push({
          id,
          fileUrl,
          key,
          originalName: file.originalname,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });

        // Cleanup temp file
        await fs.promises.unlink(file.path);
      } catch (fileError) {
        errors.push({
          originalName: file.originalname,
          error: fileError
        });
        // Cleanup temp file on error
        try {
          await fs.promises.unlink(file.path);
        } catch (cleanupError) {
          logger.error("Cleanup error:", cleanupError as Error);
        }
      }
    }

    return res.json({
      success: true,
      data: {
        uploadedFiles,
        errors,
        totalFiles: files.length,
        successfulUploads: uploadedFiles.length,
        failedUploads: errors.length
      }
    });

  } catch (err) {
    logger.error("❌ Error in /upload-multiple:", err as Error);
    return res.status(500).json({
      success: false,
      error: "Multiple file upload failed"
    });
  }
});

// Delete file endpoint
router.delete("/delete/:key", async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: "File key is required"
      });
    }

    logger.info(`Deleting file: ${key}`);

    // Delete from R2
    await deleteFolderFromR2(key);

    return res.json({
      success: true,
      message: "File deleted successfully"
    });

  } catch (err) {
    logger.error("❌ Error in /delete:", err as Error);
    return res.status(500).json({
      success: false,
      error: "File deletion failed"
    });
  }
});

// Get file info endpoint
router.get("/info/:key", async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: "File key is required"
      });
    }

    const signedUrl = getSignedUrl(key);

    return res.json({
      success: true,
      data: {
        key,
        signedUrl,
        expiresIn: 3600
      }
    });

  } catch (err) {
    logger.error("❌ Error in /info:", err as Error);
    return res.status(500).json({
      success: false,
      error: "Failed to get file info"
    });
  }
});

export default router;
