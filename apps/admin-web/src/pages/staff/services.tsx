import { useMemo, useState } from 'react';
import Head from 'next/head';
import { Edit2, ImageIcon, Plus, Trash2, Video } from 'lucide-react';
import { Badge, Button, Card, Input, Loading, useToast } from '@/components/ui';
import { useCreateService, useDeleteService, useStaffAssignedServices, useUpdateService } from '@/hooks';
import { formatDuration, formatPrice } from '@/lib/utils';

type ServiceFormState = {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  maxClientsPerHour: number;
  coverPhoto: string;
  isActive: boolean;
  rating: number;
  photoUrls: string[];
  videoUrls: string[];
};

const EMPTY_FORM: ServiceFormState = {
  name: '',
  description: '',
  category: '',
  price: 0,
  durationMinutes: 30,
  maxClientsPerHour: 1,
  coverPhoto: '',
  isActive: true,
  rating: 4.8,
  photoUrls: [],
  videoUrls: [],
};

export default function StaffServicesPage() {
  const { addToast } = useToast();
  const { data: assignedData, isLoading } = useStaffAssignedServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [showFormModal, setShowFormModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(EMPTY_FORM);

  const services = useMemo(() => {
    const legacy = Array.isArray(assignedData?.legacyServices) ? assignedData.legacyServices : [];
    const profile = Array.isArray(assignedData?.profileServices) ? assignedData.profileServices : [];
    const merged = [...legacy, ...profile];
    const unique = new Map<string, any>();
    for (const item of merged) {
      if (!item?.id) continue;
      if (!unique.has(item.id)) unique.set(item.id, item);
    }
    return Array.from(unique.values());
  }, [assignedData?.legacyServices, assignedData?.profileServices]);

  const resetForm = () => {
    setServiceForm(EMPTY_FORM);
    setShowFormModal(false);
    setShowMediaModal(false);
  };

  const openCreate = () => {
    setServiceForm(EMPTY_FORM);
    setShowFormModal(true);
  };

  const openEdit = (service: any) => {
    setServiceForm({
      id: service.id,
      name: service.name || '',
      description: service.description || '',
      category: service.category || '',
      price: Number(service.price || 0),
      durationMinutes: Number(service.durationMinutes || 30),
      maxClientsPerHour: Number(service.maxClientsPerHour || 1),
      coverPhoto: service.imageUrl || '',
      isActive: service.isActive !== false,
      rating: Number(service.rating || 4.8),
      photoUrls: Array.isArray(service.photos) ? service.photos : service.imageUrl ? [service.imageUrl] : [],
      videoUrls: Array.isArray(service.videos) ? service.videos : [],
    });
    setShowFormModal(true);
  };

  const openMediaManager = (service: any) => {
    openEdit(service);
    setShowMediaModal(true);
  };

  const submitService = async () => {
    try {
      const payload = {
        name: serviceForm.name,
        description: serviceForm.description || undefined,
        category: serviceForm.category || undefined,
        price: Number(serviceForm.price || 0),
        durationMinutes: Number(serviceForm.durationMinutes || 30),
        imageUrl: serviceForm.coverPhoto || undefined,
        isActive: serviceForm.isActive,
      };

      if (serviceForm.id) {
        await updateService.mutateAsync({ id: serviceForm.id, ...payload });
        addToast({ type: 'success', title: 'Service updated' });
      } else {
        await createService.mutateAsync(payload);
        addToast({ type: 'success', title: 'Service created' });
      }
      resetForm();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 403) {
        addToast({
          type: 'warning',
          title: 'Permission required',
          message: 'Current backend permissions may restrict staff create/edit/delete. UI is ready for enabled access.',
        });
      } else {
        addToast({ type: 'error', title: 'Save failed', message: error?.response?.data?.message || 'Try again.' });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await deleteService.mutateAsync(id);
      addToast({ type: 'success', title: 'Service deleted' });
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 403) {
        addToast({
          type: 'warning',
          title: 'Permission required',
          message: 'Current backend permissions may restrict staff create/edit/delete. UI is ready for enabled access.',
        });
      } else {
        addToast({ type: 'error', title: 'Delete failed', message: error?.response?.data?.message || 'Try again.' });
      }
    }
  };

  const addMediaPlaceholder = (type: 'photo' | 'video') => {
    if (type === 'photo') {
      if (serviceForm.photoUrls.length >= 10) return;
      setServiceForm((prev) => ({
        ...prev,
        photoUrls: [...prev.photoUrls, `placeholder-photo-${prev.photoUrls.length + 1}`],
      }));
      return;
    }

    if (serviceForm.videoUrls.length >= 2) return;
    setServiceForm((prev) => ({
      ...prev,
      videoUrls: [...prev.videoUrls, `placeholder-video-${prev.videoUrls.length + 1}`],
    }));
  };

  const removeMediaPlaceholder = (type: 'photo' | 'video', index: number) => {
    if (type === 'photo') {
      setServiceForm((prev) => ({ ...prev, photoUrls: prev.photoUrls.filter((_, i) => i !== index) }));
      return;
    }
    setServiceForm((prev) => ({ ...prev, videoUrls: prev.videoUrls.filter((_, i) => i !== index) }));
  };

  const movePhoto = (from: number, to: number) => {
    if (to < 0 || to >= serviceForm.photoUrls.length) return;
    setServiceForm((prev) => {
      const photos = [...prev.photoUrls];
      const [item] = photos.splice(from, 1);
      photos.splice(to, 0, item);
      return { ...prev, photoUrls: photos };
    });
  };

  if (isLoading) {
    return <Loading text="Loading your services..." />;
  }

  return (
    <>
      <Head>
        <title>My Services - Staff</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
            <p className="text-gray-500">Manage your service cards, capacity and media placeholders.</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>

        {services.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-gray-500">No assigned services found.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {services.map((service: any) => (
              <Card key={service.id}>
                <div className="flex gap-4">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {service.imageUrl ? (
                      <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-gray-900">{service.name}</h2>
                        <p className="mt-1 text-sm text-gray-600">
                          {formatPrice(Number(service.price || 0))} · {formatDuration(Number(service.durationMinutes || 0))}
                        </p>
                        <p className="text-sm text-gray-500">
                          Max clients/hour: {Number(service.maxClientsPerHour || 1)}
                        </p>
                      </div>
                      <Badge variant={service.isActive === false ? 'warning' : 'success'}>
                        {service.isActive === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(service)}>
                        <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openMediaManager(service)}>
                        <ImageIcon className="mr-1 h-3.5 w-3.5" /> Photos/Videos
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {(showFormModal || showMediaModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {showMediaModal ? 'Manage Photos/Videos' : serviceForm.id ? 'Edit Service' : 'Add Service'}
                </h2>
                <Button variant="ghost" onClick={resetForm}>Close</Button>
              </div>

              {!showMediaModal ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Name"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <Input
                    label="Category"
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, category: e.target.value }))}
                  />
                  <Input
                    label="Price (INR)"
                    type="number"
                    min={0}
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  />
                  <Input
                    label="Duration (minutes)"
                    type="number"
                    min={5}
                    value={serviceForm.durationMinutes}
                    onChange={(e) =>
                      setServiceForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) || 30 }))
                    }
                  />
                  <Input
                    label="Max clients / hour"
                    type="number"
                    min={1}
                    value={serviceForm.maxClientsPerHour}
                    onChange={(e) =>
                      setServiceForm((prev) => ({ ...prev, maxClientsPerHour: Number(e.target.value) || 1 }))
                    }
                  />
                  <Input
                    label="Cover photo URL"
                    value={serviceForm.coverPhoto}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, coverPhoto: e.target.value }))}
                    placeholder="https://..."
                  />

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={3}
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    <input
                      id="staff-service-active"
                      type="checkbox"
                      checked={serviceForm.isActive}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <label htmlFor="staff-service-active" className="text-sm text-gray-700">
                      Active service
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Photos ({serviceForm.photoUrls.length}/10)</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addMediaPlaceholder('photo')}
                        disabled={serviceForm.photoUrls.length >= 10}
                      >
                        Add Photo Placeholder
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {serviceForm.photoUrls.map((url, index) => (
                        <div key={url + index} className="rounded-lg border border-gray-200 p-2">
                          <div className="flex h-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">
                            Photo {index + 1}
                          </div>
                          <div className="mt-2 flex justify-between text-xs">
                            <button type="button" onClick={() => movePhoto(index, index - 1)}>
                              ↑
                            </button>
                            <button type="button" onClick={() => movePhoto(index, index + 1)}>
                              ↓
                            </button>
                            <button type="button" onClick={() => removeMediaPlaceholder('photo', index)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Videos ({serviceForm.videoUrls.length}/2)</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addMediaPlaceholder('video')}
                        disabled={serviceForm.videoUrls.length >= 2}
                      >
                        <Video className="mr-1 h-3.5 w-3.5" /> Add Video Placeholder
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {serviceForm.videoUrls.map((url, index) => (
                        <div key={url + index} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 text-sm">
                          <span>Video {index + 1} (max 60s)</span>
                          <button type="button" onClick={() => removeMediaPlaceholder('video', index)} className="text-red-600">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Placeholder mode active. Cloudinary upload integration is deferred in this phase.
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                {!showMediaModal && (
                  <Button onClick={submitService} isLoading={createService.isPending || updateService.isPending}>
                    {serviceForm.id ? 'Update Service' : 'Create Service'}
                  </Button>
                )}
                <Button variant="outline" onClick={resetForm}>Done</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
