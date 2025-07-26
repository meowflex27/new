
const apiKey = 'ea97a714a43a0e3481592c37d2c7178a';
let genreMap = {};
let pinnedFavorites = JSON.parse(localStorage.getItem("meowbot_pinned") || "[]");


// Fetch genre mappings for both movies and TV shows
async function fetchGenreMap() {
  const [movieGenres, tvGenres] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`).then(res => res.json()),
    fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`).then(res => res.json())
  ]);

  [...movieGenres.genres, ...tvGenres.genres].forEach(genre => {
    genreMap[genre.id] = genre.name;
  });
}

async function fetchNetflixTrendingMixed() {
  await fetchGenreMap();

  const [movieRes, tvRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&watch_region=US&with_watch_providers=8&sort_by=popularity.desc`).then(res => res.json()),
    fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&watch_region=US&with_watch_providers=8&sort_by=popularity.desc`).then(res => res.json()),
  ]);

  const combined = [...movieRes.results, ...tvRes.results]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 20); // Limit to top 20

  const carousel = document.getElementById('trendingMixCarousel');
  if (!carousel) return;
  carousel.innerHTML = '';

  for (const item of combined) {
    const title = item.title || item.name || 'Untitled';
    const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    const genre = genreMap[item.genre_ids?.[0]] || 'N/A';
    const poster = item.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
      : 'https://via.placeholder.com/500x281?text=No+Image';

    const card = document.createElement('div');
    card.className = 'carousel-item';
    card.innerHTML = `
      <div class="poster-wrapper">
        <img src="${poster}" alt="${title}" />
        <div class="hover-overlay">
          <div class="overlay-bottom">
            <p class="meta">${genre}</p>
            <span class="type-label">${mediaType === 'movie' ? 'Movie' : 'TV'}</span>
          </div>
          <div class="play-button1"><i class="fas fa-play"></i></div>
        </div>
      </div>
      <div class="below-title">${title}</div>
    `;

    card.querySelector('.play-button1').addEventListener('click', () => {
      const url = mediaType === 'movie'
        ? `movie-library.html?id=${item.id}`
        : `tv-shows-library.html?id=${item.id}`;
      window.location.href = url;
    });

    carousel.appendChild(card);
  }
}

async function fetchGenreMap() {
  const [movieGenres, tvGenres] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`).then(res => res.json()),
    fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`).then(res => res.json())
  ]);

  [...movieGenres.genres, ...tvGenres.genres].forEach(genre => {
    genreMap[genre.id] = genre.name;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchNetflixTrendingMixed(); // 🔥 Netflix-only content
});

// Fetch trending movies and TV shows
async function fetchTrendingMixed() {
  const res = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`);
  const data = await res.json();
  return data.results.slice(0, 20);
}

// Fetch YouTube trailer key
async function fetchTrailerKey(id, mediaType) {
  const res = await fetch(`https://api.themoviedb.org/3/${mediaType}/${id}/videos?api_key=${apiKey}`);
  const data = await res.json();
  const trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

// Create a slide element (without immediately loading heavy data like trailer)
function createSlideSkeleton(item, index) {
  const title = item.title || item.name;
  const overview = item.overview || "No description available.";
  const genres = (item.genre_ids || [])
    .map(id => genreMap[id])
    .filter(Boolean)
    .slice(0, 1)
    .join(', ') || 'Genre';

  const tmdbRating = item.vote_average || 0;
  const ratingOutOf5 = (tmdbRating / 2).toFixed(1);
  const roundedStars = Math.round(ratingOutOf5 * 2) / 2;

  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (roundedStars >= i) {
      stars += '<i class="fas fa-star"></i>';
    } else if (roundedStars >= i - 0.5) {
      stars += '<i class="fas fa-star-half-alt"></i>';
    } else {
      stars += '<i class="far fa-star"></i>';
    }
  }

  return `
    <div class="slide${index === 0 ? ' active' : ''}" data-index="${index}" data-loaded="false" data-id="${item.id}" data-type="${item.media_type}" data-backdrop="${item.backdrop_path}">
      <div class="slide-background-overlay"></div>

      <div class="slide-content">
        ${item.logo_path ? `<img class="show-logo" src="https://image.tmdb.org/t/p/original${item.logo_path}" alt="${title} Logo" />` : `<h1>${title}</h1>`}

        <div class="slide-meta">
          <span class="rating gold-rating" data-rating="${ratingOutOf5}">
            <span class="stars" style="color: #FFFF00;">${stars}</span>
            <span class="rating-value" style="color: #FFFF00;">${ratingOutOf5}</span>
          </span>

          <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg" class="imdb-logo" alt="IMDb" />
          <span class="meta-info">${genres}</span>
          <span class="type-badge">${item.media_type === 'tv' ? 'TV' : 'Movie'}</span>
        </div>

        <p class="overview">${overview}</p>

        <div class="slide-actions">
          <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
        </div>
      </div>
    </div>
  `;
}

// Redirect logic for Play Now button with ID
document.addEventListener('click', function (e) {
  if (e.target.closest('.play-button')) {
    const slide = e.target.closest('.slide');
    const mediaType = slide.dataset.type;
    const id = slide.dataset.id;

    if (mediaType === 'movie') {
      window.location.href = `movie-library.html?id=${id}`;
    } else if (mediaType === 'tv') {
      window.location.href = `tv-shows-library.html?id=${id}`;
    }
  }
});



// Load full slide content (backdrop + trailer) on demand
async function loadSlideContent(slide) {
  const isLoaded = slide.dataset.loaded === 'true';
  if (isLoaded) return;

  const id = slide.dataset.id;
  const type = slide.dataset.type;
  const backdrop = slide.dataset.backdrop;

  if (backdrop) {
    slide.style.backgroundImage = `url('https://image.tmdb.org/t/p/original${backdrop}')`;
  } else {
    slide.style.backgroundImage = `url('https://via.placeholder.com/1280x720?text=No+Image')`;
  }

  const trailerUrl = await fetchTrailerKey(id, type);
  const btn = slide.querySelector('.trailer-button-container');
  if (btn) btn.setAttribute('data-trailer', trailerUrl);

  slide.dataset.loaded = 'true';
}

// Initialize hero slider with lazy loading
async function initHeroSlider() {
  await fetchGenreMap();
  const slider = document.getElementById('heroSlider');
  const items = await fetchTrendingMixed();

  slider.innerHTML = items.map((item, index) => createSlideSkeleton(item, index)).join('');

  const slides = slider.querySelectorAll('.slide');
  let current = 0;

  // Load first slide immediately
  loadSlideContent(slides[0]);

  setInterval(() => {
    slides[current].classList.remove('active');

    current = (current + 1) % slides.length;
    slides[current].classList.add('active');

    // Lazy-load upcoming slide content
    loadSlideContent(slides[current]);
  }, 5000);
}

// Load trailer on click
function loadTrailer(button) {
  const slide = button.closest('.slide');
  const trailerUrl = button.getAttribute('data-trailer');
  if (trailerUrl) {
    openTrailerModal(trailerUrl);
  }
}

document.addEventListener('DOMContentLoaded', initHeroSlider);

// Trailer modal logic
function openTrailerModal(url) {
  const modal = document.getElementById('trailerModal');
  const iframe = document.getElementById('trailerIframe');

  if (url.includes("youtube.com/watch")) {
    const videoId = url.split("v=")[1].split("&")[0];
    url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0];
    url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  iframe.src = url;
  modal.style.display = "flex";
}

function closeTrailerModal() {
  const modal = document.getElementById('trailerModal');
  const iframe = document.getElementById('trailerIframe');
  modal.style.display = 'none';
  iframe.src = '';
}


document.addEventListener('DOMContentLoaded', initHeroSlider);

// Trailer button animation
const trailerBtn = document.querySelector('.trailer-button-container');
if (trailerBtn) {
  trailerBtn.addEventListener('click', () => {
    trailerBtn.classList.add('clicked');
    setTimeout(() => {
      trailerBtn.classList.remove('clicked');
    }, 1000);
  });
}

// Trailer modal
function openTrailerModal(url) {
  const modal = document.getElementById('trailerModal');
  const iframe = document.getElementById('trailerIframe');

  if (url.includes("youtube.com/watch")) {
    const videoId = url.split("v=")[1].split("&")[0];
    url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0];
    url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  iframe.src = url;
  modal.style.display = "flex";
}

function closeTrailerModal() {
  const modal = document.getElementById('trailerModal');
  const iframe = document.getElementById('trailerIframe');
  modal.style.display = 'none';
  iframe.src = '';
}

//Carousell slider
function scrollCarousel(direction, carouselId) {
  const scrollAmount = 300;
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  if (direction === 'left') {
    carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  } else {
    carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }
}

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

//Notifications

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
    ? `movie-library.html?id=${id}`
    : `tv-shows-library.html?id=${id}`;
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


//Carousel script

let currentKDramaPage = 1;
let isLoadingKDrama = false;
let maxKDramaPages = 5;
let kDramaLoadedCount = 0;
const maxKDramaCount = 50;

// ==================== GENRE MAP FETCHER ====================
async function getGenreMap() {
  const [movieGenres, tvGenres] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`).then(res => res.json()),
    fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`).then(res => res.json())
  ]);
  const genreMap = {};
  movieGenres.genres.concat(tvGenres.genres).forEach(g => {
    genreMap[g.id] = g.name;
  });
  return genreMap;
}

// ==================== UNIVERSAL CARD RENDERER ====================
function createCard({ poster, logoImg, title, url, mediaType }) {
  const card = document.createElement('div');
  card.classList.add('carousel-item');
  card.innerHTML = `
    <a href="${url}" class="poster-link">
      <div class="poster-wrapper">
        <img src="${poster}" alt="${title}" />
        <div class="media-type-label">${mediaType?.toUpperCase()}</div>
        <div class="title-wrapper">
          ${logoImg ? `<img src="${logoImg}" alt="logo" class="title-logo" />` : `<h3 class="fallback-title">${title}</h3>`}
        </div>
      </div>
    </a>
    <div class="below-title">${title}</div>
  `;
  return card;
}


// ==================== TRENDING MOVIES & TV SHOWS ====================
async function fetchTrending() {
  const carousel = document.getElementById('trendingCarousel');
  if (!carousel) return;

  try {
    const res = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}`);
    const data = await res.json();
    const genreMap = await getGenreMap();

    for (const item of data.results.slice(0, 20)) {
      const title = item.title || item.name || 'No Title';
      const poster = item.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
        : 'https://via.placeholder.com/500x281?text=No+Image';

      const url = item.media_type === 'movie'
        ? `movie-library.html?id=${item.id}`
        : `tv-shows-library.html?id=${item.id}`;

      let logoImg = '';
      try {
        const logoRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}/images?api_key=${apiKey}`);
        const logoData = await logoRes.json();
        const logoPath = logoData.logos?.find(l => l.file_path && l.iso_639_1 === 'en')?.file_path;
        if (logoPath) logoImg = `https://image.tmdb.org/t/p/w500${logoPath}`;
      } catch (e) {
        console.warn('Logo fetch failed:', e);
      }

      const card = createCard({ poster, logoImg, title, url, mediaType: item.media_type });
      carousel.appendChild(card);
    }
  } catch (err) {
    console.error('Failed to load trending data:', err);
  }
}

// ==================== GENERIC PLATFORM FETCHER ====================
async function fetchTrendingContent(providerId, carouselId, platformName) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  try {
    const [movieRes, tvRes, genreMap] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc`).then(r => r.json()),
      getGenreMap()
    ]);

    const combined = [];
    const movies = movieRes.results.slice(0, 10);
    const tvs = tvRes.results.slice(0, 10);

    for (let i = 0; i < 10; i++) {
      if (movies[i]) combined.push({ ...movies[i], media_type: 'movie' });
      if (tvs[i]) combined.push({ ...tvs[i], media_type: 'tv' });
    }

    for (const item of combined) {
      const title = item.title || item.name || 'No Title';
      const poster = item.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
        : 'https://via.placeholder.com/500x281?text=No+Image';

      const url = item.media_type === 'movie'
        ? `movie-library.html?id=${item.id}`
        : `tv-shows-library.html?id=${item.id}`;

      let logoImg = '';
      try {
        const logoRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}/images?api_key=${apiKey}`);
        const logoData = await logoRes.json();
        const logoPath = logoData.logos?.find(l => l.file_path && l.iso_639_1 === 'en')?.file_path;
        if (logoPath) logoImg = `https://image.tmdb.org/t/p/w500${logoPath}`;
      } catch (e) {
        console.warn(`${platformName} logo fetch failed:`, e);
      }

      const card = createCard({ poster, logoImg, title, url, mediaType: item.media_type });
      carousel.appendChild(card);
    }
  } catch (err) {
    console.error(`Failed to load ${platformName} content:`, err);
  }
}

// ==================== K-DRAMA FETCHER ====================
async function fetchTrendingKDrama(carouselId, platformName) {
  const carousel = document.getElementById(carouselId);
  if (!carousel || isLoadingKDrama || currentKDramaPage > maxKDramaPages || kDramaLoadedCount >= maxKDramaCount) return;

  isLoadingKDrama = true;
  const today = new Date().toISOString().split('T')[0];

  try {
    const [tvRes, genreData] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_original_language=ko&sort_by=first_air_date.desc&include_adult=false&first_air_date.lte=${today}&vote_average.gte=3&page=${currentKDramaPage}`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`).then(r => r.json())
    ]);

    const genreMap = {};
    genreData.genres.forEach(g => genreMap[g.id] = g.name);

    const validItems = tvRes.results.filter(item => item.backdrop_path);
    if (!validItems.length) return;

    for (const item of validItems) {
      if (kDramaLoadedCount >= maxKDramaCount) break;

      const title = item.name || 'No Title';
      const poster = `https://image.tmdb.org/t/p/w780${item.backdrop_path}`;
      const url = `tv-shows-library.html?id=${item.id}`;

      let logoImg = '';
      try {
        const logoRes = await fetch(`https://api.themoviedb.org/3/tv/${item.id}/images?api_key=${apiKey}`);
        const logoData = await logoRes.json();
        let logoPath = logoData.logos?.find(l => l.file_path && l.iso_639_1 === 'en')?.file_path;
if (!logoPath) {
  logoPath = logoData.logos?.find(l => l.file_path && l.iso_639_1 === 'ko')?.file_path;
}
if (logoPath) logoImg = `https://image.tmdb.org/t/p/w500${logoPath}`;

      } catch (e) {
        console.warn(`${platformName} logo fetch failed:`, e);
      }

      const wrapper = document.createElement('div');
      wrapper.classList.add('carousel-card-wrapper');
      const card = createCard({ poster, logoImg, title, url, mediaType: 'tv' });

      wrapper.appendChild(card);
      carousel.appendChild(wrapper);

      kDramaLoadedCount++;
    }

    currentKDramaPage++;
  } catch (err) {
    console.error(`Failed to load ${platformName} content:`, err);
  } finally {
    isLoadingKDrama = false;
  }
}

function setupKDramaLazyLoad(carouselId) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  carousel.addEventListener("scroll", () => {
    if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 100) {
      fetchTrendingKDrama(carouselId, "K-Drama");
    }
  });
}

// ==================== BOOTSTRAP ====================
document.addEventListener("DOMContentLoaded", () => {
  fetchTrending();

  fetchTrendingKDrama("kdramaCarousel", "K-Drama");
  setupKDramaLazyLoad("kdramaCarousel");

  fetchTrendingContent(8, 'netflixCarousel', 'Netflix');
  fetchTrendingContent(350, 'appleCarousel', 'Apple TV+');
  fetchTrendingContent(15, 'huluCarousel', 'Hulu');
  fetchTrendingContent(337, 'disneyCarousel', 'Disney+');
  fetchTrendingContent(9, 'primeCarousel', 'Amazon Prime');
  fetchTrendingContent(531, 'paramountCarousel', 'Paramount+');
  fetchTrendingContent(386, 'peacockCarousel', 'Peacock');
  fetchTrendingContent(192, 'youtubeCarousel', 'YouTube');
  fetchTrendingContent(283, 'crunchyCarousel', 'Crunchyroll');
  fetchTrendingContent(464, 'plutoCarousel', 'Pluto TV');
  fetchTrendingContent(37, 'showtimeCarousel', 'Showtime');
  fetchTrendingContent(389, 'tubiCarousel', 'Tubi TV');
  fetchTrendingContent(443, 'slingCarousel', 'Sling TV');
  fetchTrendingContent(194, 'rakutenCarousel', 'Rakuten TV');
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




function activateSlide(index) {
  const slides = document.querySelectorAll('.slide');
  slides.forEach((slide, i) => {
    const h1 = slide.querySelector('.slide-content h1');
    slide.classList.remove('active');
    if (h1) h1.classList.remove('slide-in-right'); // Reset animation

    if (i === index) {
      slide.classList.add('active');
      // Trigger animation (force reflow to restart it)
      if (h1) {
        void h1.offsetWidth; // Reflow hack
        h1.classList.add('slide-in-right');
      }
    }
  });
}

  function toggleMoreMenu() {
    document.getElementById("moreMenu").classList.toggle("show");
  }
  
  
  
async function fetchPinoyNetflixTrending(carouselId) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  const allMovies = [];

  // Fetch multiple pages to gather ~100+
  for (let page = 1; page <= 5; page++) {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_original_language=tl&with_watch_providers=8&watch_region=PH&region=PH&include_adult=false&sort_by=popularity.desc&page=${page}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.results?.length) {
        allMovies.push(...data.results.filter(m => m.backdrop_path || m.poster_path));
      }
    } catch (e) {
      console.warn('Error fetching page', page, e);
    }
  }

  // Shuffle and select 50
  const shuffled = allMovies.sort(() => 0.5 - Math.random()).slice(0, 50);

  for (const movie of shuffled) {
    const id = movie.id;
    const title = movie.title || 'Untitled';
    const poster = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
      : `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

    const url = `movie-library.html?id=${id}`;

    let logoImg = '';
    try {
      const logoRes = await fetch(`https://api.themoviedb.org/3/movie/${id}/images?api_key=${apiKey}`);
      const logoData = await logoRes.json();
      const logoPath = logoData.logos?.find(l =>
        l.file_path && (l.iso_639_1 === 'tl' || l.iso_639_1 === 'en' || l.iso_639_1 === null)
      )?.file_path;
      if (logoPath) logoImg = `https://image.tmdb.org/t/p/w500${logoPath}`;
    } catch (e) {
      console.warn('Pinoy logo fetch failed:', e);
    }

    const card = createCard({ poster, logoImg, title, url, mediaType: 'movie' });
    carousel.appendChild(card);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  fetchPinoyNetflixTrending("pinoyNetflixCarousel");
});


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

