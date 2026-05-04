import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, Send, Navigation } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
    id: string;
    senderId: string;
    senderType: 'USER' | 'SHOP';
    content: string;
    createdAt: string;
}

interface LiveBookingTrackerProps {
    bookingId: string;
    shopId: string;
    startTime: string;
    /** Current booking status — controls which features are enabled */
    status?: string;
}

export const LiveBookingTracker = ({ bookingId, shopId, startTime, status }: LiveBookingTrackerProps) => {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSharingLocation, setIsSharingLocation] = useState(false);
    const [trackingError, setTrackingError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Chat is always active when this component renders (parent gates by status).
    // Location sharing only activates for CONFIRMED bookings within 20 min of start.
    const isConfirmed = status === 'CONFIRMED';

    const shouldShareLocation = (() => {
        if (!isConfirmed) return false;
        const now = new Date();
        const start = new Date(startTime);
        const diffMins = (start.getTime() - now.getTime()) / 60000;
        return diffMins <= 20;
    })();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Socket connection + chat — always on
    useEffect(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://127.0.0.1:3001';
        const skt = io(`${wsUrl}/queue`);
        setSocket(skt);

        skt.on('connect', () => {
            skt.emit('trackBooking', { bookingId });
        });

        skt.on('chatMessage', (msg: ChatMessage) => {
            setMessages((prev) => [...prev, msg]);
        });

        // Load existing messages
        api.get(`/queue/tracking/${bookingId}/messages`)
            .then(({ data }) => setMessages(data || []))
            .catch(() => { /* endpoint may not exist yet */ });

        return () => {
            skt.disconnect();
        };
    }, [bookingId]);

    // Geolocation sharing — only for confirmed bookings near start time
    useEffect(() => {
        if (!shouldShareLocation || !socket) return;

        let watchId: number | undefined;
        if ('geolocation' in navigator) {
            setIsSharingLocation(true);
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    socket.emit('updateLocation', {
                        bookingId,
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    });
                },
                () => {
                    setTrackingError('Location access denied. Enable permissions to share your location.');
                    setIsSharingLocation(false);
                },
                { enableHighAccuracy: true, maximumAge: 10000 }
            );
        }

        return () => {
            if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
            setIsSharingLocation(false);
        };
    }, [shouldShareLocation, socket, bookingId]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !socket || !user) return;

        api.post(`/queue/tracking/${bookingId}/messages`, {
            senderId: user.id,
            senderType: 'USER',
            content: chatInput,
        }).then(() => {
            socket.emit('sendMessage', {
                bookingId,
                senderId: user.id,
                senderType: 'USER',
                content: chatInput,
            });
            setChatInput('');
        }).catch(() => {
            // Fallback: still show locally even if API fails
            setMessages((prev) => [
                ...prev,
                {
                    id: `local-${Date.now()}`,
                    senderId: user.id,
                    senderType: 'USER',
                    content: chatInput,
                    createdAt: new Date().toISOString(),
                },
            ]);
            setChatInput('');
        });
    };

    return (
        <Card variant="bordered" className="border-primary/20">
            <div className="mb-4 flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div>
                    <h3 className="font-bold text-on-surface flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-primary" />
                        Live Journey & Chat
                    </h3>
                    {isSharingLocation ? (
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                            </span>
                            Sharing your live location with the shop
                        </p>
                    ) : trackingError ? (
                        <p className="text-xs text-error mt-1">{trackingError}</p>
                    ) : isConfirmed ? (
                        <p className="text-xs text-on-surface-variant mt-1">Location sharing activates 20 min before your appointment</p>
                    ) : (
                        <p className="text-xs text-on-surface-variant mt-1">Chat with the shop while your booking is being confirmed</p>
                    )}
                </div>
            </div>

            <div className="flex flex-col h-64 bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
                <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col">
                    {messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-center">
                            <div>
                                <MessageCircle className="w-8 h-8 text-outline mx-auto mb-2" />
                                <p className="text-xs text-on-surface-variant">
                                    If you are running late or have queries,<br />chat directly with the shop owner.
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-2.5 rounded-2xl text-sm max-w-[85%] ${
                                    msg.senderType === 'USER'
                                        ? 'bg-primary text-white rounded-br-sm'
                                        : 'bg-surface-container border border-outline-variant/10 text-on-surface rounded-bl-sm'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-2 bg-surface border-t border-outline-variant/10 flex gap-2 w-full">
                    <Input
                        className="flex-1 text-sm"
                        placeholder="Type a message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                    />
                    <Button type="submit" size="sm" className="px-3 min-w-[40px]"><Send className="w-4 h-4" /></Button>
                </form>
            </div>
        </Card>
    );
};
