import React from 'react';
import Head from 'next/head';
import { Plus, Edit2, Trash2, ImageIcon, Clock, IndianRupee } from 'lucide-react';
import { Card, Button, Input, Badge, Loading, ImageUpload } from '@/components/ui';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks';
import { formatPrice, formatDuration } from '@/lib/utils';
import api from '@/lib/api';

interface ServiceFormData {
  name: string;
  description: string;
  imageUrl: string;
  durationMinutes: number;
  price: number;
  category: string;
}

const emptyForm: ServiceFormData = {
  name: '',
  description: '',
  imageUrl: '',
  durationMinutes: 30,
  price: 0,
  category: '',
};

export default function ServicesPage() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [showForm, setShowForm] = React.useState(false);
  const [editingService, setEditingService] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<ServiceFormData>({ ...emptyForm });

  const handleUploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'services');
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, imageUrl: formData.imageUrl || undefined };
    if (editingService) {
      await updateService.mutateAsync({ id: editingService, ...payload });
    } else {
      await createService.mutateAsync(payload);
    }
    setShowForm(false);
    setEditingService(null);
    setFormData({ ...emptyForm });
  };

  const handleEdit = (service: any) => {
    setEditingService(service.id);
    setFormData({
      name: service.name,
      description: service.description || '',
      imageUrl: service.imageUrl || '',
      durationMinutes: service.durationMinutes,
      price: service.price,
      category: service.category || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await deleteService.mutateAsync(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingService(null);
    setFormData({ ...emptyForm });
  };

  if (isLoading) return <Loading text="Loading services..." />;

  return (
    <>
      <Head>
        <title>Services — Overline Admin</title>
        <meta name="description" content="Manage your service offerings on Overline." />
      </Head>

      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="label-m3 mb-2 block">Catalog</span>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Services</h1>
            <p className="text-on-surface-variant text-sm mt-1">Manage your service offerings</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary px-6 py-2.5">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card-m3 p-8 mb-8 animate-fade-in">
            <h2 className="text-lg font-bold text-on-surface mb-6">
              {editingService ? 'Edit Service' : 'New Service'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label-m3 mb-2 block">Service Image</label>
                <ImageUpload
                  currentUrl={formData.imageUrl || null}
                  onUpload={async (file) => {
                    const url = await handleUploadImage(file);
                    setFormData({ ...formData, imageUrl: url });
                    return url;
                  }}
                  label="Upload Image"
                  hint="Add a photo of this service (optional)"
                  size="lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-m3">Service Name</label>
                  <input
                    type="text"
                    className="input-m3"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-m3">Category</label>
                  <input
                    type="text"
                    className="input-m3"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Haircut, Facial"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-m3">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-m3 min-h-[80px] resize-none"
                  rows={2}
                  placeholder="Brief description of the service..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-m3">Duration (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    className="input-m3"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-m3">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className="input-m3"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={createService.isPending || updateService.isPending} className="btn-primary px-8 py-3 disabled:opacity-50">
                  {createService.isPending || updateService.isPending ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
                </button>
                <button type="button" className="btn-tonal px-6 py-3" onClick={handleCancel}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Services Grid */}
        {services?.length === 0 ? (
          <div className="card-m3 text-center py-16 px-8">
            <ImageIcon className="w-14 h-14 text-outline-variant mx-auto mb-5" />
            <h3 className="text-xl font-bold text-on-surface mb-2">No services yet</h3>
            <p className="text-on-surface-variant mb-6">Add your first service to get started.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary px-8 py-3">Add Your First Service</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services?.map((service) => (
              <div key={service.id} className="card-m3 overflow-hidden hover:shadow-card-hover transition-shadow">
                {/* Service Image */}
                {service.imageUrl ? (
                  <div className="w-full h-40">
                    <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-24 bg-gradient-to-br from-primary-fixed to-secondary-fixed flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-outline-variant" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-on-surface">{service.name}</h3>
                      {service.category && (
                        <span className="badge-m3 bg-surface-container-high text-outline mt-1 inline-block">{service.category}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(service)} className="p-2 text-outline hover:text-primary hover:bg-surface-container-low rounded-xl transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(service.id)} className="p-2 text-outline hover:text-error hover:bg-error-container/30 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-xs text-on-surface-variant mb-3 line-clamp-2">{service.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                    <span className="text-xs text-on-surface-variant flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-outline" />
                      {formatDuration(service.durationMinutes)}
                    </span>
                    <span className="text-lg font-black text-on-surface">{formatPrice(service.price)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
