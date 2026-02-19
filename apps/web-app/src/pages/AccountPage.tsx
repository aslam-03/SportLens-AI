/**
 * Account Settings Page
 * 
 * Firestore Schema (users/{uid}):
 * {
 *   name: string,
 *   email: string,
 *   createdAt: ISO timestamp,
 *   updatedAt: ISO timestamp
 * }
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/firebase';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export default function Account() {
  const { user } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
  });

  // Load profile data from Firebase
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      // Set basic user data from Firebase Auth
      setProfile(prev => ({
        ...prev,
        name: user.displayName || '',
        email: user.email || '',
      }));

      // Load additional profile data from Firestore
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(prev => ({
            ...prev,
            name: data.name || user.displayName || '',
          }));
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };

    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      // Update Firebase Auth display name
      await updateProfile(user, {
        displayName: profile.name,
      });

      // Check if this is first time saving
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const isFirstSave = !userDoc.exists();

      // Save additional profile data to Firestore
      await setDoc(userDocRef, {
        name: profile.name,
        email: profile.email,
        ...(isFirstSave && { createdAt: new Date().toISOString() }),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
                <p className="text-lg font-medium">{profile.name || 'Not set'}</p>
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
            onClose={() => {
              setIsEditingProfile(false);
              setError(null);
            }}
            title="Edit Profile"
          >
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-error-500/10 border border-error-500/20 rounded-lg">
                  <p className="text-sm text-error-400">{error}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-gray-400 cursor-not-allowed"
                  title="Email cannot be changed"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setIsEditingProfile(false);
                    setError(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSaveProfile}
                  disabled={isSaving || !profile.name.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Modal>
        </motion.div>
      </div>
    </AppShell>
  );
}
