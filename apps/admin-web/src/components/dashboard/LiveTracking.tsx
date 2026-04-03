import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Phone, MessageCircle, User, Send } from 'lucide-react';
import { Card, Badge, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useQueueSocket } from '@/hooks/useQueueSocket';
import api from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface Location {
    lat: number;
    lng: number;
}

interface TrackableBooking {
    id: string;
    bookingNumber: string;
    status: string;
    startTime: string;
    user?: { name: string; phone: string; avatarUrl: string };
    services: { serviceName: string }[];
    payment?: { status: string; amount: string; currency: string };
    location?: Location;
}

interface ChatMessage {
    id: string;
    senderId: string;
    senderType: 'USER' | 'SHOP';
    content: string;
    createdAt: string;
}

export const LiveTracking = ({ shopId }: { shopId: string }) => {
    const [bookings, setBookings] = useState<TrackableBooking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<TrackableBooking | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);

    const fetchTracking = useCallback(async () => {
        try {
            const { data } = await api.get(`/queue/tracking/${shopId}`);
            setBookings(data || []);
        } catch (err) {
            console.error(err);
        }
    }, [shopId]);

    // Fetch trackable bookings initially
    useEffect(() => {
        fetchTracking();
        const interval = setInterval(fetchTracking, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [fetchTracking]);

    // Listen to global queue updates to trigger a fast refetch
    useQueueSocket({
        shopId,
        onQueueUpdate: fetchTracking,
        onBookingUpdate: fetchTracking,
        enabled: !!shopId,
    });

    // Handle WebSocket for live location & chat for selected booking
    useEffect(() => {
        if (!selectedBooking) return;
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';
        const skt = io(`${wsUrl}/queue`, { transports: ['websocket', 'polling'] });
        setSocket(skt);

        skt.on('connect', () => {
            skt.emit('trackBooking', { bookingId: selectedBooking.id });
        });

        skt.on('locationUpdate', (loc: { lat: number; lng: number }) => {
            setBookings((prev) =>
                prev.map((b) => (b.id === selectedBooking.id ? { ...b, location: loc } : b))
            );
            if (selectedBooking.id === selectedBooking.id) {
                setSelectedBooking((prev) => prev ? { ...prev, location: loc } : null);
            }
        });

        skt.on('chatMessage', (msg: ChatMessage) => {
            setMessages((prev) => [...prev, msg]);
        });

        // Load initial messages
        api.get(`/queue/tracking/${selectedBooking.id}/messages`).then(({ data }) => setMessages(data || []));

        return () => {
            skt.disconnect();
        };
    }, [selectedBooking]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !socket || !selectedBooking) return;

        // Actually we should post to the API so it's resilient, or use socket. We created an API for it
        api.post(`/queue/tracking/${selectedBooking.id}/messages`, {
            senderId: shopId,
            senderType: 'SHOP',
            content: chatInput,
        }).then(() => {
            // Socket will broadcast it to us as well, or we can just emit it
            socket.emit('sendMessage', {
                bookingId: selectedBooking.id,
                senderId: shopId,
                senderType: 'SHOP',
                content: chatInput,
            });
            setChatInput('');
        });
    };

    if (!bookings || bookings.length === 0) return null;

    return (
        <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary-500 animate-pulse" />
                    Live Approaching Users
                </h2>
            </div>

            <div className="flex gap-4">
                {/* Left Side: Users List */}
                <div className="w-1/3 space-y-3">
                    {bookings.map((booking) => (
                        <div
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedBooking?.id === booking.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {booking.user?.avatarUrl ? (
                                    <img src={booking.user.avatarUrl} alt="User" className="w-10 h-10 rounded-full" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="w-5 h-5 text-gray-500" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-gray-900">{booking.user?.name || 'Walk-in'}</p>
                                    <p className="text-xs text-gray-500">{booking.services.map((s) => s.serviceName).join(', ')}</p>
                                </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                                <Badge variant={booking.status === 'IN_PROGRESS' ? 'info' : 'warning'}>
                                    {booking.status}
                                </Badge>
                                {booking.location && (
                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Live
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Map & Chat */}
                {selectedBooking && (
                    <div className="w-2/3 border rounded-lg p-4 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900">{selectedBooking.user?.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selectedBooking.user?.phone || 'N/A'}</span>
                                    <span>Payment: <Badge variant={selectedBooking.payment?.status === 'COMPLETED' ? 'success' : 'warning'}>{selectedBooking.payment?.status || 'PENDING'}</Badge></span>
                                </div>
                            </div>
                        </div>

                        {/* Simulated Map / Coordinates View */}
                        <div className="h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center mb-4 border">
                            <MapPin className="w-8 h-8 text-primary-500 mb-2" />
                            {selectedBooking.location ? (
                                <>
                                    <p className="text-sm font-medium text-gray-900">User is sharing live location</p>
                                    <p className="text-xs text-gray-500">Coordinates: {selectedBooking.location.lat.toFixed(4)}, {selectedBooking.location.lng.toFixed(4)}</p>
                                </>
                            ) : (
                                <p className="text-sm text-gray-500">Waiting for user location update...</p>
                            )}
                        </div>

                        {/* Chat Box */}
                        <div className="flex-1 border rounded-lg flex flex-col bg-gray-50 overflow-hidden">
                            <div className="bg-white border-b px-3 py-2 flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-sm text-gray-700">Chat with {selectedBooking.user?.name.split(' ')[0]}</span>
                            </div>
                            <div className="flex-1 p-3 overflow-y-auto space-y-2 h-40">
                                {messages.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 mt-4">No messages yet. Send a message if you have queries.</p>
                                ) : (
                                    messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.senderType === 'SHOP' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`p-2 rounded-lg text-sm max-w-[80%] ${msg.senderType === 'SHOP' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleSendMessage} className="p-2 bg-white border-t flex gap-2">
                                <Input
                                    className="flex-1"
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                />
                                <Button type="submit" size="sm" className="px-3"><Send className="w-4 h-4" /></Button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
