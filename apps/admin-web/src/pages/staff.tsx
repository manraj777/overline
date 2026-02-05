import React from 'react';
import Head from 'next/head';
import { Plus, Edit2, Mail, Phone } from 'lucide-react';
import { Card, Button, Input, Badge, Loading } from '@/components/ui';
import { cn } from '@/lib/utils';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'OWNER' | 'STAFF';
  isActive: boolean;
  services: string[];
}

// Mock data for demonstration
const mockStaff: StaffMember[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91 9876543210',
    role: 'OWNER',
    isActive: true,
    services: ['Haircut', 'Beard Trim', 'Hair Color'],
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+91 9876543211',
    role: 'STAFF',
    isActive: true,
    services: ['Facial', 'Massage', 'Hair Color'],
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    phone: '+91 9876543212',
    role: 'STAFF',
    isActive: false,
    services: ['Haircut', 'Beard Trim'],
  },
];

export default function StaffPage() {
  const [staff] = React.useState<StaffMember[]>(mockStaff);
  const [showForm, setShowForm] = React.useState(false);

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
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>

        {/* Add Form Modal */}
        {showForm && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Staff Member</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Full Name" required placeholder="Enter name" />
                <Input label="Email" type="email" required placeholder="email@example.com" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Phone" type="tel" placeholder="+91 9876543210" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <option value="STAFF">Staff</option>
                    <option value="OWNER">Owner/Manager</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit">Add Staff</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <Card key={member.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-lg">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <Badge variant={member.role === 'OWNER' ? 'info' : 'default'}>
                      {member.role}
                    </Badge>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="w-4 h-4" />
                  {member.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4" />
                  {member.phone}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Services</p>
                <div className="flex flex-wrap gap-1">
                  {member.services.map((service) => (
                    <span
                      key={service}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span
                  className={cn(
                    'text-sm font-medium',
                    member.isActive ? 'text-green-600' : 'text-gray-400'
                  )}
                >
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  View Schedule
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
