import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { supabase } from '../lib/supabase.js';
import { getMyTeam, createTeam, getTeamMembers, inviteMember, removeMember, updateMemberRole, updateTeamName } from '../api/teams.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'admin',       label: 'Admin',       desc: 'Can manage all members and sessions',    color: 'red' },
  { value: 'interviewer', label: 'Interviewer',  desc: 'Can create and view own sessions', color: 'blue' },
  { value: 'viewer',      label: 'Viewer',    desc: 'Read only — no edit access',    color: 'gray' },
];

const roleColor = { admin: 'red', interviewer: 'blue', viewer: 'gray' };
const roleLabel = { admin: 'Admin', interviewer: 'Interviewer', viewer: 'Viewer' };
const statusColor = { pending: 'yellow', active: 'green' };
const statusLabel = { pending: 'Invitation Sent', active: 'Active' };

export default function TeamPage() {
  const { user } = useAuthStore();
  const { subscription } = useBillingStore();
  const isOrgPlan = subscription?.plan === 'pro' || subscription?.plan === 'biz';
  const ORG_SEAT_LIMIT = subscription?.plan === 'biz' ? 20 : 5;
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('interviewer');
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const t = await getMyTeam(user.id);
      setTeam(t);
      if (t) {
        const m = await getTeamMembers(t.id);
        setMembers(m);
      }
    } catch {
      toast.error('Failed to load team information.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      const t = await createTeam(user.id, teamName.trim());
      setTeam(t);
      setMembers([]);
      toast.success('Team created successfully!');
    } catch {
      toast.error('Failed to create team.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      const updated = await updateTeamName(team.id, newName.trim());
      setTeam(updated);
      setEditingName(false);
      toast.success('Team name updated.');
    } catch {
      toast.error('Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (members.some(m => m.email === inviteEmail.trim())) {
      toast.error('This email has already been invited.');
      return;
    }
    setInviting(true);
    try {
      const m = await inviteMember(team.id, user.id, inviteEmail.trim(), inviteRole);
      setMembers(prev => [...prev, m]);

      // Send invite email (best-effort, non-blocking)
      const { data: { session } } = await supabase.auth.getSession();
      fetch('/api/team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ teamName: team.name, inviteeEmail: inviteEmail.trim(), role: inviteRole }),
      }).catch(() => {});

      setInviteModal(false);
      setInviteEmail('');
      setInviteRole('interviewer');
      toast.success(`Invitation email sent to ${inviteEmail}.`);
    } catch {
      toast.error('Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id, email) => {
    if (!window.confirm(`Remove ${email} from the team?`)) return;
    setRemoving(id);
    try {
      await removeMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success('Member removed from team.');
    } catch {
      toast.error('Failed to remove member.');
    } finally {
      setRemoving(null);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const updated = await updateMemberRole(memberId, newRole);
      setMembers(prev => prev.map(m => m.id === memberId ? updated : m));
      toast.success('Role updated.');
    } catch {
      toast.error('Failed to update role.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Team" />
        <div className="flex-1 p-6"><div className="max-w-2xl mx-auto space-y-4">{[1,2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Team Management" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Org plan capacity banner */}
          {isOrgPlan && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900">Organisation Plan</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {members.filter(m => m.status === 'accepted').length}/{ORG_SEAT_LIMIT} member seats · 100 sessions/member/month
                </p>
              </div>
              {members.filter(m => m.status === 'accepted').length >= ORG_SEAT_LIMIT && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                  Member Limit Reached
                </span>
              )}
            </div>
          )}

          {!team ? (
            /* Create team */
            <div className="bg-white rounded-xl border p-8 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Create Your Team</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                Invite colleagues to collaborate. Manage roles and access from one place.
              </p>
              <form onSubmit={handleCreateTeam} className="flex gap-3 max-w-sm mx-auto">
                <Input
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="Team / department name"
                  required
                  className="flex-1"
                />
                <Button type="submit" loading={creating}>Create</Button>
              </form>
            </div>
          ) : (
            <>
              {/* Team header */}
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-4">
                  {editingName ? (
                    <form onSubmit={handleSaveName} className="flex gap-2 flex-1 mr-4">
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <Button type="submit" size="sm" loading={savingName}>Save</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setEditingName(false)}>Cancel</Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{team.name}</h2>
                        <p className="text-xs text-gray-400">Created {format(new Date(team.created_at), 'dd MMM yyyy')}</p>
                      </div>
                      <button onClick={() => { setNewName(team.name); setEditingName(true); }} className="text-xs text-gray-400 hover:text-blue-600 ml-2">Edit</button>
                    </div>
                  )}
                  <Button onClick={() => setInviteModal(true)}>+ Invite Member</Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{members.length}</p>
                    <p className="text-xs text-gray-500">Members invited</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{members.filter(m => m.status === 'active').length}</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{members.filter(m => m.status === 'pending').length}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>

              {/* Role explanation */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">Team Member Roles</p>
                <div className="space-y-1.5">
                  {ROLES.map(r => (
                    <div key={r.value} className="flex items-center gap-2">
                      <Badge color={r.color} className="text-xs w-24 justify-center">{r.label}</Badge>
                      <p className="text-xs text-blue-800">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Member list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Team Members ({members.length})
                </h3>
                {members.length === 0 ? (
                  <div className="text-center py-10 bg-white border rounded-xl text-gray-400">
                    <p className="text-sm">No members yet. Click "Invite Member" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Owner row */}
                    <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-gray-600">{user?.email?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                        <p className="text-xs text-gray-400">Account owner</p>
                      </div>
                      <Badge color="red" className="text-xs">Admin</Badge>
                    </div>

                    {members.map(m => (
                      <div key={m.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-indigo-600">{m.email.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.email}</p>
                          <p className="text-xs text-gray-400">{format(new Date(m.created_at), 'dd MMM yyyy')}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge color={statusColor[m.status] || 'gray'} className="text-xs">{statusLabel[m.status] || m.status}</Badge>
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <button
                            onClick={() => handleRemove(m.id, m.email)}
                            disabled={removing === m.id}
                            className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 px-1.5 py-1 rounded hover:bg-red-50"
                          >
                            {removing === m.id ? '...' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Member Team">
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Member Email"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="rakan@organisasi.com"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${inviteRole === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" value={r.value} checked={inviteRole === r.value} onChange={() => setInviteRole(r.value)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.label}</p>
                    <p className="text-xs text-gray-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            Share the <strong>verirec.app</strong> link with the invited member to register using the same email.
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setInviteModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={inviting}>Send Invitation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
