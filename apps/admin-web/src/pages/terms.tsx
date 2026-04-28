import Head from 'next/head';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Terms of Service - Overline</title>
      </Head>
      <div className="max-w-3xl w-full bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Terms of Service</h1>
        <div className="prose prose-blue text-gray-600">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using the Overline platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          
          <h2>2. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
          
          <h2>3. Acceptable Use</h2>
          <p>You agree not to use the platform for any unlawful purpose or in any way that violates these Terms of Service.</p>
          
          <h2>4. Limitation of Liability</h2>
          <p>Overline shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform.</p>
          
          <h2>5. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at support@overline.in.</p>
        </div>
      </div>
    </div>
  );
}
