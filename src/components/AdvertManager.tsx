import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, Image as ImageIcon, Layout, Plus, Edit2, Trash2, Trophy, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUpload } from './ImageUpload';

interface Advertisement {
  id: string;
  name: string;
  type: 'banner' | 'overlay' | 'sponsor';
  content: string;
  start_date: string;
  end_date: string;
  active: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  tournament_id?: string;
  created_at: string;
}

interface Tournament {
  id: string;
  name: string;
}

export function AdvertManager() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'banner' as const,
    content: '',
    start_date: '',
    end_date: '',
    active: true,
    position: 'top' as const,
    tournament_id: ''
  });

  useEffect(() => {
    fetchData();

    const channels = [
      supabase.channel('advertisements_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'advertisements' },
          () => fetchData()
        )
        .subscribe(),
      
      supabase.channel('tournaments_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournaments' },
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
      setError(null);
      const [adsResponse, tournamentsResponse] = await Promise.all([
        supabase.from('advertisements').select('*').order('created_at', { ascending: false }),
        supabase.from('tournaments').select('id, name').order('start_date', { ascending: false })
      ]);

      if (adsResponse.error) throw adsResponse.error;
      if (tournamentsResponse.error) throw tournamentsResponse.error;

      setAds(adsResponse.data || []);
      setTournaments(tournamentsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      throw new Error('Advertisement name is required');
    }
    if (!formData.content.trim()) {
      throw new Error('Advertisement content (image) is required');
    }
    if (!formData.start_date) {
      throw new Error('Start date is required');
    }
    if (!formData.end_date) {
      throw new Error('End date is required');
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      throw new Error('End date must be after start date');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Validate form data
      validateForm();

      const adData = {
        ...formData,
        tournament_id: formData.tournament_id || null
      };

      if (selectedAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', selectedAd.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert(adData);

        if (error) throw error;
      }

      setShowForm(false);
      setSelectedAd(null);
      setFormData({
        name: '',
        type: 'banner',
        content: '',
        start_date: '',
        end_date: '',
        active: true,
        position: 'top',
        tournament_id: ''
      });
      
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error saving advertisement:', err);
      setError(err instanceof Error ? err.message : 'Failed to save advertisement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setAds(prev => prev.filter(ad => ad.id !== id));
    } catch (err) {
      console.error('Error deleting advertisement:', err);
      setError('Failed to delete advertisement');
    }
  };

  const toggleActive = async (ad: Advertisement) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('advertisements')
        .update({ active: !ad.active })
        .eq('id', ad.id);

      if (error) throw error;
      
      // Update local state
      setAds(prev => prev.map(a => 
        a.id === ad.id ? { ...a, active: !a.active } : a
      ));
    } catch (err) {
      console.error('Error toggling advertisement:', err);
      setError('Failed to update advertisement status');
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
          <Megaphone className="h-6 w-6 text-rose-400" />
          <h2 className="text-2xl font-bold">Advertisement Management</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Advertisement
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-100 px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {showForm ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Advertisement Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'banner' | 'overlay' | 'sponsor' }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                  required
                >
                  <option value="banner">Banner</option>
                  <option value="overlay">Overlay</option>
                  <option value="sponsor">Sponsor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Position</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value as 'top' | 'bottom' | 'left' | 'right' }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                  required
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Content (Image)</label>
              <ImageUpload
                currentImage={formData.content}
                onImageSelect={(base64) => setFormData(prev => ({ ...prev, content: base64 }))}
                onImageRemove={() => setFormData(prev => ({ ...prev, content: '' }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tournament (Optional)</label>
              <select
                value={formData.tournament_id}
                onChange={(e) => setFormData(prev => ({ ...prev, tournament_id: e.target.value }))}
                className="w-full bg-white/10 rounded-lg p-2 border border-white/20"
              >
                <option value="">Select a tournament</option>
                {tournaments.map(tournament => (
                  <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="rounded"
              />
              <span>Active</span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedAd(null);
                  setFormData({
                    name: '',
                    type: 'banner',
                    content: '',
                    start_date: '',
                    end_date: '',
                    active: true,
                    position: 'top',
                    tournament_id: ''
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
                {selectedAd ? 'Update' : 'Create'} Advertisement
              </button>
            </div>
          </form>
        </div>
      ) : ads.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map(ad => {
            const tournament = tournaments.find(t => t.id === ad.tournament_id);
            
            return (
              <div
                key={ad.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    {ad.content ? (
                      <img
                        src={ad.content}
                        alt={ad.name}
                        className="h-12 object-contain rounded bg-white/10 p-2"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-rose-400" />
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(ad)}
                        className={`p-2 rounded-lg transition-colors ${
                          ad.active 
                            ? 'bg-green-600 hover:bg-green-500' 
                            : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                        title={ad.active ? 'Deactivate' : 'Activate'}
                      >
                        {ad.active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAd(ad);
                          setFormData({
                            name: ad.name,
                            type: ad.type,
                            content: ad.content,
                            start_date: ad.start_date,
                            end_date: ad.end_date,
                            active: ad.active,
                            position: ad.position,
                            tournament_id: ad.tournament_id || ''
                          });
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                        title="Edit advertisement"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ad.id)}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
                        title="Delete advertisement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-2">{ad.name}</h3>

                  <div className="space-y-2 text-white/60">
                    <div className="flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      <span className="capitalize">{ad.type} • {ad.position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(ad.start_date).toLocaleDateString()} - {new Date(ad.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    {tournament && (
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        <span>{tournament.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-white/60">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No advertisements found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}