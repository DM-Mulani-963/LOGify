import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  organization: string;
  timezone: string;
  preferences: any;
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await insforgeClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const { error } = await insforgeClient
        .from('user_profiles')
        .update({
          full_name: profile.full_name,
          organization: profile.organization,
          timezone: profile.timezone,
          preferences: profile.preferences
        })
        .eq('id', user!.id);
      
      if (error) throw error;
      
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-blue-400 animate-pulse">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400">Profile not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">
            Profile Settings
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Manage your account information and preferences
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded text-green-400">
            {success}
          </div>
        )}

        <div className="bg-slate-900/60 backdrop-blur-md border border-blue-500/20 rounded-lg p-8">
          {/* Avatar Section */}
          <div className="mb-8 flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center text-4xl overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                '👤'
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-blue-400">{profile.full_name || 'User'}</h2>
              <p className="text-sm text-slate-400">{user?.email}</p>
              {user?.phone && (
                <p className="text-sm text-slate-500 mt-1">{user.phone}</p>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">FULL NAME</label>
              <input
                type="text"
                value={profile.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                disabled={!editing}
                className="w-full bg-black/40 border border-blue-500/20 rounded py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">ORGANIZATION</label>
              <input
                type="text"
                value={profile.organization || ''}
                onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                disabled={!editing}
                className="w-full bg-black/40 border border-blue-500/20 rounded py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">TIMEZONE</label>
              <select
                value={profile.timezone || 'UTC'}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                disabled={!editing}
                className="w-full bg-black/40 border border-blue-500/20 rounded py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Kolkata">India</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded font-bold text-sm tracking-wider transition-all"
              >
                EDIT PROFILE
              </button>
            ) : (
              <>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded font-bold text-sm tracking-wider transition-all disabled:opacity-50"
                >
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    fetchProfile();
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm tracking-wider transition-all"
                >
                  CANCEL
                </button>
              </>
            )}
          </div>

          {/* Danger Zone */}
          <div className="mt-12 pt-8 border-t border-red-500/20">
            <h3 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
            <p className="text-sm text-slate-400 mb-4">
              Logging out will end your current session. You'll need to log in again to access your account.
            </p>
            <button
              onClick={logout}
              className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded font-bold text-sm text-red-400 transition-all"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
