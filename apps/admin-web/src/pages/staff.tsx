import React from 'react';
import Head from 'next/head';
import { Plus, Edit2, Mail, Phone, Users } from 'lucide-react';
import { Card, Button, Input, Badge, Loading, ImageUpload } from '@/components/ui';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
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
  role: string;
  avatarUrl: string;
}

const emptyForm: StaffFormData = {
  name: '',
  email: '',
  phone: '',
  role: 'STAFF',
  avatarUrl: '',
};

export default function StaffPage() {
  const { data: staff, isLoading } = useStaff();
  const { data: services } = useServices();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const assignServiceToStaff = useAssignServiceToStaff();
  const unassignServiceFromStaff = useUnassignServiceFromStaff();
  const [showForm, setShowForm] = React.useState(false);
  const [editingStaffId, setEditingStaffId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<StaffFormData>({ ...emptyForm });
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);
  const [initialServiceIds, setInitialServiceIds] = React.useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let savedStaffId = editingStaffId;

      if (editingStaffId) {
        await updateStaff.mutateAsync({ staffId: editingStaffId, ...formData });
      } else {
        const created = await createStaff.mutateAsync(formData as any);
        savedStaffId = created?.id;
      }

      if (savedStaffId) {
        const toAssign = selectedServiceIds.filter((id) => !initialServiceIds.includes(id));
        const toUnassign = initialServiceIds.filter((id) => !selectedServiceIds.includes(id));

        if (toAssign.length > 0) {
          await Promise.all(
            toAssign.map((serviceId) =>
              assignServiceToStaff.mutateAsync({ staffId: savedStaffId as string, serviceId }),
            ),
          );
        }

        if (toUnassign.length > 0) {
          await Promise.all(
            toUnassign.map((serviceId) =>
              unassignServiceFromStaff.mutateAsync({ staffId: savedStaffId as string, serviceId }),
            ),
          );
        }
      }

      setShowForm(false);
      setEditingStaffId(null);
      setFormData({ ...emptyForm });
      setSelectedServiceIds([]);
      setInitialServiceIds([]);
    } catch (err) {
      console.error('Failed to save staff:', err);
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
      role: member.role || 'STAFF',
      avatarUrl: member.avatarUrl || '',
    });
    const assignedServiceIds = (member.staffServices || []).map((item: any) => item.serviceId);
    setSelectedServiceIds(assignedServiceIds);
    setInitialServiceIds(assignedServiceIds);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStaffId(null);
    setFormData({ ...emptyForm });
    setSelectedServiceIds([]);
    setInitialServiceIds([]);
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  if (isLoading) return <Loading text="Loading staff..." />;

  return (
    <>
      <Head>
        <title>Staff - Overline Admin</title>
      </Head>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
            <p className="text-gray-500">Manage your team members</p>
          </div>
          <Button
            onClick={() => {
              setEditingStaffId(null);
              setFormData({ ...emptyForm });
              setSelectedServiceIds([]);
              setInitialServiceIds([]);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingStaffId ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
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
                <Input
                  label="Full Name"
                  required
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="STAFF">Staff</option>
                    <option value="OWNER">Owner/Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Services</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border border-gray-200 p-3">
                  {(services || []).map((service: any) => (
                    <label key={service.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50">
                      <span className="text-sm text-gray-700">
                        {service.name}
                        <span className="ml-2 text-xs text-gray-500">{service.durationMinutes}m</span>
                      </span>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => toggleServiceSelection(service.id)}
                      />
                    </label>
                  ))}
                  {(services || []).length === 0 && (
                    <p className="text-sm text-gray-500">No services found. Add services first.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={
                    createStaff.isPending ||
                    updateStaff.isPending ||
                    assignServiceToStaff.isPending ||
                    unassignServiceFromStaff.isPending
                  }
                >
                  {createStaff.isPending ||
                  updateStaff.isPending ||
                  assignServiceToStaff.isPending ||
                  unassignServiceFromStaff.isPending
                    ? 'Saving...'
                    : editingStaffId
                      ? 'Update Staff'
                      : 'Add Staff'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Staff Grid */}
        {!staff || staff.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members yet</h3>
            <p className="text-gray-500 mb-4">Add your first team member to get started.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Staff
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((member: any) => (
              <Card key={member.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-lg">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.name?.charAt(0) || 'S'
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <Badge variant={member.role === 'OWNER' ? 'info' : 'default'}>
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  <button onClick={() => handleEdit(member)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4" />
                      {member.email}
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-4 h-4" />
                      {member.phone}
                    </div>
                  )}
                </div>

                {member.staffServices?.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {member.staffServices.map((item: any) => (
                      <span
                        key={item.serviceId}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                      >
                        {item.service?.name || 'Service'}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      member.isActive ? 'text-green-600' : 'text-gray-400'
                    )}
                  >
                    {member.isActive ? 'Active' : 'Inactive'}
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
