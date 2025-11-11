'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Premium Features Section
 * Showcases upcoming premium features with "Coming Soon" status
 */
export function PremiumSection() {
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
    <div className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Premium Features</h2>
          <p className="text-base text-muted-foreground">
            Enhanced features coming soon to help you care for your plants even better
          </p>
        </div>
        <div className="px-4 py-2 neu-pressed rounded-lg">
          <span className="text-sm font-semibold gradient-text">Coming Soon</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      <Card className="mt-6 p-8 text-center neu-raised">
        <h3 className="text-xl font-bold mb-3">Want early access?</h3>
        <p className="text-base text-muted-foreground mb-5">
          Be the first to know when premium features launch
        </p>
        <Button size="lg" disabled className="opacity-50 cursor-not-allowed">
          Join Waitlist (Coming Soon)
        </Button>
      </Card>
    </div>
  );
}
