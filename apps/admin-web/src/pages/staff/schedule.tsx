import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import api from '@/lib/api';
import { Badge, Button, Card, Loading, useToast } from '@/components/ui';
import { useDeleteStaffTimeOff, useRequestStaffTimeOff, useStaffOwnSchedule } from '@/hooks';

const DAYS = [
  { key: 'MONDAY', label: 'Mon' },
  { key: 'TUESDAY', label: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wed' },
  { key: 'THURSDAY', label: 'Thu' },
  { key: 'FRIDAY', label: 'Fri' },
  { key: 'SATURDAY', label: 'Sat' },
  { key: 'SUNDAY', label: 'Sun' },
];

type BreakRow = {
  label: string;
  start: string;
  end: string;
};

type DaySchedule = {
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breaks: BreakRow[];
};

const BREAK_LABELS = ['Lunch', 'Prayer', 'Break', 'Custom'];

export default function StaffSchedulePage() {
  const { addToast } = useToast();
  const { data: scheduleData, isLoading, refetch } = useStaffOwnSchedule();
  const requestTimeOff = useRequestStaffTimeOff();
  const deleteTimeOff = useDeleteStaffTimeOff();

  const [days, setDays] = useState<Record<string, DaySchedule>>({});
  const [blockedDate, setBlockedDate] = useState('');
  const [blockedReason, setBlockedReason] = useState('Holiday');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const map: Record<string, DaySchedule> = {};
    for (const day of DAYS) {
      const existing = scheduleData?.workingHours?.find((item) => item.dayOfWeek === day.key);
      map[day.key] = {
        isWorking: existing ? !existing.isOff : day.key !== 'SUNDAY',
        startTime: existing?.startTime || '09:00',
        endTime: existing?.endTime || '18:00',
        breaks: [],
      };
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('staff-schedule-gap-windows');
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, BreakRow[]>;
          for (const day of DAYS) {
            map[day.key].breaks = Array.isArray(saved[day.key]) ? saved[day.key] : [];
          }
        }
      } catch {
        // ignore broken local cache
      }
    }

    setDays(map);
  }, [scheduleData?.workingHours]);

  const blockedDates = useMemo(() => {
    return (scheduleData?.timeOffs || []).map((item) => ({
      id: item.id,
      date: new Date(item.startTime).toISOString().slice(0, 10),
      reason: item.reason || 'Personal',
      status: item.status || 'pending',
    }));
  }, [scheduleData?.timeOffs]);

  const addBreak = (dayKey: string) => {
    setDays((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        breaks: [...prev[dayKey].breaks, { label: 'Lunch', start: '13:00', end: '14:00' }],
      },
    }));
  };

  const updateBreak = (dayKey: string, index: number, field: keyof BreakRow, value: string) => {
    setDays((prev) => {
      const next = [...prev[dayKey].breaks];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [dayKey]: { ...prev[dayKey], breaks: next } };
    });
  };

  const removeBreak = (dayKey: string, index: number) => {
    setDays((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        breaks: prev[dayKey].breaks.filter((_, i) => i !== index),
      },
    }));
  };

  const saveSchedule = async () => {
    try {
      setIsSaving(true);
      await Promise.all(
        DAYS.map((day) => {
          const item = days[day.key];
          return api.patch(`/admin/staff/me/schedule/${day.key}`, {
            isOff: !item.isWorking,
            startTime: item.startTime,
            endTime: item.endTime,
            requiresApproval: false,
          });
        }),
      );

      if (typeof window !== 'undefined') {
        const serialized = DAYS.reduce((acc, day) => {
          acc[day.key] = days[day.key]?.breaks || [];
          return acc;
        }, {} as Record<string, BreakRow[]>);
        window.localStorage.setItem('staff-schedule-gap-windows', JSON.stringify(serialized));
      }

      addToast({
        type: 'success',
        title: 'Schedule saved',
        message: 'Changes and personal gap windows saved.',
      });
      refetch();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Save failed', message: error?.response?.data?.message || 'Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const addBlockedDate = async () => {
    if (!blockedDate) return;
    try {
      await requestTimeOff.mutateAsync({
        startDate: `${blockedDate}T00:00:00`,
        endDate: `${blockedDate}T23:59:59`,
        isFullDay: true,
        reason: blockedReason,
        urgency: 'normal',
      });
      setBlockedDate('');
      addToast({ type: 'success', title: 'Date blocked' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Block failed', message: error?.response?.data?.message || 'Try again.' });
    }
  };

  if (isLoading) {
    return <Loading text="Loading schedule..." />;
  }

  return (
    <>
      <Head>
        <title>My Schedule - Staff</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-500">Weekly working hours, breaks and blocked dates.</p>
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Weekly Grid</h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            {DAYS.map((day) => {
              const item = days[day.key];
              if (!item) return null;
              return (
                <div key={day.key} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{day.label}</h3>
                    <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={item.isWorking}
                        onChange={(e) =>
                          setDays((prev) => ({
                            ...prev,
                            [day.key]: { ...prev[day.key], isWorking: e.target.checked },
                          }))
                        }
                      />
                      Working
                    </label>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="time"
                      value={item.startTime}
                      disabled={!item.isWorking}
                      onChange={(e) =>
                        setDays((prev) => ({
                          ...prev,
                          [day.key]: { ...prev[day.key], startTime: e.target.value },
                        }))
                      }
                      className="h-9 w-full rounded border border-gray-300 px-2 text-sm"
                    />
                    <input
                      type="time"
                      value={item.endTime}
                      disabled={!item.isWorking}
                      onChange={(e) =>
                        setDays((prev) => ({
                          ...prev,
                          [day.key]: { ...prev[day.key], endTime: e.target.value },
                        }))
                      }
                      className="h-9 w-full rounded border border-gray-300 px-2 text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    className="mt-3 text-xs font-medium text-[#0f4c75] hover:underline"
                    onClick={() => addBreak(day.key)}
                    disabled={!item.isWorking}
                  >
                    Add gap window
                  </button>

                  <div className="mt-2 space-y-2">
                    {item.breaks.map((br, idx) => (
                      <div key={`${day.key}-break-${idx}`} className="rounded border border-gray-200 p-2">
                        <select
                          value={br.label}
                          onChange={(e) => updateBreak(day.key, idx, 'label', e.target.value)}
                          className="mb-1 h-8 w-full rounded border border-gray-300 px-2 text-xs"
                        >
                          {BREAK_LABELS.map((label) => (
                            <option key={label} value={label}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={br.start}
                            onChange={(e) => updateBreak(day.key, idx, 'start', e.target.value)}
                            className="h-8 w-full rounded border border-gray-300 px-1 text-xs"
                          />
                          <input
                            type="time"
                            value={br.end}
                            onChange={(e) => updateBreak(day.key, idx, 'end', e.target.value)}
                            className="h-8 w-full rounded border border-gray-300 px-1 text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBreak(day.key, idx)}
                          className="mt-1 text-xs text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded bg-gray-50 p-2 text-[11px] text-gray-600">
                    Users will see: {item.isWorking ? `Available ${item.startTime} - ${item.endTime}` : 'Unavailable'}
                    {item.breaks.length > 0
                      ? `, gaps ${item.breaks.map((br) => `${br.start}-${br.end}`).join(', ')}`
                      : ''}
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded bg-gray-200">
                    {item.isWorking ? <div className="h-2 w-full bg-cyan-500" /> : <div className="h-2 w-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={saveSchedule} isLoading={isSaving}>
              Save Schedule
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Blocked Dates</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="date"
              value={blockedDate}
              onChange={(e) => setBlockedDate(e.target.value)}
              className="h-10 rounded border border-gray-300 px-3 text-sm"
            />
            <select
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              className="h-10 rounded border border-gray-300 px-3 text-sm"
            >
              <option>Holiday</option>
              <option>Personal</option>
              <option>Training</option>
            </select>
            <Button onClick={addBlockedDate} isLoading={requestTimeOff.isPending}>
              Add Blocked Date
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {blockedDates.length === 0 ? (
              <p className="text-sm text-gray-500">No blocked dates yet.</p>
            ) : (
              blockedDates.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border border-gray-200 p-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.date}</p>
                    <p className="text-sm text-gray-600">{item.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === 'pending' ? 'warning' : 'info'}>{item.status}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTimeOff.mutate(item.id)}
                      isLoading={deleteTimeOff.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
