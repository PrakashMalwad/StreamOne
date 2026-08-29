import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Home, Search, Library, Mic2, LayoutList, Heart, Plus, ListMusic, Trash2 } from 'lucide-react';
import YouTube from 'react-youtube'; 

function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [ytPlayer, setYtPlayer] = useState(null);
  
  // NEW: Track volume state inside the component
  const [volume, setVolume] = useState(100);
  
  const [currentView, setCurrentView] = useState('Search Results');
  const [playlists, setPlaylists] = useState([]);
  
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [isLibrary, setIsLibrary] = useState(false);

  const fetchTracks = (query = '') => {
    const url = query ? `http://localhost:5000/api/tracks?q=${encodeURIComponent(query)}` : 'http://localhost:5000/api/tracks';
    fetch(url).then(res => res.json()).then(data => { 
      setTracks(data); 
      setCurrentView(query ? `Results for "${query}"` : 'Home');
      setCurrentPlaylistId(null);
      setIsLibrary(false);
    }).catch(err => console.error(err));
  };

  // NEW: Handle clicking on the volume bar
  const handleVolumeChange = (e) => {
    if (!ytPlayer) return;
    const width = e.currentTarget.clientWidth;
    const clickX = e.nativeEvent.offsetX;
    
    // Calculate percentage (0.0 to 1.0)
    let newVolumePercent = clickX / width;
    
    // Convert to YouTube's 0-100 scale and ensure it stays in bounds
    const ytVolume = Math.max(0, Math.min(100, Math.round(newVolumePercent * 100)));
    
    ytPlayer.setVolume(ytVolume);
    setVolume(ytVolume);
  };

  const loadLibrary = () => {
    fetch('http://localhost:5000/api/favorites').then(res => res.json()).then(data => { 
      setTracks(data); 
      setCurrentView('Your Library'); 
      setCurrentPlaylistId(null);
      setIsLibrary(true);
    }).catch(err => console.error(err));
  };

  const loadPlaylists = () => {
    fetch('http://localhost:5000/api/playlists').then(res => res.json()).then(data => setPlaylists(data)).catch(err => console.error(err));
  };

  useEffect(() => {
    fetchTracks();
    loadPlaylists();
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying && ytPlayer) {
      interval = setInterval(async () => {
        const time = await ytPlayer.getCurrentTime();
        setCurrentTime(time);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, ytPlayer]);

  const createPlaylist = () => {
    const name = window.prompt("Enter playlist name:");
    if (!name) return;
    fetch('http://localhost:5000/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      .then(() => loadPlaylists());
  };

  const viewPlaylist = (playlist) => {
    setTracks(playlist.tracks);
    setCurrentView(`Playlist: ${playlist.name}`);
    setCurrentPlaylistId(playlist._id);
    setIsLibrary(false);
  };

  const deletePlaylist = (playlistId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this playlist?")) return;
    
    fetch(`http://localhost:5000/api/playlists/${playlistId}`, { method: 'DELETE' })
      .then(() => {
        loadPlaylists();
        if (currentPlaylistId === playlistId) fetchTracks('top pop songs');
      });
  };

  const addToPlaylist = (track, playlistId, e) => {
    e.stopPropagation();
    if (!playlistId) return; 
    fetch(`http://localhost:5000/api/playlists/${playlistId}/tracks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(track) })
      .then(() => alert(`Added to playlist!`));
  };

  const removeTrack = (trackId, e) => {
    e.stopPropagation();
    
    if (currentPlaylistId) {
      fetch(`http://localhost:5000/api/playlists/${currentPlaylistId}/tracks/${trackId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(updatedPlaylist => setTracks(updatedPlaylist.tracks)); 
    } else if (isLibrary) {
      fetch(`http://localhost:5000/api/favorites/${trackId}`, { method: 'DELETE' })
        .then(() => loadLibrary()); 
    }
  };

  const saveFavorite = (track, e) => {
    e.stopPropagation(); 
    fetch('http://localhost:5000/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(track) })
      .then(() => alert(`Saved to Your Library!`));
  };

  const playTrack = (track) => { setCurrentTrack(track); setDuration(track.duration); };
  const togglePlay = () => { if (!ytPlayer) return; isPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); };
  const formatTime = (time) => { if (isNaN(time) || time === null) return "0:00"; const minutes = Math.floor(time / 60); const seconds = Math.floor(time % 60); return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; };
  
  const playNext = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    playTrack(tracks[(currentIndex + 1) % tracks.length]);
  };
  
  const playPrevious = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    playTrack(tracks[currentIndex === 0 ? tracks.length - 1 : currentIndex - 1]);
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-black p-6 flex flex-col gap-6 border-r border-neutral-900 hidden md:flex">
        <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"><Play fill="black" size={16} className="ml-1" /></div>
          StreamOne
        </h1>
        
        <nav className="flex flex-col gap-4 mt-4 text-neutral-400 font-semibold border-b border-neutral-800 pb-6">
          <a href="#" onClick={() => fetchTracks('top pop songs')} className="flex items-center gap-4 hover:text-white transition-colors"><Home size={24} /> Home</a>
          <a href="#" onClick={() => document.querySelector('input').focus()} className="flex items-center gap-4 hover:text-white transition-colors"><Search size={24} /> Search</a>
          <a href="#" onClick={loadLibrary} className="flex items-center gap-4 hover:text-white transition-colors"><Library size={24} /> Your Library</a>
        </nav>

        <div className="flex flex-col gap-4 text-neutral-400 font-semibold overflow-y-auto">
          <div className="flex items-center justify-between text-sm tracking-wider hover:text-white transition-colors cursor-pointer" onClick={createPlaylist}>
            <span>PLAYLISTS</span>
            <Plus size={20} className="hover:bg-neutral-800 rounded-full p-0.5" />
          </div>
          {playlists.map(playlist => (
            <div key={playlist._id} onClick={() => viewPlaylist(playlist)} className="group flex items-center justify-between hover:text-white transition-colors text-sm font-normal cursor-pointer">
              <div className="flex items-center gap-4"><ListMusic size={20} /> <span className="truncate w-32">{playlist.name}</span></div>
              <Trash2 size={16} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400" onClick={(e) => deletePlaylist(playlist._id, e)} />
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col bg-gradient-to-b from-indigo-900 via-neutral-900 to-black overflow-y-auto pb-32">
        <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-md p-4 flex justify-between items-center px-8">
          <form onSubmit={(e) => { e.preventDefault(); fetchTracks(searchQuery); }} className="flex items-center bg-neutral-800 rounded-full px-4 py-2 w-80">
            <Search size={20} className="text-neutral-400 mr-2" />
            <input type="text" placeholder="Search for any song or artist" className="bg-transparent text-sm text-white focus:outline-none w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </form>
          <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center cursor-pointer">👤</div>
        </div>

        <div className="p-8">
          <h2 className="text-3xl font-bold mb-6 mt-2">{currentView}</h2>
          <div className="w-full text-left border-collapse">
            <div className="text-neutral-400 border-b border-neutral-800 pb-2 mb-4 flex px-4 text-sm font-semibold tracking-wider">
              <div className="w-12">#</div>
              <div className="flex-1">Title</div>
              <div className="hidden md:block flex-1">Channel</div>
            </div>
            
            <div className="flex flex-col">
              {tracks.map((track, index) => (
                <div key={track.id} onClick={() => playTrack(track)} className="group flex items-center p-3 rounded-md hover:bg-white/10 cursor-pointer transition-colors">
                  <div className="w-12 flex justify-start items-center text-neutral-400 relative">
                    <span className="group-hover:hidden">{index + 1}</span>
                    <Play size={16} fill="white" className="text-white hidden group-hover:block absolute left-0" />
                  </div>
                  <div className="flex-1 flex items-center gap-4">
                    <img src={track.image} alt={track.name} className="w-10 h-10 rounded shadow-lg object-cover" />
                    <div className="flex flex-col">
                      <span className={`text-base font-semibold truncate max-w-md ${currentTrack?.id === track.id ? 'text-green-500' : 'text-white'}`}>{track.name}</span>
                    </div>
                  </div>
                  <div className="hidden md:block flex-1 text-sm text-neutral-400">{track.artist_name}</div>
                  
                  <div className="flex items-center gap-4 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {(currentPlaylistId || isLibrary) ? (
                      <Trash2 size={20} className="text-red-500 hover:text-red-400" onClick={(e) => removeTrack(track.id, e)} />
                    ) : (
                      <>
                        {playlists.length > 0 && (
                          <select 
                            className="bg-neutral-800 text-xs text-white p-1 rounded outline-none cursor-pointer"
                            onChange={(e) => addToPlaylist(track, e.target.value, e)}
                            onClick={(e) => e.stopPropagation()}
                            defaultValue=""
                          >
                            <option value="" disabled>Add to...</option>
                            {playlists.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                          </select>
                        )}
                        <Heart size={20} className="text-neutral-400 hover:text-green-500 hover:fill-green-500" onClick={(e) => saveFavorite(track, e)} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* CUSTOM BOTTOM PLAYER */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 w-full h-24 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 px-6 flex items-center justify-between z-50">
          <div className="flex items-center w-1/3 min-w-[200px]">
            <img src={currentTrack.image} alt="art" className="w-14 h-14 rounded-md shadow-md mr-4 object-cover" />
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-white truncate max-w-xs">{currentTrack.name}</span>
              <span className="text-xs text-neutral-400 truncate">{currentTrack.artist_name}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center w-1/3 max-w-[500px]">
            <div className="flex items-center gap-6 mb-2">
              <SkipBack size={20} onClick={playPrevious} className="text-neutral-400 hover:text-white cursor-pointer" />
              <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
                {isPlaying ? <Pause size={16} fill="black" className="text-black" /> : <Play size={16} fill="black" className="text-black ml-1" />}
              </button>
              <SkipForward size={20} onClick={playNext} className="text-neutral-400 hover:text-white cursor-pointer" />
            </div>
            
            <div className="w-full flex items-center gap-2 text-xs text-neutral-400">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1 h-1 bg-neutral-600 rounded-full overflow-hidden cursor-pointer" onClick={(e) => { const newTime = (e.nativeEvent.offsetX / e.currentTarget.clientWidth) * duration; ytPlayer.seekTo(newTime); setCurrentTime(newTime); }}>
                <div className="h-full bg-white hover:bg-green-500 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* UPDATED: Interactive Volume Bar */}
          <div className="w-1/3 flex justify-end items-center gap-2 group pr-4">
            <Volume2 size={18} className="text-neutral-400 group-hover:text-white transition-colors" />
            <div 
              className="w-24 h-1 bg-neutral-600 rounded-full overflow-hidden cursor-pointer"
              onClick={handleVolumeChange}
            >
              <div 
                className="h-full bg-white group-hover:bg-green-500 rounded-full" 
                style={{ width: `${volume}%` }}
              ></div>
            </div>
          </div>

          {/* UPDATED: YouTube Player now applies initial volume */}
          <YouTube 
            videoId={currentTrack.id} 
            opts={{ playerVars: { autoplay: 1 } }} 
            onReady={(e) => {
              setYtPlayer(e.target);
              e.target.setVolume(volume); // Sets the volume immediately when the song loads
            }} 
            onPlay={() => setIsPlaying(true)} 
            onPause={() => setIsPlaying(false)} 
            onEnd={playNext} 
            className="hidden" 
          />
        </div>
      )}
    </div>
  );
}

export default App;