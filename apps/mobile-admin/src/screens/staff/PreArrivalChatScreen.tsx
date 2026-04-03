import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {RouteProp, useRoute} from '@react-navigation/native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {io, Socket} from 'socket.io-client';
import {queueApi} from '../../api/client';
import apiClient from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {QueueChatMessage, RootStackParamList} from '../../types';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

type ChatRoute = RouteProp<RootStackParamList, 'PreArrivalChat'>;

const templates = ['On the way?', 'Please share ETA', 'Chair ready in 10 mins'];

export default function PreArrivalChatScreen() {
  const route = useRoute<ChatRoute>();
  const {user} = useAuthStore();
  const bookingId = route.params.bookingId;
  const customerName = route.params?.customerName || 'Customer';
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const {data: history = [], isLoading} = useQuery<QueueChatMessage[]>({
    queryKey: ['queueChatMessages', bookingId],
    queryFn: () => queueApi.getMessages(bookingId).then(res => res.data || []),
    enabled: !!bookingId,
  });

  const [messages, setMessages] = useState<QueueChatMessage[]>([]);

  useEffect(() => {
    setMessages(history);
  }, [history]);

  useEffect(() => {
    const baseUrl = String(apiClient.defaults.baseURL || '');
    const socketOrigin = baseUrl.replace(/\/api\/v1\/?$/, '');
    const liveSocket = io(`${socketOrigin}/queue`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    liveSocket.on('connect', () => {
      setConnected(true);
      liveSocket.emit('trackBooking', {bookingId});
    });

    liveSocket.on('disconnect', () => {
      setConnected(false);
    });

    liveSocket.on('chatMessage', (message: QueueChatMessage) => {
      if (message.bookingId !== bookingId) {
        return;
      }

      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    setSocket(liveSocket);

    return () => {
      liveSocket.disconnect();
      setSocket(null);
    };
  }, [bookingId]);

  const postMessageMutation = useMutation({
    mutationFn: (content: string) =>
      queueApi.postMessage(bookingId, {
        senderId: user?.id || 'staff',
        senderType: 'SHOP',
        content,
      }),
    onSuccess: (response) => {
      setMessages(prev => {
        const next = response.data;
        if (!next || prev.some(m => m.id === next.id)) {
          return prev;
        }
        return [...prev, next];
      });
    },
  });

  const sorted = useMemo(() => messages, [messages]);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value) return;

    if (socket && connected) {
      socket.emit('sendMessage', {
        bookingId,
        senderId: user?.id || 'staff',
        senderType: 'SHOP',
        content: value,
      });
    } else {
      await postMessageMutation.mutateAsync(value);
    }

    setDraft('');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pre-Arrival Chat</Text>
        <Text style={styles.subtitle}>{customerName} • {connected ? 'Live' : 'Offline fallback'}</Text>
      </View>

      <View style={styles.chipsRow}>
        {templates.map(template => (
          <TouchableOpacity
            key={template}
            style={styles.chip}
            onPress={() => {
              send(template);
            }}>
            <Text style={styles.chipText}>{template}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({item}) => (
          <View style={[styles.bubble, item.senderType === 'SHOP' ? styles.staffBubble : styles.customerBubble]}>
            <Text style={[styles.messageText, item.senderType === 'SHOP' ? styles.staffText : styles.customerText]}>
              {item.content}
            </Text>
            <Text style={styles.ts}>{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <TextInput
          style={styles.input}
          placeholder="Type message"
          value={draft}
          onChangeText={setDraft}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => {
            send(draft);
          }}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.freeSlotButton}
        onPress={() => {
          send('If you cannot make it, we can free your slot for waitlist.');
        }}>
        <Text style={styles.freeSlotText}>Free Slot Shortcut</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  loadingWrap: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background},
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  title: {fontSize: FontSize.h1, color: Colors.textPrimary, fontWeight: FontWeight.bold},
  subtitle: {marginTop: 2, fontSize: FontSize.body, color: Colors.textSecondary},
  chipsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md},
  chip: {
    backgroundColor: Colors.primary50,
    borderWidth: 1,
    borderColor: Colors.primary200,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {fontSize: FontSize.label, color: Colors.primary700, fontWeight: FontWeight.medium},
  messages: {paddingHorizontal: Spacing.md, paddingBottom: Spacing.md},
  bubble: {maxWidth: '80%', padding: Spacing.sm, borderRadius: Radius.md, marginBottom: Spacing.sm},
  staffBubble: {alignSelf: 'flex-end', backgroundColor: Colors.primary600},
  customerBubble: {alignSelf: 'flex-start', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200},
  messageText: {fontSize: FontSize.body},
  staffText: {color: Colors.white},
  customerText: {color: Colors.textPrimary},
  ts: {marginTop: 2, fontSize: FontSize.caption, color: Colors.textMuted},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  sendButton: {backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm},
  sendText: {fontSize: FontSize.body, color: Colors.white, fontWeight: FontWeight.semibold},
  freeSlotButton: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  freeSlotText: {fontSize: FontSize.body, color: '#166534', fontWeight: FontWeight.semibold},
});
