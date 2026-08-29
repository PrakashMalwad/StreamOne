const express = require('express');
const cors = require('cors');
const ytSearch = require('yt-search');
const mongoose = require('mongoose'); 
const app = express();
app.use(cors());
app.use(express.json());
const MONGO_URI = 'mongodb+srv://978742ravi:dsAJ6VjKJ0YBtFEP@cluster0.buuzm.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Track Schema (Used for both Favorites and inside Playlists)
const trackSchema = new mongoose.Schema({
  id: String,
  name: String,
  artist_name: String,
  image: String,
  duration: Number
});

// NEW: Playlist Schema
const playlistSchema = new mongoose.Schema({
  name: String,
  tracks: [trackSchema] // An array of tracks!
});

const Favorite = mongoose.model('Favorite', trackSchema);
const Playlist = mongoose.model('Playlist', playlistSchema);

// --- API ROUTES ---

// Search YouTube
app.get('/api/tracks', async (req, res) => {
  try {
    const userQuery = req.query.q || 'top pop songs'; 
    const query = `${userQuery} official audio`; 
    
    const result = await ytSearch(query);
    const videos = result.videos.slice(0, 20);
    
    const tracks = videos.map(video => ({
      id: video.videoId, name: video.title, artist_name: video.author.name, image: video.thumbnail, duration: video.seconds
    }));
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});
// --- NEW: DELETE ROUTES ---

// 1. Delete an entire Playlist
app.delete('/api/playlists/:id', async (req, res) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// 2. Remove a track from a specific Playlist
app.delete('/api/playlists/:playlistId/tracks/:trackId', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    // Filter out the song they want to remove
    playlist.tracks = playlist.tracks.filter(t => t.id !== req.params.trackId);
    await playlist.save();
    
    // Return the updated playlist so React can update the screen
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove track' });
  }
});

// 3. Remove a track from "Your Library" (Favorites)
app.delete('/api/favorites/:trackId', async (req, res) => {
  try {
    await Favorite.findOneAndDelete({ id: req.params.trackId });
    res.json({ message: 'Removed from library' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from library' });
  }
});

// Favorites (Unchanged)
app.post('/api/favorites', async (req, res) => {
  try {
    const existing = await Favorite.findOne({ id: req.body.id });
    if (existing) return res.status(400).json({ message: 'Already in library' });
    const newFavorite = new Favorite(req.body);
    await newFavorite.save();
    res.status(201).json(newFavorite);
  } catch (error) { res.status(500).json({ error: 'Failed to save' }); }
});

app.get('/api/favorites', async (req, res) => {
  try { res.json(await Favorite.find()); } 
  catch (error) { res.status(500).json({ error: 'Failed to fetch' }); }
});

// NEW: Create a Playlist
app.post('/api/playlists', async (req, res) => {
  try {
    const newPlaylist = new Playlist({ name: req.body.name, tracks: [] });
    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (error) { res.status(500).json({ error: 'Failed to create playlist' }); }
});

// NEW: Get all Playlists
app.get('/api/playlists', async (req, res) => {
  try { res.json(await Playlist.find()); } 
  catch (error) { res.status(500).json({ error: 'Failed to fetch playlists' }); }
});

// NEW: Add Track to Playlist
app.post('/api/playlists/:playlistId/tracks', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    // Prevent duplicates in the same playlist
    const exists = playlist.tracks.find(t => t.id === req.body.id);
    if (!exists) {
      playlist.tracks.push(req.body);
      await playlist.save();
    }
    res.json(playlist);
  } catch (error) { res.status(500).json({ error: 'Failed to add track' }); }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));