import React, { useState, useEffect } from 'react';
import { Building2, Globe, Users, Plus, Edit2, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUpload } from './ImageUpload';

interface Client {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  created_at: string;
  owner_id: string;
}

interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'user';
  created_at: string;
  users?: {
    email: string;
  };
}

export function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientUsers, setClientUsers] = useState<Record<string, ClientUser[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showInviteForm, setShowInviteForm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    website: ''
  });

  useEffect(() => {
    fetchData();

    const channels = [
      supabase.channel('clients_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clients' },
          () => fetchData()
        )
        .subscribe(),
      
      supabase.channel('client_users_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'client_users' },
          () => fetchData()
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const [clientsResponse, usersResponse] = await Promise.all([
        supabase
          .from('clients')
          .select('*')
          .order('name'),
        supabase
          .from('client_users')
          .select('*, users:user_id(email)')
          .order('created_at')
      ]);

      if (clientsResponse.error) throw clientsResponse.error;
      if (usersResponse.error) throw usersResponse.error;

      setClients(clientsResponse.data || []);
      
      // Group users by client
      const usersByClient = (usersResponse.data || []).reduce((acc, user) => {
        if (!acc[user.client_id]) {
          acc[user.client_id] = [];
        }
        acc[user.client_id].push(user);
        return acc;
      }, {} as Record<string, ClientUser[]>);
      
      setClientUsers(usersByClient);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      if (selectedClient) {
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', selectedClient.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            ...formData,
            owner_id: userData.user.id
          })
          .select()
          .single();

        if (error) throw error;

        // Add owner as first user
        const { error: userError } = await supabase
          .from('client_users')
          .insert({
            client_id: data.id,
            user_id: userData.user.id,
            role: 'owner'
          });

        if (userError) throw userError;
      }

      setShowForm(false);
      setSelectedClient(null);
      setFormData({
        name: '',
        logo: '',
        website: ''
      });
    } catch (err) {
      console.error('Error saving client:', err);
      setError('Failed to save client');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated data.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting client:', err);
      setError('Failed to delete client');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInviteForm) return;

    try {
      // First check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          throw new Error('User not found. Please ask them to register first.');
        }
        throw userError;
      }

      // Add user to client
      const { error } = await supabase
        .from('client_users')
        .insert({
          client_id: showInviteForm,
          user_id: userData.id,
          role: inviteRole
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('User is already a member of this client');
        }
        throw error;
      }

      setShowInviteForm(null);
      setInviteEmail('');
      setInviteRole('user');
    } catch (err) {
      console.error('Error inviting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    }
  };

  const removeUser = async (clientId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('client_id', clientId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (err) {
      console.error('Error removing user:', err);
      setError('Failed to remove user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-indigo-400" />
          <h2 className="text-2xl font-bold">Client Management</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-100 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {showForm ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Logo</label>
              <ImageUpload
                currentImage={formData.logo}
                onImageSelect={(base64) => setFormData(prev => ({ ...prev, logo: base64 }))}
                onImageRemove={() => setFormData(prev => ({ ...prev, logo: '' }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                placeholder="https://"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedClient(null);
                  setFormData({
                    name: '',
                    logo: '',
                    website: ''
                  });
                }}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 transition-colors"
              >
                {selectedClient ? 'Update' : 'Create'} Client
              </button>
            </div>
          </form>
        </div>
      ) : clients.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map(client => (
            <div
              key={client.id}
              className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  {client.logo ? (
                    <img
                      src={client.logo}
                      alt={client.name}
                      className="h-12 object-contain rounded bg-white/10 p-2"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-indigo-400" />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setFormData({
                          name: client.name,
                          logo: client.logo || '',
                          website: client.website || ''
                        });
                        setShowForm(true);
                      }}
                      className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                      title="Edit client"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
                      title="Delete client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2">{client.name}</h3>

                <div className="space-y-2 text-white/60">
                  {client.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                      >
                        {new URL(client.website).hostname}
                      </a>
                    </div>
                  )}
                </div>

                {/* Users Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Users
                    </h4>
                    <button
                      onClick={() => setShowInviteForm(client.id)}
                      className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded transition-colors"
                    >
                      <UserPlus className="h-3 w-3" />
                      Invite User
                    </button>
                  </div>

                  {showInviteForm === client.id && (
                    <form onSubmit={handleInvite} className="mb-4 space-y-4 bg-black/20 rounded-lg p-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}
                          className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                          required
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowInviteForm(null);
                            setInviteEmail('');
                            setInviteRole('user');
                          }}
                          className="px-3 py-1 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 transition-colors text-sm"
                        >
                          Invite
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {clientUsers[client.id]?.map(user => (
                      <div 
                        key={user.id}
                        className="flex items-center justify-between bg-black/20 rounded p-2"
                      >
                        <div>
                          <div className="font-medium">{user.users?.email}</div>
                          <div className="text-xs text-white/60 capitalize">{user.role}</div>
                        </div>

                        {user.role !== 'owner' && (
                          <button
                            onClick={() => removeUser(client.id, user.user_id)}
                            className="p-1 rounded bg-red-600 hover:bg-red-500 transition-colors"
                            title="Remove user"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-white/60">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No clients found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}