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

    const payload = {
      ...formData,
      imageUrl: formData.imageUrl || undefined,
    };

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

  if (isLoading) {
    return <Loading text="Loading services..." />;
  }

  return (
    <>
      <Head>
        <title>Services - Overline Admin</title>
      </Head>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-500">Manage your service offerings</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingService ? 'Edit Service' : 'New Service'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Image
                </label>
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
                <Input
                  label="Service Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Haircut, Facial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={2}
                  placeholder="Brief description of the service..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Duration (minutes)"
                  type="number"
                  min="5"
                  step="5"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })
                  }
                  required
                />
                <Input
                  label="Price (₹)"
                  type="number"
                  min="0"
                  step="10"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" isLoading={createService.isPending || updateService.isPending}>
                  {editingService ? 'Update Service' : 'Add Service'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Services List */}
        {services?.length === 0 ? (
          <Card className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No services yet. Add your first service to get started.</p>
            <Button onClick={() => setShowForm(true)}>Add Your First Service</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services?.map((service) => (
              <Card key={service.id} className="overflow-hidden">
                {/* Service Image */}
                {service.imageUrl ? (
                  <div className="w-full h-40 -mt-4 -mx-4 mb-3" style={{ width: 'calc(100% + 2rem)' }}>
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 -mt-4 -mx-4 mb-3 bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center" style={{ width: 'calc(100% + 2rem)' }}>
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {service.category && (
                      <Badge variant="default" className="mt-1">
                        {service.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(service)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {service.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{service.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatPrice(service.price)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
