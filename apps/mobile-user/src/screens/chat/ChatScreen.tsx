import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Bot, Send} from 'lucide-react-native';
import {api} from '../../api/client';
import {BorderRadius, Colors, FontSizes, FontWeights, Spacing} from '../../theme';

type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
}

interface ChatResponse {
  message?: string;
  reply?: string;
  content?: string;
}

const QUICK_PROMPTS = ['Near me', 'My bookings', 'How it works'];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi, I'm your Overline assistant. Ask me to find services, plan booking time, or check booking help.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const canSend = input.trim().length > 0 && !isSending;

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const parseAssistantReply = (data: ChatResponse): string => {
    return data.message ?? data.reply ?? data.content ?? 'I am here to help with your bookings.';
  };

  const sendMessage = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    const userMessage: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmedText,
    };

    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    try {
      const {data} = await api.post<ChatResponse>('/ai/chat', {
        messages: [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      setMessages(prev => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: parseAssistantReply(data),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: 'Assistant is temporarily unavailable. Please try again in a moment.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const renderItem = ({item}: {item: Message}) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Bot size={14} color={Colors.white} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAssistant]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerAvatar}>
            <Bot size={18} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Overline Assistant</Text>
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </View>

        <View style={styles.quickRow}>
          {QUICK_PROMPTS.map(prompt => (
            <Pressable
              key={prompt}
              style={styles.quickChip}
              onPress={() => sendMessage(prompt)}>
              <Text style={styles.quickChipText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={reversedMessages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about services or bookings"
            placeholderTextColor={Colors.gray400}
            editable={!isSending}
          />
          <Pressable
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            disabled={!canSend}
            onPress={() => sendMessage(input)}>
            {isSending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Send size={16} color={Colors.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  headerStatus: {
    color: Colors.success50,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  quickChip: {
    backgroundColor: Colors.primary50,
    borderWidth: 1,
    borderColor: Colors.primary200,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickChipText: {
    color: Colors.primary600,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  messageRow: {
    marginBottom: Spacing.md,
    maxWidth: '88%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
  },
  botAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  bubbleAssistant: {
    backgroundColor: Colors.gray100,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  messageText: {
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  messageTextUser: {
    color: Colors.white,
  },
  messageTextAssistant: {
    color: Colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
