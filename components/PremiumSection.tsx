'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Premium Features Section
 * Showcases upcoming premium features with "Coming Soon" status
 */
export function PremiumSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) return;

    const stored = localStorage.getItem('fueille_waitlist');
    const list: string[] = stored ? (JSON.parse(stored) as string[]) : [];

    if (list.includes(email)) {
      setAlreadyRegistered(true);
    } else {
      list.push(email);
      localStorage.setItem('fueille_waitlist', JSON.stringify(list));
      setSubmitted(true);
    }
  };

  const premiumFeatures = [
    {
      icon: '☁️',
      title: 'Cloud Sync',
      description: 'Sync your plants across all devices automatically',
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Track growth patterns and care trends over time',
    },
    {
      icon: '🔔',
      title: 'Smart Reminders',
      description: 'AI-powered care suggestions based on plant health',
    },
    {
      icon: '👥',
      title: 'Plant Sharing',
      description: 'Share plants and care schedules with family',
    },
    {
      icon: '📚',
      title: 'Plant Library',
      description: 'Access detailed care guides for thousands of species',
    },
    {
      icon: '🎨',
      title: 'Custom Themes',
      description: 'Personalize your app with premium themes and layouts',
    },
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Premium Features</h2>
          <p className="text-base text-muted-foreground">
            Enhanced features coming soon to help you care for your plants even better
          </p>
        </div>
        <div className="px-4 py-2 neu-pressed rounded-lg">
          <span className="text-sm font-semibold gradient-text whitespace-nowrap">Coming Soon</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {premiumFeatures.map((feature) => (
          <Card
            key={feature.title}
            className="p-5 neu-flat opacity-75 hover:opacity-90 transition-opacity"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 neu-pressed rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-8 text-center neu-raised">
        <h3 className="text-xl font-bold mb-3">Want early access?</h3>
        <p className="text-base text-muted-foreground mb-5">
          Be the first to know when premium features launch
        </p>
        {alreadyRegistered ? (
          <p className="text-base font-medium">You&apos;re already on the list! 🌿</p>
        ) : submitted ? (
          <p className="text-base font-medium">You&apos;re on the list! We&apos;ll be in touch. 🌿</p>
        ) : (
          <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-3 neu-pressed rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <Button type="submit" size="lg" className="whitespace-nowrap">
              Join Waitlist
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
