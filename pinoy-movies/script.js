
const apiKey = 'ea97a714a43a0e3481592c37d2c7178a';
let genreMap = {};

document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const navMenu = document.getElementById('navburgerMenu');

  if (burger && navMenu) {
    // Toggle menu visibility on burger click
    burger.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent document click
      navMenu.classList.toggle('active');
    });

    // Prevent closing when clicking inside menu
    navMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Hide menu when clicking outside
    document.addEventListener('click', () => {
      navMenu.classList.remove('active');
    });
  }
});


document.querySelectorAll('.carousel-btn').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    document.querySelectorAll('.poster-wrapper').forEach(p => {
      p.style.pointerEvents = 'none';
    });
  });

  btn.addEventListener('mouseleave', () => {
    document.querySelectorAll('.poster-wrapper').forEach(p => {
      p.style.pointerEvents = 'auto';
    });
  });
});


// Notifications
async function fetchTrendingWithLogos() {
  const res = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}`);
  const data = await res.json();
  const items = data.results || [];
  const today = new Date();

  const filtered = items
    .filter(item => {
      const releaseDate = item.release_date || item.first_air_date;
      if (!releaseDate) return false;
      const dateObj = new Date(releaseDate);
      return (dateObj <= today) && (item.title || item.name);
    })
    .map(item => ({
      ...item,
      media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
      release_date: item.release_date || item.first_air_date || '1970-01-01',
    }));

  const withLogos = [];
  for (const item of filtered) {
    try {
      const logoRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}/images?api_key=${apiKey}`);
      const logos = await logoRes.json();
      const hasLogo = logos.logos?.some(l => l.file_path && l.iso_639_1 === 'en');
      if (hasLogo) withLogos.push(item);
    } catch (e) {
      console.warn('Logo fetch failed:', e);
    }
  }

  withLogos.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
  return withLogos;
}

function mediaTypeLink(type, id) {
  return type === 'movie'
    ? `../movie-library.html?id=${id}`
    : `../tv-shows-library.html?id=${id}`;
}

async function showTrendingNotifications() {
  const items = await fetchTrendingWithLogos();
  const badge = document.getElementById("notificationBadge");
  const list = document.getElementById("notificationList");

  const seenKey = 'lastSeenTrendingIds';
  const currentIds = items.map(i => i.id).sort().join(',');
  const lastSeenIds = localStorage.getItem(seenKey);
  const isNew = currentIds !== lastSeenIds;

  list.innerHTML = '';
  items.forEach(item => {
    const title = item.title || item.name || 'Untitled';
    const type = item.media_type === 'movie' ? 'Movie' : 'TV Show';
    const release = item.release_date || 'Unknown';
const poster = item.backdrop_path
  ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
  : 'https://via.placeholder.com/100x56?text=No+Image';


    const link = document.createElement('a');
    link.href = mediaTypeLink(item.media_type, item.id);
    link.className = 'notification-link';
    link.innerHTML = `
      <img src="${poster}" class="notification-poster" alt="${title}" />
      <div class="notification-info">
        <div class="notification-title">${title}</div>
        <div class="notification-type">${type}</div>
        <div class="notification-date">${release}</div>
      </div>
    `;

    const li = document.createElement('li');
    li.appendChild(link);
    list.appendChild(li);
  });

  if (isNew && items.length > 0) {
    badge.textContent = items.length;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }

  window.latestTrendingNotifications = items;
  window.currentTrendingIds = currentIds;
}

function closeNotificationModal() {
  document.getElementById("notificationModal").style.display = "none";
}

document.getElementById("notificationIcon").addEventListener("click", (e) => {
  const modal = document.getElementById("notificationModal");
  const isHidden = window.getComputedStyle(modal).display === "none";
  modal.style.display = isHidden ? "block" : "none";

  if (window.currentTrendingIds) {
    localStorage.setItem('lastSeenTrendingIds', window.currentTrendingIds);
    document.getElementById("notificationBadge").style.display = 'none';
  }

  e.stopPropagation(); // prevent closing immediately after opening
});

// Hide modal if clicked outside
document.addEventListener("click", (e) => {
  const modal = document.getElementById("notificationModal");
  if (!document.getElementById("notificationIcon").contains(e.target)) {
    modal.style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  showTrendingNotifications();
  setInterval(showTrendingNotifications, 60 * 60 * 1000); // auto-check every hour
});

//more menu
  function toggleMoreMenu() {
    const menu = document.getElementById('moreMenu');
    menu.classList.toggle('show');
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    const moreDropdown = document.querySelector('.more-dropdown');
    if (!moreDropdown.contains(e.target)) {
      document.getElementById('moreMenu').classList.remove('show');
    }
  });
  

//modal Traile
async function loadTrailer(buttonElement) {
  // Get the current active slide
  const activeSlide = document.querySelector('.slide.active');
  if (!activeSlide) return alert("No active slide.");

  const mediaType = activeSlide.dataset.type;
  const mediaId = activeSlide.dataset.id;

  const apiKey = 'ea97a714a43a0e3481592c37d2c7178a'; // Your TMDB API key
  const url = `https://api.themoviedb.org/3/${mediaType}/${mediaId}/videos?api_key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    if (!trailer) {
      alert('Trailer not available.');
      return;
    }

    const videoKey = trailer.key;
    const iframe = document.getElementById('trailerIframe');
    iframe.src = `https://www.youtube.com/embed/${videoKey}?autoplay=1`;

    document.getElementById('trailerModal').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    alert('Failed to load trailer.');
  }
}

function closeTrailer() {
  const modal = document.getElementById('trailerModal');
  const iframe = document.getElementById('trailerIframe');
  iframe.src = ''; // Stop video
  modal.classList.add('hidden');
}

//Movie page
let currentPage = 1;
let currentGenreId = null;
let isGenreMode = false;
let canLoadMore = true;
let currentViewMode = getViewMode(); // 'landscape' or 'portrait'
const exploreGrid = document.getElementById('exploreGrid');

function getViewMode() {
  return window.innerWidth >= 1024 ? 'landscape' : 'portrait';
}

// ✅ Lazy loading
const lazyImageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      const src = img.dataset.src;
      if (src && !img.src) {
        img.src = src;
        img.onload = () => img.classList.add('loaded');
      }
      lazyImageObserver.unobserve(img);
    }
  });
}, { rootMargin: '200px', threshold: 0.1 });

// ✅ Infinite scroll
const rowObserver = new IntersectionObserver(handleRowIntersection, {
  rootMargin: '100px',
  threshold: 0.5
});

function handleRowIntersection(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting && canLoadMore) {
      rowObserver.unobserve(entry.target);
      fetchExploreData();
    }
  });
}

function filterExploreByGenre(genreId) {
  if (!genreId) return;
  currentPage = 1;
  exploreGrid.innerHTML = '';
  currentGenreId = genreId;
  isGenreMode = true;
  canLoadMore = true;
  fetchExploreData();
}

function loadExploreCategory(reset = true) {
  if (reset) {
    currentPage = 1;
    exploreGrid.innerHTML = '';
    canLoadMore = true;
  }
  currentGenreId = null;
  isGenreMode = false;
  fetchExploreData();
}

// ✅ Build Tagalog-only API URL
function buildTagalogApiUrl() {
  const today = new Date().toISOString().split('T')[0];
  return `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}` +
    `&region=PH&with_original_language=tl&include_adult=false` +
    `&primary_release_date.lte=${today}` +
    `&page=${currentPage}` +
    `&with_watch_providers=8|119|1939&watch_region=PH` +
    (isGenreMode && currentGenreId ? `&with_genres=${currentGenreId}` : '');
}

// ✅ Fetch Data and Render Posters
async function fetchExploreData() {
  try {
    const response = await fetch(buildTagalogApiUrl());
    const data = await response.json();
    const results = data.results || [];

    if (!results.length || currentPage > data.total_pages) {
      canLoadMore = false;
      return;
    }

    const uniqueResults = Array.from(new Map(results.map(m => [m.id, m])).values())
      .sort((a, b) => b.popularity - a.popularity);

    const fragment = document.createDocumentFragment();
    const useLandscape = currentViewMode === 'landscape';

    for (const movie of uniqueResults) {
      const id = movie.id;
      const title = movie.title || movie.name || 'Untitled';

      const landscapePath = movie.backdrop_path;
      const portraitPath = movie.poster_path;

      const posterPath = useLandscape
        ? landscapePath || portraitPath
        : portraitPath || landscapePath;

      if (!posterPath) continue;

      const poster = `https://image.tmdb.org/t/p/w500${posterPath}`;

      const item = document.createElement('div');
      item.className = `explore-item ${useLandscape ? 'landscape' : 'portrait'}`;
      item.innerHTML = `
        <a href="../movie-library.html?id=${id}" class="poster-link">
          <div class="poster-wrapper">
            <img class="lazy-img" data-src="${poster}" alt="${title}" loading="lazy" />
            ${useLandscape ? `<div class="poster-logo" data-movie-id="${id}"></div>` : ''}
          </div>
          <div class="explore-info">
            <h4 title="${title}">${title}</h4>
          </div>
        </a>
      `;
      fragment.appendChild(item);

      // ✅ Fetch and insert logo PNG (desktop only)
      if (useLandscape) {
        fetch(`https://api.themoviedb.org/3/movie/${id}/images?api_key=${apiKey}`)
          .then(res => res.json())
          .then(imgData => {
            const logo = (imgData.logos || []).find(l =>
              (l.iso_639_1 === 'en' || l.iso_639_1 === null) && l.file_path
            );
            if (logo) {
              const logoDiv = item.querySelector('.poster-logo');
              const logoImg = document.createElement('img');
              logoImg.src = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
              logoImg.alt = `${title} logo`;
              logoDiv.appendChild(logoImg);
            }
          })
          .catch(err => console.warn('Logo fetch failed for movie:', id, err));
      }
    }

    exploreGrid.appendChild(fragment);

    exploreGrid.querySelectorAll('img.lazy-img:not(.loaded)').forEach(img => {
      lazyImageObserver.observe(img);
    });

    const items = exploreGrid.querySelectorAll('.explore-item');
    if (items.length) {
      rowObserver.observe(items[items.length - 1]);
    }

    currentPage++;
  } catch (err) {
    console.error('Failed to fetch Tagalog movies:', err);
  }
}

// ✅ Auto-reload posters if screen size changes
window.addEventListener('resize', () => {
  const newMode = getViewMode();
  if (newMode !== currentViewMode) {
    currentViewMode = newMode;
    currentPage = 1;
    exploreGrid.innerHTML = '';
    canLoadMore = true;
    fetchExploreData();
  }
});

// ✅ Initial load
loadExploreCategory();

function fetchTbaStudiosMovies() {
  const titles = [
    "Birdshot",
    "Bliss",
    "Bonifacio: Ang Unang Pangulo",
    "Dito at Doon",
    "Dormitoryo",
    "Goyo: Ang Batang Heneral",
    "Heneral Luna",
    "I’m Drunk, I Love You",
    "Lingua Franca",
    "Neomanila",
    "Quezon",
    "Smaller and Smaller Circles",
    "Sunday Beauty Queen",
    "Tayo sa Huling Buwan ng Taon",
    "Women of the Weeping River",
    "Write About Love"
  ];

  const useLandscape = currentViewMode === 'landscape';

  titles.forEach(async (title) => {
    try {
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&region=PH`);
      const searchData = await searchRes.json();
      const movie = searchData.results?.find(m => m.original_language === 'tl' || m.original_language === 'en');

      if (!movie) return;

      const id = movie.id;
      const posterPath = useLandscape
        ? movie.backdrop_path || movie.poster_path
        : movie.poster_path || movie.backdrop_path;

      if (!posterPath) return;

      const poster = `https://image.tmdb.org/t/p/w500${posterPath}`;
      const item = document.createElement('div');
      item.className = `explore-item ${useLandscape ? 'landscape' : 'portrait'}`;
      item.innerHTML = `
        <a href="../movie-library.html?id=${id}" class="poster-link">
          <div class="poster-wrapper">
            <img class="lazy-img" data-src="${poster}" alt="${movie.title}" loading="lazy" />
            ${useLandscape ? `<div class="poster-logo" data-movie-id="${id}"></div>` : ''}
          </div>
          <div class="explore-info">
            <h4 title="${movie.title}">${movie.title}</h4>
          </div>
        </a>
      `;

      exploreGrid.appendChild(item);

      // Observe for lazy loading
      const img = item.querySelector('img.lazy-img');
      if (img) lazyImageObserver.observe(img);

      // Fetch logo for desktop
      if (useLandscape) {
        const imgRes = await fetch(`https://api.themoviedb.org/3/movie/${id}/images?api_key=${apiKey}`);
        const imgData = await imgRes.json();
        const logo = (imgData.logos || []).find(l =>
          (l.iso_639_1 === 'en' || l.iso_639_1 === null) && l.file_path
        );
        if (logo) {
          const logoDiv = item.querySelector('.poster-logo');
          const logoImg = document.createElement('img');
          logoImg.src = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
          logoImg.alt = `${movie.title} logo`;
          logoDiv.appendChild(logoImg);
        }
      }
    } catch (err) {
      console.warn('TBA Studios fetch failed for title:', title, err);
    }
  });
}

fetchTbaStudiosMovies();

//Noypi movies

const API_KEYS = [
  "AIzaSyD63mMKwcx0vD3tawZi9oPpCTevMScGovg",
  "AIzaSyDdLYRbieIHKT6ctIMHKBLpFu_7wN9IDWM",
  "AIzaSyAGuSuIdqJ3XgXvcZcOi-bQ7IeNLM1FmYU",
  "AIzaSyCr12Nkao0bKbkoRa7Sv-i6vkY13RZO21s",
  "AIzaSyBKhO3ultb3y1VYZWtZY4MrqbYBkioJfeI",
  "AIzaSyBDnrX2tnIh4OZlF76FxdBKtXXMpjpD_0c",
  "AIzaSyBfbjxyEjJVCHIF7iuYNA069DinpIf-xXw",
  "AIzaSyAwpFL8uh-b41MzxBKmWgvqLBvnzSf6Kn0",
  "AIzaSyBt6EVvDjREqptzWzrZ0vWt9ESV71uBLCM",
  "AIzaSyDSSjW00ElOVvYS78S8etfny-OYWu0NcvU",
  "AIzaSyBc6xDbA8JRCfHgMjv30YOqY_b-_whxkdg",
  "AIzaSyB8kMlp4xdi0vTypO0QjXwI41L1Se9EsZ4",
  "AIzaSyCifM0y-Pr0bkxL1vGnpwCQDLYHpOvgFZM",
  "AIzaSyAJ4KhxSFBFw-ir5oLYYH73Dp-lqt2bdVY",
  "AIzaSyBGwpUCdgZzvk353mJYOKL5UQdDa2yrouo",
  "AIzaSyC6uPQsZkl-RKRPqZg8R_cKThZODlWautQ",
  "AIzaSyCLJ0o5LT2S-7g0-CGT73PItH3FCVYEats",
  "AIzaSyAMwkcOaJ-9QYlzG2mWRR6j7cQ8_bi_4Vc",
  "AIzaSyCONoY1V0FIxMhv9esGpP1da23ZPuNSdes",
  "AIzaSyCHKcqfI2J5tSiz8XSESL6N-pFN59210G8",
  "AIzaSyBrE-vozKSRBjFQpCRJPe61KfoMaTj26UQ",
  "AIzaSyACNJLz2eyyfAKo7NFO8KtxTRunWBEnLLo",
  "AIzaSyBSPJkUIBFgZVh0s0ReWSd6m5-2vYUEfnc",
  "AIzaSyCkowKmlf5efmszyeKANpgXAktfdRLgQPQ",
  "AIzaSyBT82MbJgssJNaCGrMk6gBg5aY-cE01au4"
];

let currentApiKeyIndex = 0;

function getApiKey() {
  return API_KEYS[currentApiKeyIndex];
}

const channelIds = [
  "UCS_XKv_M_HXLP10TxLfKvEQ",
  "UCbaHbu02DtSydvFhrO4t1gg",
  "UC1D36wr10qyCfisHulZ5G8Q",
  "UC69I8egELqWywoX5wrh2KxQ",
  "UCI5YsqsHxdSlaj9ORrnu1DA",
  "UChh0rmwGvToBd3owvN2vRMg",
  "UCNP49xH_JCwxHIfKdN8dCQw",
  "UCstEtN0pgOmCf02EdXsGChw",
  "UCNJ4O0LvYuMOiOvS-g6eADA",
  "UCzggCZVkynvnjNV29L9EccA",
  "UCKL5hAuzgFQsyrsQKgU0Qng"
];

let allMovies = [];
let currentIndex = 0;
const moviesPerPage = 10;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function fetchFromChannel(channelId) {
  let success = false;
  let localApiIndex = currentApiKeyIndex;

  while (!success && localApiIndex < API_KEYS.length) {
    const apiKey = API_KEYS[localApiIndex];
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&q=full%20movie&type=video&videoDuration=long&maxResults=50&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error && data.error.code === 403) {
        localApiIndex++;
        continue;
      } else {
        success = true;
        return data.items || [];
      }
    } catch (error) {
      console.error(`Error fetching from channel ${channelId}:`, error);
      break;
    }
  }

  return [];
}

async function loadNoypiMovies() {
  const fetchPromises = channelIds.map(channelId => fetchFromChannel(channelId));
  const results = await Promise.all(fetchPromises);

  let movies = [];
  results.forEach(items => {
    if (items && items.length) {
      movies = movies.concat(items);
    }
  });

  if (movies.length === 0) {
    exploreGrid.innerHTML = "<p style='color: #ccc;'>No Noypi movies found.</p>";
    return;
  }

  shuffleArray(movies);
  allMovies = movies;
  currentIndex = 0;
  displayNoypiToExploreGrid();
}

function displayNoypiToExploreGrid() {
  exploreGrid.innerHTML = "";

  const moviesToShow = allMovies.slice(currentIndex, currentIndex + moviesPerPage);
  moviesToShow.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <img class="movie-image" src="${movie.snippet.thumbnails.medium.url}" alt="${movie.snippet.title}">
      <div class="movie-title">${movie.snippet.title}</div>
    `;
    card.onclick = () => openMoviePlayer(movie.id.videoId);
    exploreGrid.appendChild(card);
  });

  updatePaginationControls();
}

function openMoviePlayer(videoId) {
  const playerWrapper = document.getElementById("youtubePlayerWrapper");
  const player = document.getElementById("youtubePlayer");

  player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
  playerWrapper.style.display = "block";

  // Scroll to player smoothly
  playerWrapper.scrollIntoView({ behavior: "smooth" });
}

function showNextMovies() {
  if (currentIndex + moviesPerPage < allMovies.length) {
    currentIndex += moviesPerPage;
    displayNoypiToExploreGrid();
  }
}

function showPreviousMovies() {
  if (currentIndex - moviesPerPage >= 0) {
    currentIndex -= moviesPerPage;
    displayNoypiToExploreGrid();
  }
}

function updatePaginationControls() {
  const pagination = document.getElementById("paginationControls");
  if (allMovies.length <= moviesPerPage) {
    pagination.style.display = "none";
  } else {
    pagination.style.display = "block";
    pagination.querySelector("button[onclick='showPreviousMovies()']").disabled = currentIndex === 0;
    pagination.querySelector("button[onclick='showNextMovies()']").disabled = currentIndex + moviesPerPage >= allMovies.length;
  }
}

 const burger = document.getElementById('burger');
  const menu = document.getElementById('meowflexMenu');
  let hideTimeout;

  function getScreenType() {
    const width = window.innerWidth;
    if (width <= 500) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  let lastScreenType = getScreenType();

  // Toggle menu on burger click
  burger.addEventListener('click', () => {
    const isVisible = menu.style.display === 'block';

    menu.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        menu.style.display = 'none';
      }, 6000); // Auto-hide after 6 seconds
    }
  });

  // Hide menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !burger.contains(e.target)) {
      menu.style.display = 'none';
      clearTimeout(hideTimeout);
    }
  });

  // Auto-hide on screen resize (desktop/tablet/mobile switch)
  window.addEventListener('resize', () => {
    const currentScreenType = getScreenType();
    if (currentScreenType !== lastScreenType) {
      menu.style.display = 'none';
      clearTimeout(hideTimeout);
      lastScreenType = currentScreenType;
    }
  });
  
  
  
  //scrolling
// 🌀 Passive listeners for better mobile scroll handling
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('touchmove', () => {}, { passive: true });
window.addEventListener('scroll', () => {}, { passive: true });

// 🌀 Lazy-load images enhancement (optional if you're using native loading="lazy")
document.querySelectorAll('img').forEach(img => {
  if (!img.hasAttribute('loading')) {
    img.setAttribute('loading', 'lazy');
  }
});

// 🌀 ScrollTop inside requestAnimationFrame to avoid layout thrashing
function smoothScrollToBottom(el) {
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
  });
}

// Replace your usage of `messages.scrollTop = messages.scrollHeight` like this:
const messages = document.querySelector(".meowbot-messages");
if (messages) smoothScrollToBottom(messages);

// 🌀 Debounce helper (if you plan to attach scroll logic)
function debounce(fn, delay = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Example use (optional):
window.addEventListener('scroll', debounce(() => {
  // put scroll logic here if needed
}, 100), { passive: true });
