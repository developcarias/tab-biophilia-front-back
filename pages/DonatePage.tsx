import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n';
import { DonatePageContent } from '../types';
import PageBanner from '../components/PageBanner';
import Editable from '../components/Editable';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from '../components/PaymentForm';
import Spinner from '../components/icons/Spinner';

interface DonatePageProps {
  content: DonatePageContent;
  apiUrl: string;
}

const DonatePage: React.FC<DonatePageProps> = ({ content, apiUrl }) => {
  const [showThankYou, setShowThankYou] = useState(false);
  const [amount, setAmount] = useState(50);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    emailAddress: '',
  });
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  
  const presetAmounts = [25, 50, 100, 250, 500];
  const { language } = useI18n();

  useEffect(() => {
    fetch(`${apiUrl}/api/stripe-key`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch Stripe configuration.');
      })
      .then(data => {
        const { publishableKey } = data;
        if (publishableKey) {
          setStripePromise(loadStripe(publishableKey));
        } else {
          console.error("Stripe publishable key was not provided by the server.");
        }
      })
      .catch(error => {
        console.error("Could not fetch Stripe key:", error);
      });
  }, [apiUrl]);

  const createPaymentIntent = useCallback(async (donationAmount: number) => {
    try {
      setClientSecret(''); // Clear old secret while new one is loading
      const response = await fetch(`${apiUrl}/api/create-payment-intent`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: donationAmount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to initialize payment');
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error(error);
      // Optionally show an error message to the user here
    }
  }, [apiUrl]);

  // Debounced effect for creating payment intent
  useEffect(() => {
    if (amount >= 1) { // Stripe requires a minimum amount
      const handler = setTimeout(() => {
        createPaymentIntent(amount);
      }, 500); // 500ms debounce
      return () => clearTimeout(handler);
    }
  }, [amount, createPaymentIntent]);

  const handlePaymentSuccess = async () => {
    try {
      await fetch(`${apiUrl}/api/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, amount }),
      });
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
    }
    setShowThankYou(true);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };
  
  const renderTextWithAmount = (text: string, value: number) => {
    return text.replace('{{amount}}', String(value));
  }

  const appearance: StripeElementsOptions['appearance'] = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#10b981', // brand-accent
      colorBackground: '#ffffff',
      colorText: '#4a5568', // brand-gray
      fontFamily: 'sans-serif',
      borderRadius: '8px',
    },
  };
  
  const stripeOptions: StripeElementsOptions = {
    clientSecret,
    appearance,
  };

  if (!content) return null;

  if (showThankYou) {
    return (
      <>
        <PageBanner 
          title={content.thankYou?.title?.[language] || 'Thank You!'}
          imageUrl="https://images.unsplash.com/photo-1527061011665-36521e61b244?q=80&w=1920&h=1080&fit=crop"
          basePath="donatePage.thankYou.title"
          localizedText={content.thankYou?.title}
        />
        <div className="bg-white py-8 lg:py-12">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <p className="text-xl text-brand-gray">
              {renderTextWithAmount(content.thankYou?.text?.[language] || 'Thank you for your generous donation of ${{amount}}.', amount)}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBanner
        title={content.banner?.title?.[language] || 'Donate'}
        imageUrl={content.banner?.imageUrl || ''}
        basePath="donatePage.banner.title"
        localizedText={content.banner?.title}
      />
      <div className="bg-brand-green-light py-8 lg:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="p-8 md:p-12">
              <Editable localizedText={content.intro || {en:'', es:''}} basePath="donatePage.intro" multiline>
                <p className="text-center text-brand-gray -mt-4 mb-8 text-lg">{content.intro?.[language]}</p>
              </Editable>
              
              {/* Amount Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-brand-green-dark mb-3">{content.form?.chooseAmount?.[language] || 'Choose an amount'}</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {presetAmounts.map(preset => (
                    <button type="button" key={preset} onClick={() => setAmount(preset)} className={`p-3 border-2 rounded-lg font-bold text-center transition-colors ${amount === preset ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-brand-green-dark border-gray-300 hover:border-brand-green'}`}>
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-brand-green-dark mb-3" htmlFor="custom-amount">{content.form?.customAmount?.[language] || 'Or enter a custom amount'}</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-lg text-gray-500">$</span>
                    <input type="number" id="custom-amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full pl-7 pr-3 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-brand-green focus:border-brand-green bg-white text-brand-gray" placeholder="50" min="1"/>
                </div>
              </div>

              {stripePromise && clientSecret ? (
                <Elements options={stripeOptions} stripe={stripePromise} key={clientSecret}>
                  <PaymentForm
                    onSuccess={handlePaymentSuccess}
                    content={content}
                    amount={amount}
                    formData={formData}
                    onFormChange={handleFormChange}
                  />
                </Elements>
              ) : (
                 <div className="flex items-center justify-center p-8 border-t mt-8">
                    <Spinner /> <span className="ml-2 text-brand-gray">Loading Payment Form...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DonatePage;