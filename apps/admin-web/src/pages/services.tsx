import React, { useRef } from 'react';
import Head from 'next/head';
import { Plus, Trash2, ImageIcon, Image as ImageIconLib, Check, X } from 'lucide-react';
import { Loading, useToast } from '@/components/ui';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks';
import api from '@/lib/api';

export default function ServicesPage() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = React.useState<string | null>(null);
  
  // Track new unpersisted rows
  const [newRows, setNewRows] = React.useState<any[]>([]);

  const handleUploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'services');
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor) return;
    try {
      const url = await handleUploadImage(file);
      if (uploadingFor.startsWith('new-')) {
        setNewRows(rows => rows.map(r => r.id === uploadingFor ? { ...r, imageUrl: url } : r));
      } else {
        await updateService.mutateAsync({ id: uploadingFor, imageUrl: url });
      }
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, type: 'error' });
      console.error('Upload failed', err);
    } finally {
      setUploadingFor(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = (id: string) => {
    setUploadingFor(id);
    fileInputRef.current?.click();
  };

  const handleAddRow = () => {
    const newId = `new-${Date.now()}`;
    setNewRows([...newRows, { 
      id: newId, 
      name: '', 
      durationMinutes: 30, 
      price: 0, 
      category: '', 
      isActive: true,
      imageUrl: ''
    }]);
  };

  const handleRemoveNewRow = (id: string) => {
    setNewRows(rows => rows.filter(r => r.id !== id));
  };

  const handleSaveNewRow = async (row: any) => {
    if (!row.name) {
      toast({ title: 'Missing Name', description: 'Please enter a name for the service.', type: 'error' });
      return;
    }
    const price = parseInt(row.price);
    const duration = parseInt(row.durationMinutes);
    if (isNaN(price) || price < 0) {
      toast({ title: 'Invalid Price', description: 'Please enter a valid price.', type: 'error' });
      return;
    }
    if (isNaN(duration) || duration < 1) {
      toast({ title: 'Invalid Duration', description: 'Duration must be at least 1 minute.', type: 'error' });
      return;
    }

    try {
      await createService.mutateAsync({
        name: row.name,
        category: row.category,
        price,
        durationMinutes: duration,
        imageUrl: row.imageUrl || undefined,
      });
      toast({ title: 'Service created', type: 'success' });
      handleRemoveNewRow(row.id);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      toast({ title: 'Failed to create', description: Array.isArray(msg) ? msg[0] : msg, type: 'error' });
    }
  };

  const handleBlurUpdate = async (id: string, field: string, value: any, originalValue: any) => {
    if (value === originalValue) return;
    try {
      await updateService.mutateAsync({ 
        id, 
        [field]: field === 'price' || field === 'durationMinutes' ? parseInt(value) : value 
      });
      toast({ title: 'Updated', type: 'success' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, type: 'error' });
    }
  };

  const handleToggleActive = (service: any) => {
    updateService.mutateAsync({ id: service.id, isActive: !service.isActive });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await deleteService.mutateAsync(id);
    }
  };

  if (isLoading) return <Loading text="Loading services..." />;

  const allRows = [...(services || [])];

  return (
    <>
      <Head>
        <title>Services — Overline Admin</title>
      </Head>

      <input 
        type="file" 
        accept="image/*" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="max-w-[1200px]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="label-m3 mb-2 block text-primary font-bold tracking-wider">CATALOG MANAGER</span>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Service Menu</h1>
            <p className="text-on-surface-variant text-sm mt-1">Manage your services like a spreadsheet. Changes save automatically.</p>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/20 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container uppercase text-xs tracking-wider text-on-surface-variant font-bold border-b border-outline-variant/20">
                  <th className="p-4 w-16 text-center">Photo</th>
                  <th className="p-4 min-w-[200px]">Service Name</th>
                  <th className="p-4 w-32">Duration</th>
                  <th className="p-4 w-32">Price (₹)</th>
                  <th className="p-4 min-w-[150px]">Category</th>
                  <th className="p-4 w-28 text-center">Active</th>
                  <th className="p-4 w-16 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {allRows.map((service) => (
                  <tr key={service.id} className="hover:bg-surface-container-highest/20 transition-colors group">
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => triggerUpload(service.id)}
                        className="w-10 h-10 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/20 flex items-center justify-center hover:opacity-80 transition-opacity relative group/img mx-auto"
                      >
                        {service.imageUrl ? (
                          <>
                            <img src={service.imageUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                              <ImageIconLib className="w-4 h-4 text-white" />
                            </div>
                          </>
                        ) : (
                          <Plus className="w-4 h-4 text-outline" />
                        )}
                      </button>
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        defaultValue={service.name} 
                        onBlur={(e) => handleBlurUpdate(service.id, 'name', e.target.value, service.name)}
                        className="w-full bg-transparent border border-transparent hover:border-outline-variant/30 focus:border-primary focus:bg-surface p-2 rounded-lg outline-none transition-all font-bold text-on-surface placeholder:text-outline"
                        placeholder="Service name..."
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <input 
                          type="number" 
                          defaultValue={service.durationMinutes} 
                          onBlur={(e) => handleBlurUpdate(service.id, 'durationMinutes', e.target.value, service.durationMinutes)}
                          className="w-16 bg-transparent border border-transparent hover:border-outline-variant/30 focus:border-primary focus:bg-surface p-2 rounded-lg outline-none transition-all text-on-surface"
                        />
                        <span className="text-on-surface-variant text-sm ml-1">min</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <span className="text-on-surface-variant text-sm mr-1">₹</span>
                        <input 
                          type="number" 
                          defaultValue={service.price} 
                          onBlur={(e) => handleBlurUpdate(service.id, 'price', e.target.value, service.price)}
                          className="w-20 bg-transparent border border-transparent hover:border-outline-variant/30 focus:border-primary focus:bg-surface p-2 rounded-lg outline-none transition-all font-bold"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        defaultValue={service.category || ''} 
                        onBlur={(e) => handleBlurUpdate(service.id, 'category', e.target.value, service.category)}
                        className="w-full bg-transparent border border-transparent hover:border-outline-variant/30 focus:border-primary focus:bg-surface p-2 rounded-lg outline-none transition-all text-on-surface"
                        placeholder="e.g. Haircut"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleToggleActive(service)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${service.isActive ? 'bg-primary' : 'bg-surface-container-high'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${service.isActive ? 'left-7' : 'left-1'}`} />
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDelete(service.id)} className="p-2 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-error-container/30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Form for new pending rows */}
                {newRows.map((row) => (
                  <tr key={row.id} className="bg-primary/5">
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => triggerUpload(row.id)}
                        className="w-10 h-10 rounded-xl overflow-hidden border-2 border-dashed border-primary/40 flex items-center justify-center hover:bg-primary/10 transition-colors mx-auto"
                      >
                        {row.imageUrl ? (
                           <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Plus className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={row.name} 
                        autoFocus
                        onChange={(e) => setNewRows(rows => rows.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                        className="w-full bg-white border border-primary/30 focus:border-primary p-2 rounded-lg outline-none transition-all font-bold"
                        placeholder="New service..."
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center bg-white border border-primary/30 focus-within:border-primary p-1 rounded-lg">
                        <input 
                          type="number" 
                          value={row.durationMinutes} 
                          onChange={(e) => setNewRows(rows => rows.map(r => r.id === row.id ? { ...r, durationMinutes: e.target.value } : r))}
                          className="w-12 bg-transparent p-1 outline-none text-center"
                        />
                        <span className="text-on-surface-variant text-xs pr-2">min</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center bg-white border border-primary/30 focus-within:border-primary p-1 rounded-lg">
                        <span className="text-on-surface-variant pl-2">₹</span>
                        <input 
                          type="number" 
                          value={row.price} 
                          onChange={(e) => setNewRows(rows => rows.map(r => r.id === row.id ? { ...r, price: e.target.value } : r))}
                          className="w-16 bg-transparent p-1 outline-none font-bold"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={row.category} 
                        onChange={(e) => setNewRows(rows => rows.map(r => r.id === row.id ? { ...r, category: e.target.value } : r))}
                        className="w-full bg-white border border-primary/30 focus:border-primary p-2 rounded-lg outline-none transition-all"
                        placeholder="Category"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <div className={`w-12 h-6 rounded-full relative bg-primary mx-auto opacity-50`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 left-7`} />
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleSaveNewRow(row)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Check className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleRemoveNewRow(row.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-4 border-t border-outline-variant/10 bg-surface">
              <button 
                onClick={handleAddRow}
                className="flex items-center gap-2 text-primary font-bold hover:text-primary/80 transition-colors px-4 py-2 hover:bg-primary/5 rounded-xl"
              >
                <Plus className="w-5 h-5" />
                Add Row
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
