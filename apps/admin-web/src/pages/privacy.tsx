import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Privacy Policy - Overline</title>
      </Head>
      <div className="max-w-3xl w-full bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Privacy Policy</h1>
        <div className="prose prose-blue text-gray-600">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us when you register for an account, update your profile, use our services, or communicate with us. This includes your name, email address, phone number, and any other information you choose to provide.</p>
          
          <h2>2. How We Use Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, communicate with you, and personalize your experience on our platform.</p>
          
          <h2>3. Information Sharing</h2>
          <p>We do not share your personal information with third parties except as described in this privacy policy or with your consent.</p>
          
          <h2>4. Data Security</h2>
          <p>We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.</p>
          
          <h2>5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at support@overline.in.</p>
        </div>
      </div>
    </div>
  );
}
