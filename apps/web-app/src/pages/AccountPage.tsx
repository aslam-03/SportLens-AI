import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';

export default function Account() {
  const { user } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [profile, setProfile] = useState({
    name: user?.displayName || 'User',
    email: user?.email || '',
    sport: 'Cricket',
    level: 'Intermediate',
  });

  const [preferences, setPreferences] = useState([
    { id: 'email', label: 'Email Notifications', value: 'enabled', editable: true },
    { id: 'privacy', label: 'Privacy Mode', value: 'disabled', editable: true },
    { id: 'data', label: 'Data Sharing', value: 'enabled', editable: true },
  ]);

  const togglePreference = (id: string) => {
    setPreferences(prefs => 
      prefs.map(pref => 
        pref.id === id 
          ? { ...pref, value: pref.value === 'enabled' ? 'disabled' : 'enabled' }
          : pref
      )
    );
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    // TODO: Implement actual account deletion
    console.log('Account deletion requested');
  };

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
                <Button 
                  variant="primary" 
                  size="md"
                  onClick={() => setIsEditingProfile(true)}
                >
                  Edit Profile
                </Button>
              </div>
            </div>
          </Card>

          {/* Preferences Section */}
          <Card variant="elevated" className="p-8">
            <h2 className="text-xl font-semibold mb-6">Preferences</h2>
            <div className="space-y-4">
              {preferences.map((pref) => (
                <div key={pref.id} className="flex items-center justify-between py-4 border-b border-navy-700 last:border-0">
                  <div>
                    <p className="font-medium">{pref.label}</p>
                    <Badge variant="default" size="sm">
                      {pref.value}
                    </Badge>
                  </div>
                  {pref.editable && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => togglePreference(pref.id)}
                    >
                      <Icons.Settings size="md" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Danger Zone */}
          <Card variant="outlined" className="p-8 mt-8 border-error-600/50">
            <h2 className="text-xl font-semibold mb-6 text-error-500">Danger Zone</h2>
            <Button 
              variant="danger" 
              size="md"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          </Card>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title="Delete Account?"
          >
            <div className="space-y-4">
              <p className="text-text-secondary">
                Are you sure you want to delete your account? This action cannot be undone.
                All your sessions and data will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </Modal>

          {/* Edit Profile Modal */}
          <Modal
            isOpen={isEditingProfile}
            onClose={() => setIsEditingProfile(false)}
            title="Edit Profile"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sport</label>
                <select
                  value={profile.sport}
                  onChange={(e) => setProfile({ ...profile, sport: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Cricket">Cricket</option>
                  <option value="Baseball">Baseball</option>
                  <option value="Golf">Golf</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Fitness">Fitness</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsEditingProfile(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setIsEditingProfile(false);
                    console.log('Profile updated:', profile);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>
        </motion.div>
      </div>
    </AppShell>
  );
}
