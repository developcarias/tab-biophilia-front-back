import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import { useI18n } from '../i18n';
import { DonatePageContent } from '../types';
import Spinner from './icons/Spinner';

interface PaymentFormProps {
    onSuccess: () => void;
    content: DonatePageContent;
    amount: number;
    formData: { firstName: string; lastName: string; emailAddress: string };
    onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, content, amount, formData, onFormChange }) => {
    const { language } = useI18n();
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            return;
        }

        setIsProcessing(true);
        setMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}${window.location.pathname}#/donate`,
            },
            redirect: 'if_required'
        });

        if (error) {
            const errorMessage = error.type === "card_error" || error.type === "validation_error" ? error.message : "An unexpected error occurred.";
            setMessage(errorMessage);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess();
        } else {
            setMessage("Payment is processing.");
        }

        setIsProcessing(false);
    };

    const paymentElementOptions: StripePaymentElementOptions = {
        layout: "tabs",
    };

    const renderTextWithAmount = (text: string, value: number) => {
        return text.replace('{{amount}}', String(value));
    }

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-bold text-brand-gray mb-1" htmlFor="firstName">{content.form?.firstName?.[language] || 'First Name'}</label>
                    <input type="text" id="firstName" required value={formData.firstName} onChange={onFormChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-brand-green focus:border-brand-green bg-white text-brand-gray" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-brand-gray mb-1" htmlFor="lastName">{content.form?.lastName?.[language] || 'Last Name'}</label>
                    <input type="text" id="lastName" required value={formData.lastName} onChange={onFormChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-brand-green focus:border-brand-green bg-white text-brand-gray" />
                </div>
            </div>
            <div className="mb-8">
                <label className="block text-sm font-bold text-brand-gray mb-1" htmlFor="emailAddress">{content.form?.emailAddress?.[language] || 'Email Address'}</label>
                <input type="email" id="emailAddress" required value={formData.emailAddress} onChange={onFormChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-brand-green focus:border-brand-green bg-white text-brand-gray" />
            </div>

            {/* Payment Details */}
            <div className="mb-6">
                <label className="block text-lg font-semibold text-brand-green-dark mb-3">{content.form?.paymentPlaceholder?.[language] || 'Payment Information'}</label>
                <div className="border p-4 rounded-md bg-gray-50">
                    <PaymentElement id="payment-element" options={paymentElementOptions} />
                </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
                <button disabled={isProcessing || !stripe || !elements} id="submit" className="w-full bg-brand-accent text-white font-bold text-xl py-4 rounded-lg hover:bg-brand-accent/90 transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center">
                    <span id="button-text">
                        {isProcessing ? (
                            <div className="flex items-center">
                                <Spinner />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            renderTextWithAmount(content.form?.donateAmount?.[language] || 'Donate ${{amount}}', amount)
                        )}
                    </span>
                </button>
                {message && <div id="payment-message" className="text-red-500 mt-4 text-center">{message}</div>}
            </div>
        </form>
    );
}

export default PaymentForm;