import React, { useEffect, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  label?: string;
  hint?: string;
  className?: string;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap: Record<NonNullable<ImageUploadProps['size']>, string> = {
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
}) => {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, or GIF images are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const uploadedUrl = await onUpload(file);
      setPreview(uploadedUrl);
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Upload failed');
      setPreview(currentUrl || null);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      URL.revokeObjectURL(localUrl);
    }
  };

  return (
    <div className={cn('flex items-start gap-4', className)}>
      <div
        className={cn(
          'relative overflow-hidden border-2 border-dashed border-gray-300 bg-gray-100 flex items-center justify-center',
          sizeMap[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          isUploading && 'opacity-60',
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <Upload className="h-8 w-8 text-gray-400" />
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : label}
        </button>
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  );
};
