import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  organization: string;
  job_title: string;
  phone: string;
  timezone: string;
  bio: string;
  location: string;
  website: string;
  preferences: any;
}

const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'India (IST)', value: 'Asia/Kolkata' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'New York (EST)', value: 'America/New_York' },
  { label: 'Chicago (CST)', value: 'America/Chicago' },
  { label: 'Los Angeles (PST)', value: 'America/Los_Angeles' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
];

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({ totalLogs: 0, totalServers: 0, totalKeys: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data } = await insforgeClient.database
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
      } else {
        // Init empty profile
        setProfile({
          id: user.id, full_name: '', avatar_url: '', organization: '',
          job_title: '', phone: '', timezone: 'Asia/Kolkata',
          bio: '', location: '', website: '', preferences: {}
        });
      }
    } catch {
      setProfile({
        id: user.id, full_name: '', avatar_url: '', organization: '',
        job_title: '', phone: '', timezone: 'Asia/Kolkata',
        bio: '', location: '', website: '', preferences: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      // 1. Get this user's connection keys
      const { data: keys } = await insforgeClient.database
        .from('connection_keys')
        .select('id')
        .eq('user_id', user.id);

      const keysCount = keys?.length || 0;
      if (keysCount === 0) {
        setStats({ totalLogs: 0, totalServers: 0, totalKeys: 0 });
        return;
      }

      const keyIds = keys!.map(k => k.id);

      // 2. Count servers linked to these keys
      const { data: servers } = await insforgeClient.database
        .from('servers')
        .select('id')
        .in('connection_key_id', keyIds);

      const serversCount = servers?.length || 0;
      const serverIds = (servers || []).map(s => s.id);

      // 3. Count logs belonging to these servers
      let logsCount = 0;
      if (serverIds.length > 0) {
        // PostgREST head:true returns the count in the Range header or 'count' field
        const { count } = await insforgeClient.database
          .from('logs')
          .select('*', { count: 'exact', head: true })
          .in('server_id', serverIds);
        logsCount = count || 0;
      }

      setStats({ totalLogs: logsCount, totalServers: serversCount, totalKeys: keysCount });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        full_name: profile.full_name, organization: profile.organization,
        job_title: profile.job_title, phone: profile.phone,
        timezone: profile.timezone, bio: profile.bio,
        location: profile.location, website: profile.website,
        preferences: profile.preferences,
      };
      // Try upsert first; some backends don't have all columns — catch gracefully
      const { error: e } = await insforgeClient.database
        .from('user_profiles')
        .upsert({ id: user!.id, ...payload });
      if (e) throw e;
      setSuccess('Profile saved successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${user.id}.${ext}`;

      // Correct insforge storage API: storage.from(bucket).upload(path, file)
      const { data: storageData, error: storageErr } = await insforgeClient.storage
        .from('avatars')
        .upload(path, file);

      if (storageErr) throw storageErr;
      const avatarUrl = storageData?.url || '';
      if (!avatarUrl) throw new Error('Upload succeeded but no URL returned');

      // Save URL to profile
      await insforgeClient.database
        .from('user_profiles')
        .upsert({ id: user.id, avatar_url: avatarUrl });

      setProfile(p => p ? { ...p, avatar_url: avatarUrl } : p);
      setSuccess('Avatar updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError('Avatar upload failed: ' + (err.message || 'unknown error'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const up = (key: keyof UserProfile, val: string) =>
    setProfile(p => p ? { ...p, [key]: val } : p);

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-full"><div className="text-blue-400 animate-pulse font-mono">Loading profile...</div></div></Layout>;
  }

  if (!profile) return null;

  const initials = profile.full_name ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : (user?.email?.[0] || '?').toUpperCase();

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">Profile</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your account information and preferences</p>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-sm">✓ {success}</div>}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Logs', value: stats.totalLogs.toLocaleString(), icon: '📊', color: 'text-blue-400' },
            { label: 'Servers', value: stats.totalServers, icon: '🖥️', color: 'text-emerald-400' },
            { label: 'API Keys', value: stats.totalKeys, icon: '🔑', color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/60 border border-blue-500/10 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 font-mono uppercase">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main profile card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-blue-500/10 rounded-xl p-8">
          {/* Avatar + Identity */}
          <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-black text-white overflow-hidden border-4 border-blue-500/20 shadow-xl">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : initials}
              </div>
              {/* Upload overlay */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-bold"
              >
                {uploadingAvatar ? '⟳' : '📷'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-slate-900 rounded-full" title="Online" />
            </div>

            {/* Name + email */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{profile.full_name || 'Your Name'}</h2>
              <p className="text-blue-400 font-mono text-sm">{profile.job_title || 'Role not set'}</p>
              <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
              {profile.organization && <p className="text-slate-400 text-sm mt-0.5">🏢 {profile.organization}</p>}
              {profile.location && <p className="text-slate-400 text-sm">📍 {profile.location}</p>}
            </div>

            {/* Edit / Save button */}
            <div>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold text-sm transition-all">
                  ✏️ Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={saving}
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg font-bold text-sm transition-all">
                    {saving ? 'Saving…' : '✓ Save'}
                  </button>
                  <button onClick={() => { setEditing(false); fetchProfile(); }}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm transition-all">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { label: 'Full Name', key: 'full_name' as const, type: 'text', placeholder: 'John Doe' },
              { label: 'Job Title', key: 'job_title' as const, type: 'text', placeholder: 'Security Engineer' },
              { label: 'Organization', key: 'organization' as const, type: 'text', placeholder: 'Acme Corp' },
              { label: 'Phone', key: 'phone' as const, type: 'tel', placeholder: '+91 98765 43210' },
              { label: 'Location', key: 'location' as const, type: 'text', placeholder: 'Mumbai, India' },
              { label: 'Website', key: 'website' as const, type: 'url', placeholder: 'https://yoursite.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={(profile as any)[f.key] || ''}
                  onChange={e => up(f.key, e.target.value)}
                  disabled={!editing}
                  placeholder={f.placeholder}
                  className="w-full bg-black/40 border border-blue-500/15 rounded-lg py-2.5 px-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-default"
                />
              </div>
            ))}

            {/* Timezone */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Timezone</label>
              <select
                value={profile.timezone || 'Asia/Kolkata'}
                onChange={e => up('timezone', e.target.value)}
                disabled={!editing}
                className="w-full bg-black/40 border border-blue-500/15 rounded-lg py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-default"
              >
                {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email (Account)</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-black/20 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-slate-500 cursor-default"
              />
            </div>
          </div>

          {/* Bio — full width */}
          <div className="mt-5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bio</label>
            <textarea
              value={profile.bio || ''}
              onChange={e => up('bio', e.target.value)}
              disabled={!editing}
              rows={3}
              placeholder="A short bio about yourself..."
              className="w-full bg-black/40 border border-blue-500/15 rounded-lg py-2.5 px-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all resize-none disabled:opacity-50 disabled:cursor-default"
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h3>
          <p className="text-sm text-slate-400 mb-4">Logging out will end your current session.</p>
          <button
            onClick={logout}
            className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg font-bold text-sm text-red-400 transition-all"
          >
            ⏻ Logout
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
