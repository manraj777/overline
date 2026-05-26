import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  Dimensions,
  Clipboard,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '../../api/client';
import { Colors, Shadows } from '../../theme';
import {
  MessageSquare,
  Copy,
  Share2,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function WhatsAppOnboardingScreen() {
  const [activeTab, setActiveTab] = useState<'quick' | 'api'>('quick');

  const { data: shopsResp } = useQuery({
    queryKey: ['my-shops-wa'],
    queryFn: () => shopApi.getMyShops().then(res => res.data),
  });

  const shop = shopsResp?.[0]; // Get the first shop
  const shopSlug = shop?.slug || 'your-shop-slug';
  const bookingLink = `https://overline.in/s/${shopSlug}`;

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied to Clipboard', 'You can now paste this template in your WhatsApp Business settings.');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Book your appointment at ${shop?.name || 'our shop'} online using this link: ${bookingLink}`,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const englishTemplate = `Hi! Thanks for contacting ${shop?.name || 'us'}. To book your appointment instantly, tap here: ${bookingLink} \n\nChoose your services, pick a time slot, and confirm in just 1 minute!`;
  
  const hindiTemplate = `Namaste! ${shop?.name || 'Humse'} sampark karne ke liye dhanyavad. Instant appointment book karne ke liye yahan click karein: ${bookingLink} \n\nApne services select karein aur 1 minute mein booking confirm karein!`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Banner */}
      <View style={styles.heroCard}>
        <View style={styles.iconContainer}>
          <MessageSquare size={36} color="#FFF" />
        </View>
        <Text style={styles.heroTitle}>WhatsApp Booking Setup</Text>
        <Text style={styles.heroSubtitle}>
          Convert customer queries into automatic instant bookings with simple WhatsApp automation.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'quick' && styles.tabBtnActive]}
          onPress={() => setActiveTab('quick')}
        >
          <Text style={[styles.tabText, activeTab === 'quick' && styles.tabTextActive]}>
            Quick Setup (Free)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'api' && styles.tabBtnActive]}
          onPress={() => setActiveTab('api')}
        >
          <Text style={[styles.tabText, activeTab === 'api' && styles.tabTextActive]}>
            Enterprise API
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'quick' ? (
        <View style={styles.section}>
          {/* How it works */}
          <Text style={styles.sectionHeader}>How It Works</Text>
          <View style={styles.stepList}>
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Customer Calls / Chats</Text>
                <Text style={styles.stepDesc}>
                  Customer calls your shop for an appointment. Tell them: "Please send 'Hi' on our WhatsApp number."
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Auto-Reply Sends Link</Text>
                <Text style={styles.stepDesc}>
                  WhatsApp Business Auto-Reply instantly sends your custom booking link to the customer.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Booking Appears Here</Text>
                <Text style={styles.stepDesc}>
                  Customer picks a slot on the mobile page. The booking is instantly synced to your Proprietor Console.
                </Text>
              </View>
            </View>
          </View>

          {/* Custom Link card */}
          <View style={styles.linkCard}>
            <Text style={styles.linkCardTitle}>Your Booking Link</Text>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>{bookingLink}</Text>
              <TouchableOpacity onPress={() => copyToClipboard(bookingLink)} style={styles.copyBtn}>
                <Copy size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Share2 size={16} color="#FFF" />
              <Text style={styles.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>

          {/* Copyable Templates */}
          <Text style={styles.sectionHeader}>Copyable Auto-Reply Templates</Text>

          {/* English Template */}
          <View style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <Text style={styles.templateLang}>English Template</Text>
              <TouchableOpacity onPress={() => copyToClipboard(englishTemplate)}>
                <Copy size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.templateBody}>{englishTemplate}</Text>
          </View>

          {/* Hindi Template */}
          <View style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <Text style={styles.templateLang}>Hindi Template (हिंदी)</Text>
              <TouchableOpacity onPress={() => copyToClipboard(hindiTemplate)}>
                <Copy size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.templateBody}>{hindiTemplate}</Text>
          </View>

          {/* Setup Guide */}
          <View style={styles.guideCard}>
            <HelpCircle size={20} color={Colors.primary} />
            <View style={styles.guideTextWrap}>
              <Text style={styles.guideTitle}>How to configure in WhatsApp Business?</Text>
              <Text style={styles.guideText}>
                Open WhatsApp Business app → Settings → Business Tools → "Away Message" or "Greeting Message". Set the trigger to "Always Send" and paste the template copied above!
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Enterprise WhatsApp Cloud API</Text>
          <Text style={styles.bodyText}>
            Upgrade to the automated WhatsApp booking engine for a complete hands-off operations flow.
          </Text>

          <View style={styles.apiFeatureGrid}>
            <View style={styles.apiFeatureCard}>
              <Zap size={24} color="#10B981" />
              <Text style={styles.apiFeatureTitle}>Auto Confirmations</Text>
              <Text style={styles.apiFeatureDesc}>
                Sends a beautiful formatted message with confirmation details directly to their chat.
              </Text>
            </View>

            <View style={styles.apiFeatureCard}>
              <Sparkles size={24} color="#10B981" />
              <Text style={styles.apiFeatureTitle}>Smart Reminders</Text>
              <Text style={styles.apiFeatureDesc}>
                Automatically reminds clients 2 hours before their slot, reducing no-shows by 85%.
              </Text>
            </View>

            <View style={styles.apiFeatureCard}>
              <MessageSquare size={24} color="#10B981" />
              <Text style={styles.apiFeatureTitle}>In-Chat Rescheduling</Text>
              <Text style={styles.apiFeatureDesc}>
                Allows clients to cancel or reschedule appointments directly inside WhatsApp using interactive buttons.
              </Text>
            </View>

            <View style={styles.apiFeatureCard}>
              <CheckCircle size={24} color="#10B981" />
              <Text style={styles.apiFeatureTitle}>Verified Brand Green Tick</Text>
              <Text style={styles.apiFeatureDesc}>
                Send messages from your official business account name with a Meta verified checkmark.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.requestBtn}
            onPress={() => Alert.alert('Request Submitted', 'Our integration support will contact you on your registered owner phone number shortly.')}
          >
            <Text style={styles.requestBtnText}>Request Enterprise API Onboarding</Text>
            <ArrowRight size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#075E54', // WhatsApp Teal
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    ...Shadows.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#075E54',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFF',
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 8,
  },
  stepList: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
    ...Shadows.sm,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2E7D32',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
  },
  linkCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    ...Shadows.sm,
  },
  linkCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  linkBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: 12,
    height: 48,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  copyBtn: {
    padding: 14,
  },
  shareBtn: {
    flexDirection: 'row',
    backgroundColor: '#075E54',
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.glow,
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  templateCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.sm,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  templateLang: {
    fontSize: 13,
    fontWeight: '800',
    color: '#075E54',
  },
  templateBody: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 18,
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  guideTextWrap: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 4,
  },
  guideText: {
    fontSize: 11,
    color: '#1E3A8A',
    fontWeight: '500',
    lineHeight: 16,
  },
  bodyText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  apiFeatureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  apiFeatureCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.sm,
  },
  apiFeatureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 8,
  },
  apiFeatureDesc: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 15,
    marginTop: 4,
  },
  requestBtn: {
    flexDirection: 'row',
    backgroundColor: '#075E54',
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    ...Shadows.glow,
  },
  requestBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
