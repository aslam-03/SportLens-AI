import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

export default function Account() {
  const [profile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    sport: 'Cricket',
    level: 'Intermediate',
  });

  const [preferences] = useState([
    { label: 'Email Notifications', value: 'enabled', editable: true },
    { label: 'Privacy Mode', value: 'disabled', editable: true },
    { label: 'Data Sharing', value: 'enabled', editable: true },
  ]);

  return (
    <AppShell>
      <div className="min-h-screen bg-navy-950 text-text-primary">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mx-auto px-4 py-8 max-w-2xl"
        >
          <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

          {/* Profile Section */}
          <Card variant="elevated" className="p-8 mb-8">
            <h2 className="text-xl font-semibold mb-6">Profile</h2>
            <div className="space-y-4">
              <div>
                <p className="text-text-secondary text-sm mb-1">Name</p>
                <p className="text-lg font-medium">{profile.name}</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm mb-1">Email</p>
                <p className="text-lg font-medium">{profile.email}</p>
              </div>
              <div className="flex gap-4 mt-6">
                <Button variant="primary" size="md">
                  Edit Profile
                </Button>
              </div>
            </div>
          </Card>

          {/* Preferences Section */}
          <Card variant="elevated" className="p-8">
            <h2 className="text-xl font-semibold mb-6">Preferences</h2>
            <div className="space-y-4">
              {preferences.map((pref, idx) => (
                <div key={idx} className="flex items-center justify-between py-4 border-b border-navy-700 last:border-0">
                  <div>
                    <p className="font-medium">{pref.label}</p>
                    <Badge variant="default" size="sm">
                      {pref.value}
                    </Badge>
                  </div>
                  {pref.editable && (
                    <Button variant="ghost" size="sm">
                      <Icon name="settings" size="md" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Danger Zone */}
          <Card variant="outlined" className="p-8 mt-8 border-error-600/50">
            <h2 className="text-xl font-semibold mb-6 text-error-500">Danger Zone</h2>
            <Button variant="danger" size="md">
              Delete Account
            </Button>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  );
}
