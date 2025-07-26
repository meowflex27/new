
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



//Trending movies and tv shows
const carousel = document.getElementById('trendingCarousel');

async function fetchTrending() {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}`);
    const data = await res.json();

    const [movieGenres, tvGenres] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`).then(res => res.json()),
      fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`).then(res => res.json())
    ]);
    const genreMap = {};
    movieGenres.genres.concat(tvGenres.genres).forEach(g => {
      genreMap[g.id] = g.name;
    });

    const carousel = document.getElementById('trendingCarousel');


    for (const item of data.results.slice(0, 20)) {
      const title = item.title || item.name || 'No Title';
      const poster = item.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
        : 'https://via.placeholder.com/500x281?text=No+Image';
      const typeLabel = item.media_type === 'movie' ? 'Movie' : 'TV Show';
      const genreNames = genreMap[item.genre_ids?.[0]] || 'N/A';

      // Get duration
      let duration = 'Unknown';
      const detailsUrl = `https://api.themoviedb.org/3/${item.media_type}/${item.id}?api_key=${apiKey}`;
      try {
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        const minutes = item.media_type === 'movie'
          ? detailsData.runtime
          : detailsData.episode_run_time?.[0];
        if (minutes && !isNaN(minutes)) {
          const hours = (minutes / 60).toFixed(1).replace('.0', '');
          duration = `${hours} hr`;
        }
      } catch (e) {
        console.warn('Failed to fetch runtime:', e);
      }

      // Fetch logo (PNG title image)
      let logoImg = '';
      try {
        const logoRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}/images?api_key=${apiKey}`);
        const logoData = await logoRes.json();
        const logos = logoData.logos || [];
        const logoPath = logos.find(l => l.file_path && l.iso_639_1 === 'en')?.file_path;
        if (logoPath) {
          logoImg = `https://image.tmdb.org/t/p/w500${logoPath}`;
        }
      } catch (e) {
        console.warn('Failed to fetch logo:', e);
      }

      const card = document.createElement('div');
      card.classList.add('carousel-item');

card.innerHTML = `
  <div class="poster-wrapper">
    <img src="${poster}" alt="${title}" />
    
    <div class="title-wrapper">
      ${
        logoImg 
          ? `<img src="${logoImg}" alt="logo" class="title-logo" />`
          : `<h3 class="fallback-title">${title}</h3>`
      }
    </div>

    <div class="hover-overlay">
      <div class="overlay-bottom">
        <p class="meta">${genreNames}</p>
        <span class="type-label">${typeLabel}</span>
      </div>
      <div class="play-button1">
        <i class="fas fa-play"></i>
      </div>
    </div>
  </div>

  <div class="below-title">
    ${title}
  </div>
`;

const playButton = card.querySelector('.play-button1');
if (playButton) {
  playButton.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent triggering any parent click events
    const url = item.media_type === 'movie'
      ? `movie-library.html?id=${item.id}`
      : `tv-shows-library.html?id=${item.id}`;
    window.location.href = url;
  });
}

      carousel.appendChild(card);
    }
  } catch (err) {
    console.error('Failed to load trending data:', err);
  }
}

fetchTrending();


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


//Netflix

async function fetchNetflixTrending() {
  const carousel = document.getElementById('netflixCarousel');
  if (!carousel) return;

  try {
    const [movieRes, tvRes, genreMovieRes, genreTvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_watch_providers=8&watch_region=US&sort_by=popularity.desc`),
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_watch_providers=8&watch_region=US&sort_by=popularity.desc`),
      fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`),
      fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`)
    ]);

    const [movieData, tvData, genreMovieData, genreTvData] = await Promise.all([
      movieRes.json(),
      tvRes.json(),
      genreMovieRes.json(),
      genreTvRes.json()
    ]);

    const genreMap = {};
    genreMovieData.genres.concat(genreTvData.genres).forEach(g => {
      genreMap[g.id] = g.name;
    });

    const combined = [];
    const movies = movieData.results.slice(0, 10);
    const tvs = tvData.results.slice(0, 10);

    for (let i = 0; i < 10; i++) {
      if (movies[i]) combined.push({ ...movies[i], media_type: 'movie' });
      if (tvs[i]) combined.push({ ...tvs[i], media_type: 'tv' });
    }

    for (const item of combined) {
      const title = item.title || item.name || 'No Title';
	  const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';

      const poster = item.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
        : 'https://via.placeholder.com/500x281?text=No+Image';
      const typeLabel = item.media_type === 'movie' ? 'Movie' : 'TV Show';
      const genreNames = genreMap[item.genre_ids?.[0]] || 'N/A';

      // Duration
      let duration = 'Unknown';
      try {
        const detailsRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}?api_key=${apiKey}`);
        const details = await detailsRes.json();
        const minutes = item.media_type === 'movie' ? details.runtime : details.episode_run_time?.[0];
        if (minutes && !isNaN(minutes)) {
          const hours = (minutes / 60).toFixed(1).replace('.0', '');
          duration = `${hours} hr`;
        }
      } catch (e) {
        console.warn('Duration fetch failed:', e);
      }

      // Logo
      let logoImg = '';
      try {
        const logoRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}/images?api_key=${apiKey}`);
        const logoData = await logoRes.json();
        const logoPath = logoData.logos?.find(l => l.file_path && l.iso_639_1 === 'en')?.file_path;
        if (logoPath) logoImg = `https://image.tmdb.org/t/p/w500${logoPath}`;
      } catch (e) {
        console.warn('Logo fetch failed:', e);
      }

      const card = document.createElement('div');
      card.classList.add('carousel-item');

      card.innerHTML = `
        <div class="poster-wrapper">
          <img src="${poster}" alt="${title}" />
          <div class="title-wrapper">
            ${logoImg ? `<img src="${logoImg}" alt="logo" class="title-logo" />` : `<h3 class="fallback-title">${title}</h3>`}
          </div>
          <div class="hover-overlay">
            <div class="overlay-bottom">
              <p class="meta">${genreNames}</p>
              <span class="type-label">${typeLabel}</span>
            </div>
            <div class="play-button1">
              <i class="fas fa-play"></i>
            </div>
          </div>
        </div>
        <div class="below-title">${title}</div>
      `;

      const playButton = card.querySelector('.play-button1');
      playButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = item.media_type === 'movie'
          ? `movie-library.html?id=${item.id}`
          : `tv-shows-library.html?id=${item.id}`;
        window.location.href = url;
      });

      carousel.appendChild(card);
    }
  } catch (err) {
    console.error('Failed to load Netflix content:', err);
  }
}


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

 
//Ai chatbot 
let trendingCache = [];
let alreadyRecommendedIds = new Set();
let currentGenre = null;
let currentActor = null;
let actorResults = [];
let actorOffset = 0;


const GENRE_MAP = {
  28: "Action", 35: "Comedy", 18: "Drama", 27: "Horror",
  10749: "Romance", 53: "Thriller", 878: "Sci-Fi", 14: "Fantasy"
};

const GENRE_ID_MAP = {
  action: 28, comedy: 35, drama: 18, horror: 27,
  romance: 10749, thriller: 53, "sci-fi": 878, fantasy: 14
};

async function loadTrendingContent() {
  trendingCache = [];

  for (let page = 1; page <= 10; page++) {
    try {
      // Fetch trending movies
      const movieRes = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${page}`);
      const movieData = await movieRes.json();
      const movieItems = movieData.results
        .filter(item => item.poster_path && item.genre_ids?.length)
        .map(item => ({ ...item, media_type: "movie" }));

      // Fetch trending TV shows
      const tvRes = await fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&page=${page}`);
      const tvData = await tvRes.json();
      const tvItems = tvData.results
        .filter(item => item.poster_path && item.genre_ids?.length)
        .map(item => ({ ...item, media_type: "tv" }));

      trendingCache.push(...movieItems, ...tvItems);
    } catch (e) {
      console.error(`Error loading trending content on page ${page}:`, e);
    }
  }

  showDailyPick();
  restoreChatHistory();
}


function getGenreName(id) {
  return GENRE_MAP[id] || null;
}

function getGenreId(name) {
  return GENRE_ID_MAP[name.toLowerCase()] || 0;
}

function generateCardHTML(item) {
  const title = item.title || item.name;
  const poster = `https://image.tmdb.org/t/p/w185${item.poster_path}`;
  const type = item.media_type === 'movie' ? "Movie" : "TV Show";
  const release = item.release_date || item.first_air_date || "Unknown";
  const genres = item.genre_ids?.map(getGenreName).filter(Boolean).join(", ") || "N/A";
  const url = `movie-library.html?id=${item.id}`;
  const rating = item.vote_average?.toFixed(1) || "N/A";
  const popularity = item.popularity?.toFixed(0) || "N/A";

  return `
    <div class="meowbot-card">
      <img src="${poster}" alt="${title}" class="meowbot-thumb" />
      <div class="meowbot-info">
        <div class="meowbot-title"><a href="${url}" class="meowbot-link">${title}</a></div>
        <div class="meowbot-meta">Type: ${type}</div>
        <div class="meowbot-meta">Genre: ${genres}</div>
        <div class="meowbot-meta">Release: ${release}</div>
        <div class="meowbot-meta">⭐ ${rating} • 🔥 ${popularity}</div>
      </div>
    </div>
  `;
}

function getFreshPicks(limit = 5, genre = null) {
  let pool = trendingCache.filter(item => !alreadyRecommendedIds.has(item.id));
  if (genre) {
    const genreId = getGenreId(genre);
    pool = pool.filter(item => item.genre_ids?.includes(genreId));
  }
  const picks = pool.slice(0, limit);
  picks.forEach(item => alreadyRecommendedIds.add(item.id));
  return picks;
}

function addToWatchlist(item) {
  const list = JSON.parse(localStorage.getItem("meowbot_watchlist") || "[]");
  if (!list.some(i => i.id === item.id)) {
    list.push(item);
    localStorage.setItem("meowbot_watchlist", JSON.stringify(list));
    appendMessage(`${item.title || item.name} added to your watchlist!`, "bot");
  } else {
    appendMessage("Already in your watchlist! 🐾", "bot");
  }
}

function showWatchlist() {
  const list = JSON.parse(localStorage.getItem("meowbot_watchlist") || "[]");
  if (!list.length) {
    appendMessage("Your watchlist is empty. Add some titles!", "bot");
    return;
  }
  appendMessage(`Here’s your watchlist: ${list.map(generateCardHTML).join("")}`, "bot", true);
}

function showDailyPick(silent = false) {
  const today = new Date().toDateString();
  if (localStorage.getItem("meowbot_last_pick_date") === today) return;
  const pick = trendingCache[Math.floor(Math.random() * trendingCache.length)];
  appendMessage(`🎉 Daily Pick: ${generateCardHTML(pick)}`, "bot", true, silent);
  localStorage.setItem("meowbot_last_pick_date", today);
}


async function generateBotResponse(msg) {
  msg = msg.toLowerCase().trim();
  const greetings = ["hi", "hello", "hey", "yo", "sup"];
  const farewells = ["bye", "goodbye", "see you"];
  const thanks = ["thanks", "thank you", "ty", "thx"];
  const positives = ["cool", "awesome", "nice", "love it"];
  const genreKeys = Object.keys(GENRE_ID_MAP);
  const random = arr => arr[Math.floor(Math.random() * arr.length)];
  const rememberedGenre = localStorage.getItem("meowbot_last_genre");

  const moodMap = {
    bored: "action", sad: "comedy", happy: "romance", romantic: "romance",
    scared: "horror", sleepy: "fantasy", stressed: "drama", excited: "thriller", lazy: "sci-fi"
  };

  if (greetings.some(g => msg.includes(g))) {
    alreadyRecommendedIds.clear();
    currentGenre = null;
    return { text: random([
      "Hey! Need some new picks?",
      "Hello there, movie explorer!",
      rememberedGenre ? `Want more ${rememberedGenre} picks?` : "Need a genre to start with?"
    ]) };
  }

  if (thanks.some(t => msg.includes(t))) {
    return { text: random(["You're welcome!", "Anytime!", "Always ready to suggest more!"]) };
  }

  if (farewells.some(f => msg.includes(f))) {
    return { text: "Catch you later! Don’t forget the popcorn! 🍿" };
  }

  if (positives.some(p => msg.includes(p))) {
    return { text: "Right? I knew you’d love it!" };
  }

  if (msg.includes("watchlist")) {
    showWatchlist();
    return { text: "Here's what you've saved." };
  }

  for (let mood in moodMap) {
    if (msg.includes(mood)) {
      const genre = moodMap[mood];
      currentGenre = genre;
      alreadyRecommendedIds.clear();
      localStorage.setItem("meowbot_last_genre", genre);
      const picks = getFreshPicks(5, genre);
      return { text: `Feeling ${mood}? Try these: ${picks.map(generateCardHTML).join("")}`, onlyTitles: true };
    }
  }

  if (msg.includes("surprise")) {
    if (!trendingCache.length) return { text: "Still loading titles… try again in a moment!" };
    const pool = trendingCache.filter(item => !alreadyRecommendedIds.has(item.id));
    if (!pool.length) return { text: "You're all caught up!" };
    const pick = pool[Math.floor(Math.random() * pool.length)];
    alreadyRecommendedIds.add(pick.id);
    return { text: `🎁 Surprise pick: ${generateCardHTML(pick)}`, onlyTitles: true };
  }

if (msg.includes("more")) {
  if (currentActor && actorResults.length > actorOffset) {
    const nextBatch = actorResults.slice(actorOffset, actorOffset + 6);
    actorOffset += 6;
    if (nextBatch.length) {
      appendMessage(`🎬 More picks with ${currentActor}: ${nextBatch.map(generateCardHTML).join("")}`, "bot", true);
      return { text: `More titles with ${currentActor} coming up!`, onlyTitles: true };
    } else {
      return { text: `You've seen all we found for ${currentActor}. 😺` };
    }
  }

  const picks = getFreshPicks(5, currentGenre);
  return { text: `Here's more: ${picks.map(generateCardHTML).join("")}`, onlyTitles: true };
}


  // 🎬 Actor search with keyword triggers
  if (msg.includes("find") || msg.includes("about") || msg.includes("by") || msg.includes("with")) {
    const query = msg.replace(/(find|about|me|watch|suggest|recommend|movie|tv|with|by|featuring|starring)/gi, "").trim();
    return await searchActor(query);
  }

  // 🎭 Final fallback – try interpreting as actor name directly
  const actorResponse = await searchActor(msg);
  if (actorResponse) return actorResponse;

  // 🎞️ Fallback to trending
  const picks = getFreshPicks(5);
  return { text: `Here’s what’s trending: ${picks.map(generateCardHTML).join("")}`, onlyTitles: true };
}

async function searchActor(query) {
  try {
    const personRes = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(query)}`);
    const personData = await personRes.json();
    if (!personData.results?.length) return null;

    const actor = personData.results[0];
    const actorName = actor.name;

    const creditsRes = await fetch(`https://api.themoviedb.org/3/person/${actor.id}/combined_credits?api_key=${apiKey}&language=en-US`);
    const credits = await creditsRes.json();

    const filtered = credits.cast.filter(item =>
      item.poster_path &&
      (item.title || item.name) &&
      item.character &&
      (item.vote_count || 0) > 100
    );

    const normalized = filtered.map(item => ({
      ...item,
      media_type: item.media_type || (item.title ? "movie" : "tv")
    }));
    normalized.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));

    actorResults = normalized;
    actorOffset = 0;
    currentActor = actorName;

    const firstBatch = actorResults.slice(actorOffset, actorOffset + 6);
    actorOffset += 6;

if (firstBatch.length) {
  const buttonHTML = `
    <div style="text-align:center; margin-top: 10px;">
      <button class="see-all-btn" onclick="showAllActorResults()">👀 See All</button>
    </div>`;
  appendMessage(`🎬 Top picks with ${actorName}: ${firstBatch.map(generateCardHTML).join("")}${buttonHTML}`, "bot", true);
  return { text: `Here you go! Click "See All" for more titles with ${actorName}.`, onlyTitles: true };
}

	
	else {
      return { text: `Hmm—nothing major found for ${actorName}.` };
    }
  } catch (err) {
    console.error("Actor search error:", err);
    return null;
  }
}



function appendMessage(text, type = "bot", onlyTitles = false) {
  const messages = document.querySelector(".meowbot-messages");
  const div = document.createElement("div");
  div.className = `meowbot-msg ${type}`;
  div.innerHTML = "...";
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  saveChatHistory();

  setTimeout(() => {
    div.innerHTML = text;
    messages.scrollTop = messages.scrollHeight;
    if (type === "bot") speakText(text, onlyTitles);
    saveChatHistory();
  }, 600);
}

function saveChatHistory() {
  const messages = document.querySelector(".meowbot-messages").innerHTML;
  localStorage.setItem("meowbot_chat_history", messages);
}

function restoreChatHistory() {
  const history = localStorage.getItem("meowbot_chat_history");
  if (history) {
    document.querySelector(".meowbot-messages").innerHTML = history;
  }
}

function speakText(text, onlyTitles = false) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance();
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = text;

  utterance.lang = "en-US";
  utterance.pitch = 1.4;
  utterance.rate = 1.05;
  utterance.volume = 1.0;
  utterance.voice = speechSynthesis.getVoices().find(v =>
    v.name.toLowerCase().includes("google") || v.name.toLowerCase().includes("english")
  ) || speechSynthesis.getVoices()[0];

  if (onlyTitles) {
    const links = [...tempDiv.querySelectorAll(".meowbot-title a")];
    const titles = links.map(link => link.textContent.trim());
    utterance.text = titles.length ? `Here are some picks: ${titles.join(", ")}` : "";
  } else {
    utterance.text = tempDiv.innerText.replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  }

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

document.addEventListener("DOMContentLoaded", () => {
  loadTrendingContent();

  const toggle = document.querySelector(".meowbot-toggle");
  const chatbox = document.querySelector(".meowbot-chatbox");
  const input = document.getElementById("meowbotInput");
  const send = document.getElementById("meowbotSend");
  const mic = document.getElementById("meowbotMic");
  const genreSelect = document.getElementById("genreSelect");

  toggle.addEventListener("click", () => {
    chatbox.style.display = chatbox.style.display === "flex" ? "none" : "flex";
    chatbox.style.flexDirection = "column";
  });

  send.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
    appendMessage(text, "user");

    const { text: reply, onlyTitles } = await generateBotResponse(text);
    setTimeout(() => appendMessage(reply, "bot", onlyTitles), 500);

    input.value = "";
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") send.click();
  });

  const themeBtn = document.getElementById("themeToggle");
  if (localStorage.getItem("meowbot_theme") === "dark") {
    document.body.classList.add("meowbot-dark");
  }
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("meowbot-dark");
    const theme = document.body.classList.contains("meowbot-dark") ? "dark" : "light";
    localStorage.setItem("meowbot_theme", theme);
  });

  const clearChat = document.getElementById("clearChat");
  clearChat.addEventListener("click", () => {
    if (confirm("Clear all chat messages?")) {
      document.querySelector(".meowbot-messages").innerHTML = "";
      localStorage.removeItem("meowbot_chat_history");
      appendMessage("Chat cleared! Start fresh anytime. 😺", "bot");
    }
  });

  genreSelect.addEventListener("change", () => {
    const genre = genreSelect.value;
    if (!genre) return;
    currentGenre = genre;
    alreadyRecommendedIds.clear();
    localStorage.setItem("meowbot_last_genre", genre);
    const picks = getFreshPicks(5, genre);
    appendMessage(`🎬 Here's some ${genre} content: ${picks.map(generateCardHTML).join("")}`, "bot", true);
  });

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    mic.addEventListener("click", () => {
      recognition.start();
      mic.classList.add("listening");
    });

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      input.value = transcript;
      send.click();
    };

    recognition.onerror = (err) => {
      console.error("Voice error", err);
      appendMessage("🎤 Oops! Voice input didn’t work. Try again.", "bot");
    };

    recognition.onend = () => {
      mic.classList.remove("listening");
    };
  } else {
    mic.disabled = true;
    mic.title = "Voice input not supported in this browser.";
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest(".meowbot-link");
    if (link) {
      e.preventDefault();
      window.location.href = link.getAttribute("href");
    }

    if (!chatbox.contains(e.target) && !toggle.contains(e.target)) {
      chatbox.style.display = "none";
    }
  });
});


function showAllActorResults() {
  if (!currentActor || actorOffset >= actorResults.length) {
    appendMessage(`No more results to show for ${currentActor}.`, "bot");
    return;
  }

  const remaining = actorResults.slice(actorOffset);
  actorOffset = actorResults.length; // mark all as shown

  appendMessage(`📺 All remaining titles with ${currentActor}: ${remaining.map(generateCardHTML).join("")}`, "bot", true);
}




async function fetchTrendingContent(providerId, carouselId, platformName) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  try {
    const [movieRes, tvRes, genreMovieRes, genreTvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc`),
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc`),
      fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`),
      fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`)
    ]);

    const [movieData, tvData, genreMovieData, genreTvData] = await Promise.all([
      movieRes.json(),
      tvRes.json(),
      genreMovieRes.json(),
      genreTvRes.json()
    ]);

    const genreMap = {};
    genreMovieData.genres.concat(genreTvData.genres).forEach(g => {
      genreMap[g.id] = g.name;
    });

    const combined = [];
    const movies = movieData.results.slice(0, 10);
    const tvs = tvData.results.slice(0, 10);

    for (let i = 0; i < 10; i++) {
      if (movies[i]) combined.push({ ...movies[i], media_type: 'movie' });
      if (tvs[i]) combined.push({ ...tvs[i], media_type: 'tv' });
    }

    for (const item of combined) {
      const title = item.title || item.name || 'No Title';
      const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';

      const poster = item.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
        : 'https://via.placeholder.com/500x281?text=No+Image';
      const typeLabel = item.media_type === 'movie' ? 'Movie' : 'TV Show';
      const genreNames = genreMap[item.genre_ids?.[0]] || 'N/A';

      let duration = 'Unknown';
      try {
        const detailsRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}?api_key=${apiKey}`);
        const details = await detailsRes.json();
        const minutes = item.media_type === 'movie' ? details.runtime : details.episode_run_time?.[0];
        if (minutes && !isNaN(minutes)) {
          const hours = (minutes / 60).toFixed(1).replace('.0', '');
          duration = `${hours} hr`;
        }
      } catch (e) {
        console.warn(`${platformName} duration fetch failed:`, e);
      }

      let logoImg = '';
      try {
        const logoRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}/images?api_key=${apiKey}`);
        const logoData = await logoRes.json();
        const logoPath = logoData.logos?.find(l => l.file_path && l.iso_639_1 === 'en')?.file_path;
        if (logoPath) logoImg = `https://image.tmdb.org/t/p/w500${logoPath}`;
      } catch (e) {
        console.warn(`${platformName} logo fetch failed:`, e);
      }

      const card = document.createElement('div');
      card.classList.add('carousel-item');

      card.innerHTML = `
        <div class="poster-wrapper">
          <img src="${poster}" alt="${title}" />
          <div class="title-wrapper">
            ${logoImg ? `<img src="${logoImg}" alt="logo" class="title-logo" />` : `<h3 class="fallback-title">${title}</h3>`}
          </div>
          <div class="hover-overlay">
            <div class="overlay-bottom">
              <p class="meta">${genreNames}</p>
              <span class="type-label">${typeLabel}</span>
            </div>
            <div class="play-button1">
              <i class="fas fa-play"></i>
            </div>
          </div>
        </div>
        <div class="below-title">${title}</div>
      `;

      const playButton = card.querySelector('.play-button1');
      playButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = item.media_type === 'movie'
          ? `movie-library.html?id=${item.id}`
          : `tv-shows-library.html?id=${item.id}`;
        window.location.href = url;
      });

      carousel.appendChild(card);
    }
  } catch (err) {
    console.error(`Failed to load ${platformName} content:`, err);
  }
}


//Korean drama

let currentKDramaPage = 1;
let isLoadingKDrama = false;
let maxKDramaPages = 5;
let kDramaLoadedCount = 0;
const maxKDramaCount = 50;

async function fetchTrendingKDrama(carouselId, platformName) {
  const carousel = document.getElementById(carouselId);
  if (!carousel || isLoadingKDrama || currentKDramaPage > maxKDramaPages || kDramaLoadedCount >= maxKDramaCount) return;

  isLoadingKDrama = true;
  const today = new Date().toISOString().split('T')[0];

  try {
    const [tvRes, genreRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_original_language=ko&sort_by=first_air_date.desc&include_adult=false&first_air_date.lte=${today}&vote_average.gte=3&page=${currentKDramaPage}`),
      fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`)
    ]);

    const [tvData, genreData] = await Promise.all([tvRes.json(), genreRes.json()]);
    const genreMap = {};
    genreData.genres.forEach(g => genreMap[g.id] = g.name);

    const validItems = tvData.results.filter(item => item.backdrop_path);
    if (!validItems.length) return;

    for (const item of validItems) {
      if (kDramaLoadedCount >= maxKDramaCount) break;

      const title = item.name || 'No Title';
      const poster = `https://image.tmdb.org/t/p/w780${item.backdrop_path}`;
      const genreNames = genreMap[item.genre_ids?.[0]] || 'N/A';
      const typeLabel = 'TV Show';

      let logoImg = '';
      try {
        const logoRes = await fetch(`https://api.themoviedb.org/3/tv/${item.id}/images?api_key=${apiKey}`);
        const logoData = await logoRes.json();
        const logoPath = logoData.logos?.find(l => l.file_path && l.iso_639_1 === 'en')?.file_path;
        if (logoPath) logoImg = `https://image.tmdb.org/t/p/w500${logoPath}`;
      } catch (e) {
        console.warn(`${platformName} logo fetch failed:`, e);
      }

      // === Create wrapper ===
      const wrapper = document.createElement('div');
      wrapper.classList.add('carousel-card-wrapper');

      // === Poster Card ===
      const card = document.createElement('div');
      card.classList.add('carousel-item');

      card.innerHTML = `
        <div class="poster-wrapper">
          <img src="${poster}" alt="${title}" />
          <div class="title-wrapper">
            ${logoImg ? `<img src="${logoImg}" alt="logo" class="title-logo" />` : `<h3 class="fallback-title">${title}</h3>`}
          </div>
          <div class="hover-overlay">
            <div class="overlay-bottom">
              <p class="meta">${genreNames}</p>
              <span class="type-label">${typeLabel}</span>
            </div>
            <div class="play-button1">
              <i class="fas fa-play"></i>
            </div>
          </div>
        </div>
      `;

      const titleDiv = document.createElement('div');
      titleDiv.classList.add('below-title');
      titleDiv.textContent = title;

      // Click event for play button
      const playButton = card.querySelector('.play-button1');
      playButton.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `tv-shows-library.html?id=${item.id}`;
      });

      // Append card + title into wrapper, then into carousel
      wrapper.appendChild(card);
      wrapper.appendChild(titleDiv);
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

// === Lazy Load on Scroll ===
function setupKDramaLazyLoad(carouselId) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  carousel.addEventListener("scroll", () => {
    if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 100) {
      fetchTrendingKDrama(carouselId, "K-Drama");
    }
  });
}

// === Call on Page Load ===
document.addEventListener("DOMContentLoaded", () => {
  fetchTrendingKDrama("kdramaCarousel", "K-Drama");
  setupKDramaLazyLoad("kdramaCarousel");

  // Load other carousels
  fetchTrendingContent(350, 'appleCarousel', 'Apple TV+');
  fetchTrendingContent(15, 'huluCarousel', 'Hulu');
  fetchTrendingContent(337, 'disneyCarousel', 'Disney+');
  fetchTrendingContent(9, 'primeCarousel', 'Amazon Prime');
  fetchTrendingContent(384, 'hboCarousel', 'HBO Max');
  fetchTrendingContent(531, 'paramountCarousel', 'Paramount+');
  fetchTrendingContent(386, 'peacockCarousel', 'Peacock');
  fetchTrendingContent(8, 'netflixCarousel', 'Netflix');
  fetchTrendingContent(192, 'youtubeCarousel', 'YouTube');
  fetchTrendingContent(283, 'crunchyCarousel', 'Crunchyroll');
  fetchTrendingContent(37, 'showtimeCarousel', 'Showtime');
  fetchTrendingContent(464, 'plutoCarousel', 'Pluto TV');
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
