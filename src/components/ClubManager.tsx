import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Mail, Globe, Plus, Edit2, Trash2, Users, Search, Link, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUpload } from './ImageUpload';

interface UrlMetadata {
  title?: string;
  description?: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Club {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  created_at: string;
}

interface Team {
  id: string;
  club_id: string;
  name: string;
  logo?: string;
  division?: string;
  created_at: string;
}

export function ClubManager() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  });
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    logo: '',
    division: '',
    club_id: ''
  });
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const fetchUrlMetadata = async (url: string) => {
    try {
      setFetchingUrl(true);
      setUrlError(null);

      try {
        new URL(url);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (!data.contents) {
        throw new Error('Failed to fetch website content');
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');

      const metadata: UrlMetadata = {};

      metadata.title = doc.querySelector('title')?.textContent?.trim() ||
                      doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                      doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content');

      metadata.logo = doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                     doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
                     doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                     doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

      if (metadata.logo && !metadata.logo.startsWith('http')) {
        const baseUrl = new URL(url);
        metadata.logo = new URL(metadata.logo, baseUrl.origin).toString();
      }

      const emailLinks = Array.from(doc.querySelectorAll('a[href^="mailto:"]'));
      if (emailLinks.length > 0) {
        metadata.email = emailLinks[0].getAttribute('href')?.replace('mailto:', '');
      }

      const phoneLinks = Array.from(doc.querySelectorAll('a[href^="tel:"]'));
      if (phoneLinks.length > 0) {
        metadata.phone = phoneLinks[0].getAttribute('href')?.replace('tel:', '');
      }

      const addressSchema = doc.querySelector('[itemtype="http://schema.org/PostalAddress"]');
      if (addressSchema) {
        const streetAddress = addressSchema.querySelector('[itemprop="streetAddress"]')?.textContent;
        const locality = addressSchema.querySelector('[itemprop="addressLocality"]')?.textContent;
        const region = addressSchema.querySelector('[itemprop="addressRegion"]')?.textContent;
        const postalCode = addressSchema.querySelector('[itemprop="postalCode"]')?.textContent;
        const country = addressSchema.querySelector('[itemprop="addressCountry"]')?.textContent;

        metadata.address = [streetAddress, locality, region, postalCode, country]
          .filter(Boolean)
          .join(', ');
      }

      setFormData(prev => ({
        ...prev,
        name: metadata.title || prev.name,
        logo: metadata.logo || prev.logo,
        email: metadata.email || prev.email,
        phone: metadata.phone || prev.phone,
        address: metadata.address || prev.address,
        website: url
      }));

    } catch (err) {
      console.error('Error fetching URL metadata:', err);
      setUrlError(err instanceof Error ? err.message : 'Failed to fetch website information');
    } finally {
      setFetchingUrl(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channels = [
      supabase.channel('clubs_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clubs' },
          () => fetchData()
        )
        .subscribe(),
      
      supabase.channel('teams_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'teams' },
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
      const [clubsResponse, teamsResponse] = await Promise.all([
        supabase.from('clubs').select('*').order('name'),
        supabase.from('teams').select('*').order('name')
      ]);

      if (clubsResponse.error) throw clubsResponse.error;
      if (teamsResponse.error) throw teamsResponse.error;

      setClubs(clubsResponse.data || []);
      setTeams(teamsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load clubs and teams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedClub) {
        const { error } = await supabase
          .from('clubs')
          .update(formData)
          .eq('id', selectedClub.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clubs')
          .insert(formData);

        if (error) throw error;
      }

      setShowForm(false);
      setSelectedClub(null);
      setFormData({
        name: '',
        logo: '',
        address: '',
        phone: '',
        email: '',
        website: ''
      });
    } catch (err) {
      console.error('Error saving club:', err);
      setError('Failed to save club');
    }
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedTeam) {
        const { error } = await supabase
          .from('teams')
          .update(teamFormData)
          .eq('id', selectedTeam.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teams')
          .insert(teamFormData);

        if (error) throw error;
      }

      setShowTeamForm(false);
      setSelectedTeam(null);
      setTeamFormData({
        name: '',
        logo: '',
        division: '',
        club_id: ''
      });
    } catch (err) {
      console.error('Error saving team:', err);
      setError('Failed to save team');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this club? This will also delete all associated teams.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting club:', err);
      setError('Failed to delete club');
    }
  };

  const handleTeamDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting team:', err);
      setError('Failed to delete team');
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
          <Building2 className="h-6 w-6 text-rose-400" />
          <h2 className="text-2xl font-bold">Club Management</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Club
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
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-1">Website URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg pl-10 pr-4 py-2 border border-white/20"
                    placeholder="https://example.com"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchUrlMetadata(formData.website)}
                  disabled={fetchingUrl || !formData.website}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    fetchingUrl || !formData.website
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  {fetchingUrl ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      Fetch Info
                    </>
                  )}
                </button>
              </div>
              {urlError && (
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {urlError}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Club Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Club Logo</label>
              <ImageUpload
                currentImage={formData.logo}
                onImageSelect={(base64) => setFormData(prev => ({ ...prev, logo: base64 }))}
                onImageRemove={() => setFormData(prev => ({ ...prev, logo: '' }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedClub(null);
                  setFormData({
                    name: '',
                    logo: '',
                    address: '',
                    phone: '',
                    email: '',
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
                {selectedClub ? 'Update' : 'Create'} Club
              </button>
            </div>
          </form>
        </div>
      ) : showTeamForm ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <form onSubmit={handleTeamSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Club</label>
              <select
                value={teamFormData.club_id}
                onChange={(e) => setTeamFormData(prev => ({ ...prev, club_id: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              >
                <option value="">Select a club</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Team Name</label>
              <input
                type="text"
                value={teamFormData.name}
                onChange={(e) => setTeamFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Team Logo</label>
              <ImageUpload
                currentImage={teamFormData.logo}
                onImageSelect={(base64) => setTeamFormData(prev => ({ ...prev, logo: base64 }))}
                onImageRemove={() => setTeamFormData(prev => ({ ...prev, logo: '' }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Division</label>
              <input
                type="text"
                value={teamFormData.division}
                onChange={(e) => setTeamFormData(prev => ({ ...prev, division: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                placeholder="e.g., 1st Division"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTeamForm(false);
                  setSelectedTeam(null);
                  setTeamFormData({
                    name: '',
                    logo: '',
                    division: '',
                    club_id: ''
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
                {selectedTeam ? 'Update' : 'Create'} Team
              </button>
            </div>
          </form>
        </div>
      ) : clubs.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map(club => {
            const clubTeams = teams.filter(team => team.club_id === club.id);
            
            return (
              <div
                key={club.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    {club.logo ? (
                      <img
                        src={club.logo}
                        alt={club.name}
                        className="h-12 object-contain rounded bg-white/10 p-2"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-rose-400" />
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedClub(club);
                          setFormData({
                            name: club.name,
                            logo: club.logo || '',
                            address: club.address || '',
                            phone: club.phone || '',
                            email: club.email || '',
                            website: club.website || ''
                          });
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                        title="Edit club"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(club.id)}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
                        title="Delete club"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-4">{club.name}</h3>

                  <div className="space-y-2 text-white/60">
                    {club.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{club.address}</span>
                      </div>
                    )}
                    {club.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${club.phone}`} className="hover:text-white transition-colors">
                          {club.phone}
                        </a>
                      </div>
                    )}
                    {club.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${club.email}`} className="hover:text-white transition-colors">
                          {club.email}
                        </a>
                      </div>
                    )}
                    {club.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <a 
                          href={club.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          {new URL(club.website).hostname}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Teams
                      </h4>
                      <button
                        onClick={() => {
                          setTeamFormData(prev => ({ ...prev, club_id: club.id }));
                          setShowTeamForm(true);
                        }}
                        className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Add Team
                      </button>
                    </div>

                    <div className="space-y-2">
                      {clubTeams.map(team => (
                        <div 
                          key={team.id}
                          className="flex items-center justify-between bg-black/20 rounded p-2"
                        >
                          <div className="flex items-center gap-2">
                            {team.logo ? (
                              <img
                                src={team.logo}
                                alt={team.name}
                                className="h-6 w-6 object-contain rounded bg-white/10"
                              />
                            ) : (
                              <Users className="h-4 w-4 text-white/60" />
                            )}
                            <div>
                              <div className="font-medium">{team.name}</div>
                              {team.division && (
                                <div className="text-xs text-white/60">{team.division}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedTeam(team);
                                setTeamFormData({
                                  name: team.name,
                                  logo: team.logo || '',
                                  division: team.division || '',
                                  club_id: team.club_id
                                });
                                setShowTeamForm(true);
                              }}
                              className="p-1 rounded bg-blue-600 hover:bg-blue-500 transition-colors"
                              title="Edit team"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleTeamDelete(team.id)}
                              className="p-1 rounded bg-red-600 hover:bg-red-500 transition-colors"
                              title="Delete team"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {clubTeams.length === 0 && (
                        <div className="text-center py-4 text-white/40">
                          No teams yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-white/60">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No clubs found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}