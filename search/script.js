
  document.addEventListener('DOMContentLoaded', function() {
    const tabSearch = document.getElementById('tab-search');
    const tabMovies = document.getElementById('tab-movies');
    const tabTv = document.getElementById('tab-tv');

    const sectionSearch = document.getElementById('section-search');
    const sectionMovies = document.getElementById('section-movies');
    const sectionTv = document.getElementById('section-tv');

    // Function to switch between tabs and show the respective section
    function switchTab(activeTab, activeSection) {
      // Remove active class from all tabs and sections
      tabSearch.classList.remove('active');
      tabMovies.classList.remove('active');
      tabTv.classList.remove('active');
      sectionSearch.classList.remove('active');
      sectionMovies.classList.remove('active');
      sectionTv.classList.remove('active');

      // Add active class to the selected tab and section
      activeTab.classList.add('active');
      activeSection.classList.add('active');
    }

    // Event listeners for each tab
    tabSearch.addEventListener('click', function() {
      switchTab(tabSearch, sectionSearch);
    });

    tabMovies.addEventListener('click', function() {
      switchTab(tabMovies, sectionMovies);
    });

    tabTv.addEventListener('click', function() {
      switchTab(tabTv, sectionTv);
    });

    // Set default tab to "Top Search" on page load (for mobile and desktop)
    switchTab(tabSearch, sectionSearch);
  });

  // Mobile view - Only one section displayed at a time
  const tabButtons = document.querySelectorAll('.tab-button');
  const sections = document.querySelectorAll('.trending-section');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Remove "active" from all buttons and sections
      tabButtons.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      // Add "active" to clicked button and corresponding section
      btn.classList.add('active');
      const sectionId = 'section-' + btn.id.split('-')[1]; // Create section ID based on button ID
      document.getElementById(sectionId).classList.add('active');
    });
  });

  // Optional: Automatically set the default section to "Top Search" on page load
  document.addEventListener("DOMContentLoaded", function() {
    const defaultTab = document.getElementById('tab-search');
    defaultTab.classList.add('active');
    const defaultSection = document.getElementById('section-search');
    defaultSection.classList.add('active');
  });
  
  
const apiKey = 'ea97a714a43a0e3481592c37d2c7178a';
const baseUrl = 'https://api.themoviedb.org/3/';

// DOM Elements
const searchBar = document.getElementById('search-bar');
const suggestionsContainer = document.getElementById('suggestions-container');
const topSearchContainer = document.getElementById('top-search');
const trendingMoviesContainer = document.getElementById('trending-movies');
const trendingTVContainer = document.getElementById('trending-tv');

// --- Global Search Tracking (localStorage) ---

function getGlobalSearches() {
  return JSON.parse(localStorage.getItem('globalSearches')) || {};
}

function saveGlobalSearches(data) {
  localStorage.setItem('globalSearches', JSON.stringify(data));
}

function recordGlobalSearch(item) {
  const key = `${item.id}-${item.media_type}`;
  const searches = getGlobalSearches();

  if (searches[key]) {
    searches[key].count += 1;
  } else {
    searches[key] = {
      id: item.id,
      title: item.title || item.name,
      media_type: item.media_type,
      poster_path: item.poster_path,
      count: 1
    };
  }

  saveGlobalSearches(searches);
}

async function displayTopSearch() {
  const searches = getGlobalSearches();
  const items = Object.values(searches).sort((a, b) => b.count - a.count);
  topSearchContainer.innerHTML = '';

  if (items.length === 0) {
    topSearchContainer.innerHTML = 'No top searches yet.';
    return;
  }

  for (const item of items) {
    const mediaType = item.media_type || 'movie'; // default to 'movie' if not specified
    try {
      const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${item.id}?api_key=${apiKey}`);
      const data = await response.json();

      const poster = data.poster_path 
        ? `https://image.tmdb.org/t/p/w300${data.poster_path}` 
        : 'https://via.placeholder.com/150x225?text=No+Image';

      const title = data.title || data.name || 'Unknown Title';
      let releaseDate = data.release_date || data.first_air_date || 'Unknown';

      // Format release date as "Month Year" (e.g., "January 2025")
      if (releaseDate !== 'Unknown') {
        const dateObj = new Date(releaseDate);
        const options = { year: 'numeric', month: 'long' };
        releaseDate = dateObj.toLocaleDateString('en-US', options); // Format as "Month Year"
      }

      const genre = data.genres?.[0]?.name || 'Unknown';

      const div = document.createElement('div');
      div.classList.add('media-item');
div.innerHTML = `
  <img src="${poster}" alt="${title}">
  <div class="media-info">
    <div class="media-title">${title}</div>
    <div class="media-release-date">${releaseDate}</div>
    <div class="media-genre">${genre}</div>
  </div>
`;
      div.onclick = () => {
        const page = mediaType === 'movie' ? '../movie-library.html' : '../tv-shows-library.html';
        window.location.href = `${page}?id=${item.id}`;
      };

      topSearchContainer.appendChild(div);
    } catch (error) {
      console.error(`Failed to fetch data for ID ${item.id}:`, error);
    }
  }
}


let currentPage = { movie: 1, tv: 1 };
let totalPages = { movie: Infinity, tv: Infinity };
let isLoading = { movie: false, tv: false };
let activeTab = 'movie'; // or 'tv' or 'search'

let movieGenres = {};
let tvGenres = {};

// Fetch genre lists once and cache them
async function fetchGenres() {
  if (Object.keys(movieGenres).length && Object.keys(tvGenres).length) return; // already loaded

  const [movieRes, tvRes] = await Promise.all([
    fetch(`${baseUrl}genre/movie/list?api_key=${apiKey}`),
    fetch(`${baseUrl}genre/tv/list?api_key=${apiKey}`)
  ]);

  const movieData = await movieRes.json();
  const tvData = await tvRes.json();

  movieGenres = Object.fromEntries(movieData.genres.map(g => [g.id, g.name]));
  tvGenres = Object.fromEntries(tvData.genres.map(g => [g.id, g.name]));
}

// Enhanced fetchTrending function with full details, used initially or for refreshing container
async function fetchTrending(type, container) {
  await fetchGenres();

  const url = `${baseUrl}trending/${type}/week?api_key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  container.innerHTML = '';
  data.results.forEach(item => {
    const poster = item.poster_path
      ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
      : 'https://via.placeholder.com/150x225?text=No+Image';

    const title = item.title || item.name;

    // Format release date to "Month Year"
    let releaseDate = item.release_date || item.first_air_date || 'Unknown Date';
    if (releaseDate !== 'Unknown Date') {
      const date = new Date(releaseDate);
      const options = { year: 'numeric', month: 'long' };
      releaseDate = date.toLocaleDateString('en-US', options);
    }

    const genreMap = type === 'movie' ? movieGenres : tvGenres;
    const genre = item.genre_ids.map(id => genreMap[id]).filter(Boolean).join(', ') || 'Unknown Genre';

    const div = document.createElement('div');
    div.classList.add('media-item');
    div.innerHTML = `
      <img src="${poster}" alt="${title}">
      <div class="media-info">
        <div class="media-title">${title}</div>
        <div class="media-release-date">${releaseDate}</div>
        <div class="media-genre">${genre}</div>
      </div>
    `;
    div.onclick = () => {
      const page = type === 'movie' ? '../movie-library.html' : '../tv-shows-library.html';
      window.location.href = `${page}?id=${item.id}`;
    };

    container.appendChild(div);
  });
}

// Paginated loading for infinite scroll and incremental appending
async function loadTrending(type) {
  if (isLoading[type] || currentPage[type] > totalPages[type]) return;

  isLoading[type] = true;

  const url = `${baseUrl}trending/${type}/week?api_key=${apiKey}&page=${currentPage[type]}`;
  const res = await fetch(url);
  const data = await res.json();

  const container = document.getElementById(type === 'movie' ? 'trending-movies' : 'trending-tv');

  await fetchGenres();

  data.results.forEach(item => {
    const poster = item.poster_path
      ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
      : 'https://via.placeholder.com/150x225?text=No+Image';

    const title = item.title || item.name;

    // Format release date to "Month Year"
    let releaseDate = item.release_date || item.first_air_date || 'Unknown Date';
    if (releaseDate !== 'Unknown Date') {
      const date = new Date(releaseDate);
      const options = { year: 'numeric', month: 'long' };
      releaseDate = date.toLocaleDateString('en-US', options);
    }

    const genreMap = type === 'movie' ? movieGenres : tvGenres;
    const genre = item.genre_ids.map(id => genreMap[id]).filter(Boolean).join(', ') || 'Unknown Genre';

    const div = document.createElement('div');
    div.classList.add('media-item');
    div.innerHTML = `
      <img src="${poster}" alt="${title}">
      <div class="media-info">
        <div class="media-title">${title}</div>
        <div class="media-release-date">${releaseDate}</div>
        <div class="media-genre">${genre}</div>
      </div>
    `;
    div.onclick = () => {
      const page = type === 'movie' ? '../movie-library.html' : '../tv-shows-library.html';
      window.location.href = `${page}?id=${item.id}`;
    };

    container.appendChild(div);
  });

  totalPages[type] = data.total_pages;
  currentPage[type]++;
  isLoading[type] = false;
}

// Tab switch logic
document.getElementById('tab-movies').addEventListener('click', () => switchTab('movie'));
document.getElementById('tab-tv').addEventListener('click', () => switchTab('tv'));
document.getElementById('tab-search').addEventListener('click', () => switchTab('search'));

function switchTab(tab) {
  activeTab = tab;

  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`#tab-${tab}`).classList.add('active');

  document.querySelectorAll('.trending-section').forEach(section => section.classList.remove('active'));
  document.querySelector(`#section-${tab}`).classList.add('active');

  if (tab === 'movie' && currentPage.movie === 1) loadTrending('movie');
  if (tab === 'tv' && currentPage.tv === 1) loadTrending('tv');
  if (tab === 'search') document.getElementById('top-search').innerHTML = 'Top search logic here...';
}

// Infinite scroll logic
window.addEventListener('scroll', () => {
  const scrollThreshold = 300;
  if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - scrollThreshold)) {
    if (activeTab === 'movie') loadTrending('movie');
    else if (activeTab === 'tv') loadTrending('tv');
  }
});

// Auto-load first tab on page load
loadTrending('movie');


// --- Search Suggestions ---

let movieGenresMap = {};
let tvGenresMap = {};

async function fetchGenres() {
  const movieGenreRes = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=en-US`);
  const movieGenreData = await movieGenreRes.json();
  movieGenresMap = movieGenreData.genres.reduce((acc, genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});

  const tvGenreRes = await fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}&language=en-US`);
  const tvGenreData = await tvGenreRes.json();
  tvGenresMap = tvGenreData.genres.reduce((acc, genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});
}

// Call this once on page load to populate genre maps
fetchGenres();

async function fetchSearchSuggestions(query) {
  if (!query) {
    suggestionsContainer.style.display = 'none';
    return;
  }

  const url = `${baseUrl}search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
  const res = await fetch(url);
  const data = await res.json();
  displaySuggestions(data.results);
}

function displaySuggestions(results) {
  suggestionsContainer.innerHTML = '';
  if (!results.length) {
    suggestionsContainer.style.display = 'none';
    return;
  }

  results.forEach(result => {
    if (!['movie', 'tv'].includes(result.media_type)) return;

    const poster = result.poster_path
      ? `https://image.tmdb.org/t/p/w92${result.poster_path}`
      : 'https://via.placeholder.com/50x75?text=No+Image';

    const releaseDate = result.media_type === 'movie' ? result.release_date : result.first_air_date;
    const formattedDate = releaseDate
      ? new Date(releaseDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
      : 'Unknown';

    const genreIds = result.genre_ids || [];
    const genreMap = result.media_type === 'movie' ? movieGenresMap : tvGenresMap;
    const genres = genreIds.map(id => genreMap[id]).filter(Boolean).join(', ') || 'No genres';

    const item = document.createElement('div');
    item.classList.add('suggestion-item');
    item.innerHTML = `
      <img src="${poster}" class="suggestion-poster" alt="${result.title || result.name}">
      <div class="suggestion-info">
        <span class="suggestion-title">${result.title || result.name}</span>
        <div class="suggestion-meta">
          <div class="suggestion-date">${formattedDate}</div>
          <div class="suggestion-genres">${genres}</div>
        </div>
      </div>
    `;

    item.onclick = () => {
      recordGlobalSearch(result);
      const page = result.media_type === 'movie' ? '../movie-library.html' : '../tv-shows-library.html';
      window.location.href = `${page}?id=${result.id}`;
    };

    suggestionsContainer.appendChild(item);
  });

  suggestionsContainer.style.display = 'block';
}

// --- Event Handlers ---

searchBar.addEventListener('input', (e) => fetchSearchSuggestions(e.target.value));

searchBar.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const query = searchBar.value.trim();
    if (!query) return;

    const url = `${baseUrl}search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
    const res = await fetch(url);
    const data = await res.json();
    const firstResult = data.results.find(r => r.media_type === 'movie' || r.media_type === 'tv');
    
    if (firstResult) {
      recordGlobalSearch(firstResult);
      const page = firstResult.media_type === 'movie' ? '../movie-library.html' : '../tv-shows-library.html';
      window.location.href = `${page}?id=${firstResult.id}`;
    }
  }
});

// --- Initial Load ---

fetchTrending('movie', trendingMoviesContainer);
fetchTrending('tv', trendingTVContainer);
displayTopSearch();

document.getElementById('search-bar').addEventListener('input', function() {
  const searchQuery = this.value.trim();
  const suggestionsContainer = document.getElementById('suggestions-container');
  
  if (searchQuery.length > 0) {
    // Call a function to generate suggestions (mocked here as an array)
    showSuggestions(searchQuery);
  } else {
    // Clear suggestions when the input is empty
    suggestionsContainer.innerHTML = '';
  }
});

function showSuggestions(query) {
  const suggestionsContainer = document.getElementById('suggestions-container');
  const searchSuggestions = [
    'The Avengers', 'The Walking Dead', 'Stranger Things', 'Breaking Bad', 'Game of Thrones', 'The Witcher'
  ];
  
  const filteredSuggestions = searchSuggestions.filter(item => 
    item.toLowerCase().includes(query.toLowerCase())
  );

  suggestionsContainer.innerHTML = filteredSuggestions.map(suggestion => {
    return `<div class="suggestion-item">${suggestion}</div>`;
  }).join('');

  // Add click event listener for each suggestion item
  const suggestionItems = suggestionsContainer.getElementsByClassName('suggestion-item');
  for (let item of suggestionItems) {
    item.addEventListener('click', function() {
      document.getElementById('search-bar').value = item.textContent;
      suggestionsContainer.innerHTML = ''; // Clear suggestions after selecting
      handleSearch(item.textContent); // Call the search function
    });
  }
}

function handleSearch(query) {
  console.log('Searching for:', query);
  // Implement search logic here (e.g., API call, page navigation, etc.)
}

function handleSearchClick() {
  const query = document.getElementById('search-bar').value.trim();
  if (query) {
    handleSearch(query);  // Trigger the search when the icon is clicked
  } else {
    alert('Please enter a search term.');
  }
}

  function handleSearchClick() {
    const query = document.getElementById("search-bar").value.trim();
    if (query) {
      // Redirect to result.html with query parameter
      window.location.href = `../result.html?query=${encodeURIComponent(query)}`;
    }
  }
  
    const clearBtn = document.getElementById('clear-btn');

  // Show/hide clear button based on input
  searchBar.addEventListener('input', () => {
    const hasText = searchBar.value.trim().length > 0;
    clearBtn.style.display = hasText ? 'block' : 'none';
  });

  // Clear button function
  function clearSearch() {
    searchBar.value = '';
    clearBtn.style.display = 'none';
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.display = 'none';
    searchBar.focus(); // Optional: focus the input again
  }
 
 
 
let recognition; // Global recognition reference
let micPermissionGranted = false; // Track if we already asked

// 🎤 Start Voice Search: Request mic permission, then greet and listen
function startVoiceSearch() {
  if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
    alert("Sorry, your browser doesn't support voice recognition.");
    return;
  }

  if (!recognition) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
  }

  if (!micPermissionGranted) {
    // Temporary dummy start to trigger mic permission
    try {
      recognition.start();
    } catch (e) {
      console.warn("Recognition already started or blocked.");
    }

    recognition.onstart = () => {
      micPermissionGranted = true;
      recognition.stop(); // Stop dummy session

      // Now greet user, then start real listening
      speakAndThen("Hi, what's up? Say a title.", () => {
        startListening(); // Start the real voice listening
      });
    };

    recognition.onerror = (event) => {
      console.error('Permission error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        alert("Microphone access is required.");
        speak("Please allow microphone access to continue.");
      }
    };
  } else {
    // If already granted, skip straight to greeting + listening
    speakAndThen("Hi again, say a title.", () => {
      startListening();
    });
  }
}

// 🗣️ Speak first, then do something
function speakAndThen(text, callback) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.pitch = 1.2;
  utterance.rate = 1;
  utterance.onend = callback;
  speechSynthesis.speak(utterance);
}

// 🔊 Simple speak helper
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.pitch = 1.2;
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
}

// 🎧 Start actual speech recognition
function startListening() {
  const activeRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  activeRecognition.lang = 'en-US';
  activeRecognition.interimResults = false;

  try {
    activeRecognition.start();

    activeRecognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript.trim();
      console.log("🎙️ Voice input:", transcript);
      searchAndDisplayTitles(transcript);
    };

    activeRecognition.onerror = function (event) {
      console.error('Recognition error:', event.error);
      alert("Could not process voice. Try again.");
      speak("Sorry, I didn't catch that. Try again.");
    };
  } catch (err) {
    console.error('Listening failed to start:', err);
    alert("Unable to start voice recognition.");
  }
}

// 🔤 Normalize user input
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// 🔍 Search TMDB for matching titles (partial match, not exact)
async function searchAndDisplayTitles(query) {
  const endpoint = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&include_adult=false`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    const normalizedQuery = normalize(query);

    const relevantResults = data.results.filter(item => {
      const title = item.title || item.name || '';
      return normalize(title).includes(normalizedQuery) && (item.media_type === 'movie' || item.media_type === 'tv');
    });

    if (relevantResults.length === 0) {
      showModal(`<p class="no-results">No matches found for "<strong>${query}</strong>".</p>`);
      speak("No results found. Try another title.");
      return;
    }

    const cards = await Promise.all(relevantResults.map(async item => {
      const isMovie = item.media_type === 'movie';
      const title = isMovie ? item.title : item.name;
      const image = item.poster_path
        ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
        : 'https://via.placeholder.com/300x450?text=No+Image';
      const id = item.id;
      const redirectPage = isMovie ? '../movie-library.html' : '../tv-shows-library.html';

      // Fetch genres for display
      const detailsEndpoint = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${id}?api_key=${apiKey}&language=en-US`;
      let genres = [];
      try {
        const detailsRes = await fetch(detailsEndpoint);
        const detailsData = await detailsRes.json();
        genres = detailsData.genres?.map(g => g.name) || [];
      } catch (err) {
        console.warn('Genre fetch failed:', err);
      }

      const genreText = genres.length ? genres[0] : 'Unknown Genre';
      const mediaType = isMovie ? 'Movie' : 'TV Show';

      return `
        <div class="voice-result-card" onclick="location.href='${redirectPage}?id=${id}'" style="cursor:pointer;">
          <img src="${image}" alt="${title}">
          <div class="voice-result-info">
            <h3 class="voice-title">${title}</h3>
            <div class="voice-meta">
              <span class="genre">${genreText}</span>
              <span class="dot-separator">•</span>
              <span class="media-type">${mediaType}</span>
            </div>
          </div>
        </div>
      `;
    }));

    showModal(`<div class="voice-result-grid">${cards.join('')}</div>`);

    speak("Here are the results.");
    setTimeout(() => speak("Just say a title if you want more."), 3500);

  } catch (error) {
    console.error('TMDB fetch error:', error);
    showModal(`<p class="no-results">Oops! Failed to fetch results.</p>`);
    speak("Something went wrong fetching the results.");
  }
}

// 📤 Show results modal
function showModal(content) {
  const modal = document.getElementById('voiceResultModal');
  const body = document.getElementById('voice-result-body');
  body.innerHTML = content;
  modal.classList.remove('hidden');
}

// ❌ Close modal
function closeVoiceModal() {
  document.getElementById('voiceResultModal').classList.add('hidden');
}
