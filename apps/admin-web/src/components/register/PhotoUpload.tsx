import React from 'react';
import { Camera, X, Image as ImageIcon, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface PhotoUploadProps {
  mainPhoto: string;
  coverPhoto: string;
  gallery: string[];
  onMainPhotoChange: (url: string) => void;
  onCoverPhotoChange: (url: string) => void;
  onGalleryChange: (urls: string[]) => void;
}

export default function PhotoUpload({
  mainPhoto,
  coverPhoto,
  gallery,
  onMainPhotoChange,
  onCoverPhotoChange,
  onGalleryChange,
}: PhotoUploadProps) {
  const [uploading, setUploading] = React.useState<string | null>(null);

  const handleUpload = async (file: File, type: 'main' | 'cover' | 'gallery') => {
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const { data } = await api.post('/upload/register-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = data.url || data.secure_url || data.imageUrl;
      
      if (type === 'main') onMainPhotoChange(url);
      else if (type === 'cover') onCoverPhotoChange(url);
      else onGalleryChange([...gallery, url]);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Image upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (type: 'main' | 'cover' | 'gallery') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, type);
  };

  const removeGalleryImage = (index: number) => {
    onGalleryChange(gallery.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      {/* Guidelines Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200/50 rounded-2xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-bold">Photo Guidelines</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              <li>Upload bright, real, and recent images only</li>
              <li>No posters, collages, WhatsApp screenshots, or heavy text overlays</li>
              <li>Main photo should be readable even when cropped to a small square</li>
              <li>Cover photo should be landscape (wider than tall)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Photo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Main Shop Photo <span className="text-error">*</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Square/portrait image shown in search results and shop cards. Show your storefront, interior, or best service.
            </p>
          </div>
          {mainPhoto && <CheckCircle2 className="w-5 h-5 text-tertiary" />}
        </div>
        
        <div className="relative">
          {mainPhoto ? (
            <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-sm group">
              <img src={mainPhoto} alt="Main" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onMainPhotoChange('')}
                className="absolute top-2 right-2 w-7 h-7 bg-error/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-40 h-40 rounded-2xl border-2 border-dashed border-primary/30 bg-primary-fixed/10 cursor-pointer hover:bg-primary-fixed/20 transition-colors">
              {uploading === 'main' ? (
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-primary mb-2" />
                  <span className="text-xs font-bold text-primary">Upload Photo</span>
                  <span className="text-[10px] text-on-surface-variant mt-1">Square recommended</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect('main')} />
            </label>
          )}
        </div>
      </div>

      {/* Cover Photo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-secondary" />
              Cover Photo
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Wide landscape banner displayed on your shop detail page. Should represent the full vibe of your shop.
            </p>
          </div>
          {coverPhoto && <CheckCircle2 className="w-5 h-5 text-tertiary" />}
        </div>

        <div className="relative">
          {coverPhoto ? (
            <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-secondary/20 shadow-sm group">
              <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onCoverPhotoChange('')}
                className="absolute top-3 right-3 w-8 h-8 bg-error/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed border-secondary/30 bg-secondary-fixed/10 cursor-pointer hover:bg-secondary-fixed/20 transition-colors">
              {uploading === 'cover' ? (
                <div className="animate-spin w-6 h-6 border-2 border-secondary border-t-transparent rounded-full" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-secondary mb-2" />
                  <span className="text-xs font-bold text-secondary">Upload Cover Photo</span>
                  <span className="text-[10px] text-on-surface-variant mt-1">Landscape (1200×400 recommended)</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect('cover')} />
            </label>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Camera className="w-4 h-4 text-tertiary" />
            Gallery Photos <span className="text-[10px] font-normal text-outline">(optional, up to 10)</span>
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Interior shots, products, staff at work, waiting area, service setup — anything that helps customers trust you.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {gallery.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-outline-variant/20 group">
              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-error/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {gallery.length < 10 && (
            <label className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/30 bg-surface-container-low cursor-pointer hover:bg-surface-container-high transition-colors">
              {uploading === 'gallery' ? (
                <div className="animate-spin w-5 h-5 border-2 border-tertiary border-t-transparent rounded-full" />
              ) : (
                <>
                  <Upload className="w-5 h-5 text-outline mb-1" />
                  <span className="text-[10px] font-bold text-outline">Add</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect('gallery')} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
