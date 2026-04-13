import React from 'react';
import Head from 'next/head';
import { Plus, Edit2, Mail, Phone, Users, Check, Trash2 } from 'lucide-react';
import { Card, Button, Input, Badge, Loading, ImageUpload, useToast } from '@/components/ui';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useServices,
  useAssignServiceToStaff,
  useUnassignServiceFromStaff,
} from '@/hooks';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  age: string;
  password: string;
  role: string;
  avatarUrl: string;
}

const emptyForm: StaffFormData = {
  name: '',
  email: '',
  phone: '',
  age: '',
  password: '',
  role: 'STAFF',
  avatarUrl: '',
};

export default function StaffPage() {
  const { data: staff, isLoading } = useStaff();
  const { toast } = useToast();
  const { data: services } = useServices();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const assignServiceToStaff = useAssignServiceToStaff();
  const unassignServiceFromStaff = useUnassignServiceFromStaff();
  const [showForm, setShowForm] = React.useState(false);
  const [editingStaffId, setEditingStaffId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<StaffFormData>({ ...emptyForm });
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);
  const [initialServiceIds, setInitialServiceIds] = React.useState<string[]>([]);
  const [formError, setFormError] = React.useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const normalizedPhone = formData.phone.replace(/\D/g, '');
    if (!editingStaffId && normalizedPhone.length < 10) {
      setFormError('Staff mobile number is required for login.');
      return;
    }

    if (!editingStaffId && !/^\d{6}$/.test(formData.password)) {
      setFormError('Staff PIN must be exactly 6 digits.');
      return;
    }

    try {
      let savedStaffId = editingStaffId;
      if (editingStaffId) {
        await updateStaff.mutateAsync({
          staffId: editingStaffId,
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          age: formData.age ? Number(formData.age) : undefined,
          role: formData.role,
          avatarUrl: formData.avatarUrl || undefined,
        });
      } else {
        const created = await createStaff.mutateAsync({
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          age: formData.age ? Number(formData.age) : undefined,
          password: formData.password || undefined,
          role: formData.role,
          avatarUrl: formData.avatarUrl || undefined,
        });
        savedStaffId = created?.id;
      if (savedStaffId) {
        const toAssign = selectedServiceIds.filter((id) => !initialServiceIds.includes(id));
        const toUnassign = initialServiceIds.filter((id) => !selectedServiceIds.includes(id));
        if (toAssign.length > 0) {
          await Promise.all(toAssign.map((serviceId) => assignServiceToStaff.mutateAsync({ staffId: savedStaffId as string, serviceId })));
        }
        if (toUnassign.length > 0) {
          await Promise.all(toUnassign.map((serviceId) => unassignServiceFromStaff.mutateAsync({ staffId: savedStaffId as string, serviceId })));
        }
      }
      toast({ title: editingStaffId ? 'Staff updated' : 'Staff created', type: 'success' });
      setShowForm(false);
      setEditingStaffId(null);
      setFormData({ ...emptyForm });
      setSelectedServiceIds([]);
      setInitialServiceIds([]);
    } catch (err: any) {
      console.error('Failed to save staff:', err);
      const message = err.response?.data?.message;
      const errorMsg = Array.isArray(message) ? message.join(', ') : message || 'Failed to save staff';
      setFormError(errorMsg);
      toast({ title: 'Error saving staff', description: errorMsg, type: 'error' });
    }
  };

  const handleUploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'staff');
    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  };

  const handleEdit = (member: any) => {
    setEditingStaffId(member.id);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      age: member.age ? String(member.age) : '',
      password: '',
      role: member.role || 'STAFF',
      avatarUrl: member.avatarUrl || '',
    });
    const assignedServiceIds = (member.staffServices || []).map((item: any) => item.serviceId);
    setSelectedServiceIds(assignedServiceIds);
    setInitialServiceIds(assignedServiceIds);
    setFormError('');
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStaffId(null);
    setFormData({ ...emptyForm });
    setSelectedServiceIds([]);
    setInitialServiceIds([]);
    setFormError('');
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  const handleRemove = async (staffId: string) => {
    if (!window.confirm('Remove this staff member? This action can be undone by re-onboarding.')) {
      return;
    }
    try {
      await deleteStaff.mutateAsync(staffId);
    } catch (err) {
      console.error('Failed to remove staff:', err);
    }
  };

  if (isLoading) return <Loading text="Loading staff..." />;

  return (
    <>
      <Head>
        <title>Staff — Overline Admin</title>
        <meta name="description" content="Manage your staff team on Overline." />
      </Head>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="label-m3 mb-2 block">Team</span>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Staff</h1>
            <p className="text-on-surface-variant text-sm mt-1">Manage your team members</p>
          </div>
          <button
            onClick={() => {
              setEditingStaffId(null);
              setFormData({ ...emptyForm });
              setSelectedServiceIds([]);
              setInitialServiceIds([]);
              setShowForm(true);
            }}
            className="btn-primary px-6 py-2.5"
          >
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card-m3 p-8 mb-8 animate-fade-in">
            <h2 className="text-lg font-bold text-on-surface mb-6">
              {editingStaffId ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <ImageUpload
                currentUrl={formData.avatarUrl || null}
                onUpload={async (file) => {
                  const url = await handleUploadImage(file);
                  setFormData({ ...formData, avatarUrl: url });
                  return url;
                }}
                label="Upload Staff Photo"
                hint="JPG, PNG or WebP up to 5MB"
                shape="circle"
                size="md"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-m3">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    className="input-m3"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-m3">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    className="input-m3"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-m3">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    className="input-m3"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^\d+\s-]/g, '') })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-m3">Age</label>
                  <input
                    type="number"
                    min={16}
                    max={80}
                    placeholder="Age"
                    className="input-m3"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-m3">Role</label>
                  <select
                    className="input-m3"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="STAFF">Staff</option>
                    <option value="OWNER">Owner/Manager</option>
                  </select>
                </div>
                {!editingStaffId && (
                  <div className="space-y-2">
                    <label className="label-m3">6-digit Onboarding PIN</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Unique 6-digit PIN"
                      className="input-m3"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    />
                  </div>
                )}
              </div>

              {!!formError && (
                <p className="text-sm font-medium text-error">{formError}</p>
              )}

              <div>
                <label className="label-m3 mb-3 block">Assigned Services</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-2xl bg-surface-container-low p-4 border border-outline-variant/10">
                  {(services || []).map((service: any) => (
                    <label
                      key={service.id}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all',
                        selectedServiceIds.includes(service.id)
                          ? 'bg-primary-fixed border border-primary/15'
                          : 'hover:bg-surface-container border border-transparent'
                      )}
                    >
                      <span className="text-sm text-on-surface font-medium">
                        {service.name}
                        <span className="ml-2 text-[10px] text-outline font-bold">{service.durationMinutes}m</span>
                      </span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={selectedServiceIds.includes(service.id)}
                          onChange={() => toggleServiceSelection(service.id)}
                        />
                        <div className="w-5 h-5 border-2 border-outline-variant rounded-md peer-checked:bg-primary peer-checked:border-primary transition-colors" />
                        <Check className="w-3 h-3 text-white absolute top-1 left-1 opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </label>
                  ))}
                  {(services || []).length === 0 && (
                    <p className="text-sm text-on-surface-variant col-span-2 text-center py-4">No services found. Add services first.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createStaff.isPending || updateStaff.isPending || assignServiceToStaff.isPending || unassignServiceFromStaff.isPending}
                  className="btn-primary px-8 py-3 disabled:opacity-50"
                >
                  {createStaff.isPending || updateStaff.isPending || assignServiceToStaff.isPending || unassignServiceFromStaff.isPending
                    ? 'Saving...'
                    : editingStaffId
                      ? 'Update Staff'
                      : 'Add Staff'}
                </button>
                <button type="button" className="btn-tonal px-6 py-3" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff Grid */}
        {!staff || staff.length === 0 ? (
          <div className="card-m3 text-center py-16 px-8">
            <Users className="w-14 h-14 text-outline-variant mx-auto mb-5" />
            <h3 className="text-xl font-bold text-on-surface mb-2">No staff members yet</h3>
            <p className="text-on-surface-variant mb-6">Add your first team member to get started.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary px-8 py-3">
              <Plus className="w-4 h-4" /> Add Staff
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((member: any) => (
              <div key={member.id} className="card-m3 p-6 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.name?.charAt(0) || 'S'
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface">{member.name}</h3>
                      <span className={`badge-m3 ${member.role === 'OWNER' ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high text-outline'}`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleEdit(member)} className="p-2 text-outline hover:text-primary hover:bg-surface-container-low rounded-xl transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {member.email && (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Mail className="w-3.5 h-3.5 text-outline" />
                      {member.email}
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Phone className="w-3.5 h-3.5 text-outline" />
                      {member.phone}
                    </div>
                  )}
                </div>

                {member.staffServices?.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {member.staffServices.map((item: any) => (
                      <span
                        key={item.serviceId}
                        className="rounded-lg bg-surface-container-low px-2.5 py-1 text-[10px] font-bold text-on-surface-variant"
                      >
                        {item.service?.name || 'Service'}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/10">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', member.isActive ? 'bg-tertiary' : 'bg-outline-variant')} />
                    <span className={cn('text-xs font-bold', member.isActive ? 'text-tertiary' : 'text-outline')}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-error bg-error-container/40 rounded-lg hover:bg-error-container/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
