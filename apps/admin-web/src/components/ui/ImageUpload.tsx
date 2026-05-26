import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  label?: string;
  hint?: string;
  className?: string;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
  accept?: string;
  maxSizeMB?: number;
  isVideo?: boolean;
}

const sizeMap = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentUrl,
  onUpload,
  label = 'Upload Image',
  hint = 'PNG, JPG up to 5MB',
  className,
  shape = 'square',
  size = 'md',
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  maxSizeMB = 5,
  isVideo = false,
}) => {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync preview with currentUrl prop when it changes
  useEffect(() => {
    if (currentUrl !== undefined) {
      setPreview(currentUrl);
    }
  }, [currentUrl]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate
      const allowedTypes = accept.split(',').map((t) => t.trim());
      if (accept !== 'video/*' && !allowedTypes.includes(file.type) && !file.type.startsWith(accept.replace('/*', ''))) {
        if (!isVideo) {
          if (!allowedTypes.includes(file.type)) {
            setError(`Only ${allowedTypes.join(', ')} are allowed`);
            return;
          }
        } else {
          if (!file.type.startsWith('video/')) {
            setError('Only video files are allowed');
            return;
          }
        }
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File must be under ${maxSizeMB} MB`);
        return;
      }

      setError(null);
      setIsUploading(true);

      // Show local preview immediately
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      try {
        const url = await onUpload(file);
        setPreview(url);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Upload failed');
        setPreview(currentUrl || null);
      } finally {
        setIsUploading(false);
        // Reset input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [currentUrl, onUpload, accept, maxSizeMB, isVideo],
  );

  return (
    <div className={cn('flex items-start gap-4', className)}>
      <div
        className={cn(
          sizeMap[size],
          'relative overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 border-2 border-dashed border-gray-300',
          shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          isUploading && 'opacity-60',
        )}
      >
        {preview ? (
          isVideo ? (
             <video src={preview} className="w-full h-full object-cover" />
          ) : (
             <img src={preview} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <Upload className="w-8 h-8 text-gray-400" />
        )}

        {preview && !isUploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
            title="Change media"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      <div>
        {!preview && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : label}
          </button>
        )}
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
