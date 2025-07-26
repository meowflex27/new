const apiKey = 'ea97a714a43a0e3481592c37d2c7178a';
const params = new URLSearchParams(window.location.search);
const movieId = params.get('movieId');
const id = params.get("id");

let pinnedFavorites = JSON.parse(localStorage.getItem("meowbot_pinned") || "[]");

const iframe = document.getElementById("movie-frame");
const select = document.getElementById("server-select");
const titleEl = document.getElementById("movie-title");
const downloadBtn = document.getElementById("download-btn");
let progressInterval;

function updateIframeSrc() {
  if (!id) {
    document.body.innerHTML = `<div class="error">Missing movie ID</div>`;
    return;
  }

  const baseUrl = select.value;
  let finalUrl;

  if (baseUrl.includes("vidsrc.cc/v2")) {
    // Server 1 - already supports autoplay
    finalUrl = `${baseUrl}/${id}?autoplay=true&poster=true&primarycolor=db0000&secondarycolor=a2a2a2&iconcolor=eefdec&server=2`;

  } else {
    // Servers 2–5 - add autoplay + fullscreen-like enhancements
    const queryParams = [
      "autoplay=true",
      "poster=true",
      "primarycolor=db0000",
      "secondarycolor=a2a2a2",
      "iconcolor=eefdec",
      "server=2"
    ];
    finalUrl = `${baseUrl}/${id}?${queryParams.join("&")}`;
  }

  iframe.src = finalUrl;

  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    try {
      const player = iframe.contentWindow?.player;
      if (player) {
        const timeWatched = Math.floor(player.currentTime || 0);
        const duration = Math.floor(player.duration || 1);
        const progress = Math.min(Math.floor((timeWatched / duration) * 100), 100);
        updateWatchProgress(id, progress);
      }
    } catch (e) {}
  }, 3000);
}

async function fetchMovieTitle(tmdbId) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`);
    if (!res.ok) throw new Error("TMDB not found");
    const data = await res.json();
    titleEl.textContent = data.title || "Untitled Movie";
    saveToContinueWatching(data);
  } catch (err) {
    titleEl.textContent = "Unknown Movie";
  }
}

if (select) {
  select.addEventListener("change", updateIframeSrc);
}

if (id) {
  fetchMovieTitle(id);
  updateIframeSrc();
  if (downloadBtn) {
    downloadBtn.href = `https://download-api-three.vercel.app/api/movie?tmdbId=${id}`;
  }
} else {
  document.body.innerHTML = `<div class="error">Missing movie ID</div>`;
  if (downloadBtn) downloadBtn.style.display = "none";
}

const infoContainer = document.getElementById("info-container");
const labels = document.querySelectorAll(".label");

labels.forEach(label => {
  label.addEventListener("click", () => {
    // Remove active class from all
    labels.forEach(lbl => lbl.classList.remove('active'));

    // Add active class to the clicked one
    label.classList.add('active');

    // Perform section switching
    const text = label.textContent.trim();
    if (text === "Overview") showOverview(id);
    else if (text === "Trailer") showTrailer(id);
    else if (text === "Cast") showCast(id);
    else if (text === "Gallery") showGallery(id);
    else if (text === "Reviews") showReviews(id);
  });
});

async function showOverview(id) {
  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`);
  const data = await res.json();
  const overview = data.overview || 'No overview available.';

  infoContainer.innerHTML = `
    <p class="overview-text clamp" id="overview-text">${overview}</p>
    <button id="toggle-overview" class="see-toggle">See More</button>
  `;

  const toggleBtn = document.getElementById("toggle-overview");
  const textEl = document.getElementById("overview-text");
  let expanded = false;

  toggleBtn.addEventListener("click", () => {
    expanded = !expanded;
    textEl.classList.toggle("clamp", !expanded);
    toggleBtn.textContent = expanded ? "See Less" : "See More";
  });
}


async function showTrailer(id, lazy = false) {
  const container = lazy ? document.getElementById("trailer-section") : infoContainer;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${apiKey}&language=en-US`);
    const data = await res.json();
    const trailers = data.results.filter(video => video.site === 'YouTube' && video.type.toLowerCase().includes('trailer'));

    if (trailers.length === 0) {
      container.innerHTML = `<p class="no-trailers">No trailers found.</p>`;
      return;
    }

    const trailerThumbnails = trailers.map(trailer => `
      <div class="trailer-thumb" data-key="${trailer.key}">
        <img src="https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg" alt="${trailer.name}" />
        <div class="trailer-name">${trailer.name}</div>
      </div>`).join('');

    container.innerHTML = `
      <div class="carousel-wrapper" id="trailer-carousel">
        <button class="carousel-btn left">&#10094;</button>
        <div class="carousel-inner">${trailerThumbnails}</div>
        <button class="carousel-btn right">&#10095;</button>
      </div>`;

    document.querySelectorAll('.trailer-thumb').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.getAttribute('data-key');
        openTrailerModal(key);
      });
    });

    attachCarouselScroll("trailer-carousel");
  } catch (err) {
    container.innerHTML = `<p class="no-trailers">Error loading trailers.</p>`;
  }
}

async function showCast(id, lazy = false) {
  const container = lazy ? document.getElementById("cast-section") : infoContainer;
  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`);
  const data = await res.json();

  const castHtml = data.cast.filter(actor => actor.profile_path).map(actor => `
    <div class="cast-card">
      <img src="https://image.tmdb.org/t/p/w185${actor.profile_path}" alt="${actor.name}" />
      <div class="cast-name">${actor.name}</div>
      <div class="cast-role">${actor.character}</div>
    </div>`).join('');

  if (castHtml) {
    container.innerHTML = `
      <div class="carousel-wrapper" id="cast-carousel">
        <button class="carousel-btn left">&#10094;</button>
        <div class="carousel-inner">${castHtml}</div>
        <button class="carousel-btn right">&#10095;</button>
      </div>`;
    attachCarouselScroll("cast-carousel");
  } else {
    container.innerHTML = `<p class="no-cast">No cast available.</p>`;
  }
}

async function showGallery(id, lazy = false) {
  const container = lazy ? document.getElementById("gallery-section") : infoContainer;
  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/images?api_key=${apiKey}`);
  const data = await res.json();

  const posters = data.posters.map(img => `
    <div class="gallery-card">
      <a href="https://image.tmdb.org/t/p/original${img.file_path}" target="_blank">
        <img src="https://image.tmdb.org/t/p/w342${img.file_path}" class="gallery-img poster" loading="lazy" />
      </a>
    </div>`).join('');

  const backdrops = data.backdrops.map(img => `
    <div class="gallery-card">
      <a href="https://image.tmdb.org/t/p/original${img.file_path}" target="_blank">
        <img src="https://image.tmdb.org/t/p/w500${img.file_path}" class="gallery-img backdrop" loading="lazy" />
      </a>
    </div>`).join('');

  container.innerHTML = `
    ${posters ? `<div class="carousel-wrapper advanced" id="posters-carousel">
      <button class="carousel-btn left">&#10094;</button>
      <div class="carousel-inner">${posters}</div>
      <button class="carousel-btn right">&#10095;</button>
    </div>` : ''}
    ${backdrops ? `<div class="carousel-wrapper advanced" id="backdrops-carousel">
      <button class="carousel-btn left">&#10094;</button>
      <div class="carousel-inner">${backdrops}</div>
      <button class="carousel-btn right">&#10095;</button>
    </div>` : ''}`;

  if (posters) attachCarouselScroll("posters-carousel");
  if (backdrops) attachCarouselScroll("backdrops-carousel");
}

async function showReviews(id, lazy = false) {
  const container = lazy ? document.getElementById("reviews-section") : infoContainer;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/reviews?api_key=${apiKey}`);
    const data = await res.json();

    if (!data.results.length) {
      container.innerHTML = `<p class="no-reviews">No reviews available.</p>`;
      return;
    }

    const reviewsHtml = data.results.map((review, index) => {
      const shortContent = review.content.substring(0, 300);
      const needsToggle = review.content.length > 300;
      return `
        <div class="review-block">
          <strong class="review-author">${review.author}</strong>
          <p id="review-${index}" class="review-content">
            ${needsToggle ? `${shortContent}<span id="dots-${index}">...</span><span id="more-${index}" class="more-text">${review.content.substring(300)}</span>` : review.content}
          </p>
          ${needsToggle ? `<button onclick="toggleReview(${index})" class="toggle-btn" id="toggleBtn-${index}">See More</button>` : ''}
        </div>`;
    }).join('');

    container.innerHTML = reviewsHtml;
  } catch (err) {
    container.innerHTML = `<p class="no-reviews">Error loading reviews.</p>`;
  }
}

// Review toggle
function toggleReview(index) {
  const dots = document.getElementById(`dots-${index}`);
  const moreText = document.getElementById(`more-${index}`);
  const btn = document.getElementById(`toggleBtn-${index}`);
  if (dots && moreText && btn) {
    const expanded = dots.style.display === "none";
    dots.style.display = expanded ? "inline" : "none";
    moreText.style.display = expanded ? "none" : "inline";
    btn.textContent = expanded ? "See More" : "See Less";
  }
}

// Trailer Modal
const trailerModal = document.getElementById("trailer-modal");
const trailerPlayer = document.getElementById("trailer-player");
const trailerClose = document.getElementById("trailer-close");

function openTrailerModal(youtubeKey) {
  trailerPlayer.src = `https://www.youtube.com/embed/${youtubeKey}?autoplay=1&controls=1`;
  trailerModal.style.display = "flex";
}

if (trailerClose) {
  trailerClose.addEventListener("click", () => {
    trailerModal.style.display = "none";
    trailerPlayer.src = "";
  });
}

window.addEventListener("click", e => {
  if (e.target === trailerModal) {
    trailerModal.style.display = "none";
    trailerPlayer.src = "";
  }
});

// Scroll Buttons
function attachCarouselScroll(wrapperId) {
  const wrapper = document.getElementById(wrapperId);
  const inner = wrapper?.querySelector(".carousel-inner");
  wrapper?.querySelector(".carousel-btn.left")?.addEventListener("click", () => {
    inner.scrollBy({ left: -300, behavior: "smooth" });
  });
  wrapper?.querySelector(".carousel-btn.right")?.addEventListener("click", () => {
    inner.scrollBy({ left: 300, behavior: "smooth" });
  });
}

// Save movie to "Continue Watching"
function saveToContinueWatching(movie) {
  let watchList = JSON.parse(localStorage.getItem("continueWatching")) || [];
  if (!watchList.find(m => m.id === movie.id)) {
    watchList.unshift({
      id: movie.id,
      title: movie.title,
      backdrop_path: movie.backdrop_path || movie.poster_path,
      progress: 0
    });
    if (watchList.length > 10) watchList = watchList.slice(0, 10);
    localStorage.setItem("continueWatching", JSON.stringify(watchList));
  }
}

// Update movie progress in localStorage
function updateWatchProgress(id, progress) {
  const list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  const updated = list.map(movie => movie.id === id ? { ...movie, progress } : movie);
  localStorage.setItem("continueWatching", JSON.stringify(updated));
}

// Remove movie from Continue Watching
function removeFromContinueWatching(id) {
  let list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  list = list.filter(movie => movie.id !== id);
  localStorage.setItem("continueWatching", JSON.stringify(list));
  loadContinueWatching(); // Refresh UI
}

// Load and display Continue Watching section
function loadContinueWatching() {
  const container = document.getElementById("continue-watching-list");
  const section = document.getElementById("continue-watching-section");
  const list = JSON.parse(localStorage.getItem("continueWatching")) || [];

  if (!list.length && section) section.style.display = "none";
  if (!container) return;

  container.innerHTML = list.map(movie => `
    <div class="continue-item-wrapper">
      <a href="player.html?type=movie&id=${movie.id}" class="continue-item">
        <img src="https://image.tmdb.org/t/p/w500${movie.backdrop_path}" alt="${movie.title}" />
        <div class="play-overlay"><i class="fa-solid fa-circle-play"></i></div>
        <div class="movie-title">${movie.title}</div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${movie.progress}%"></div></div>
      </a>
      <button class="remove-btn" data-id="${movie.id}" title="Remove"><i class="fa-solid fa-minus"></i></button>
    </div>
  `).join('');

  // Attach event listeners to each remove button
  container.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();   // Prevent triggering the parent anchor tag
      e.preventDefault();    // Prevent navigation
      const idToRemove = parseInt(btn.dataset.id);
      removeFromContinueWatching(idToRemove);
    });
  });
}


// Lazy Sections
const lazySections = document.querySelectorAll(".lazy-section");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const section = entry.target.dataset.section;
      if (section === "trailer") showTrailer(id, true);
      else if (section === "cast") showCast(id, true);
      else if (section === "gallery") showGallery(id, true);
      else if (section === "reviews") showReviews(id, true);
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: "100px" });

lazySections.forEach(section => observer.observe(section));

// Theme
const themeToggleBtn = document.getElementById("theme-toggle");
const currentTheme = localStorage.getItem("theme") || "dark";

function applyTheme(theme) {
  document.body.classList.toggle("light-mode", theme === "light");
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = theme === "light" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }
  localStorage.setItem("theme", theme);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("light-mode") ? "dark" : "light";
    applyTheme(newTheme);
  });
}

applyTheme(currentTheme);

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  if (id) showOverview(id);
  loadContinueWatching();

  const list = document.getElementById("continue-watching-list");
  const leftBtn = document.querySelector(".slider-btn.left");
  const rightBtn = document.querySelector(".slider-btn.right");

  if (list && leftBtn && rightBtn) {
    leftBtn.addEventListener("click", () => list.scrollBy({ left: -300, behavior: "smooth" }));
    rightBtn.addEventListener("click", () => list.scrollBy({ left: 300, behavior: "smooth" }));
    attachCarouselScroll("continue-carousel");
  }
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
  
    function toggleMoreMenu() {
    document.getElementById("moreMenu").classList.toggle("show");
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

// Scroll amount per click
const scrollAmount = 300;

const leftBtn = document.querySelector("#continue-carousel .carousel-btn.left");
const rightBtn = document.querySelector("#continue-carousel .carousel-btn.right");
const scrollContainer = document.getElementById("continue-watching-list");

if (leftBtn && rightBtn && scrollContainer) {
  leftBtn.addEventListener("click", () => {
    scrollContainer.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  });

  rightBtn.addEventListener("click", () => {
    scrollContainer.scrollBy({ left: scrollAmount, behavior: "smooth" });
  });
}

//similar movies and tv shows

async function fetchTrendingMovies() {
  try {
    const endpoint = `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    const container = document.getElementById('related-list-movies');
    container.innerHTML = '';

    const filtered = data.results.filter(item => item.backdrop_path || item.poster_path).slice(0, 20);

    for (const item of filtered) {
      const card = document.createElement('div');
      card.className = 'related-card';

      // Fetch logos from /images endpoint
      let logoUrl = '';
      try {
        const logoRes = await fetch(`https://api.themoviedb.org/3/movie/${item.id}/images?api_key=${apiKey}`);
        const logoData = await logoRes.json();
        const logos = logoData.logos || [];
        const enLogo = logos.find(l => l.iso_639_1 === 'en') || logos[0];
        if (enLogo) {
          logoUrl = `https://image.tmdb.org/t/p/w300${enLogo.file_path}`;
        }
      } catch (e) {
        console.warn('Logo fetch failed:', e);
      }

      const landscapeUrl = item.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
        : item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : '';

      card.innerHTML = `
        <div class="poster-wrapper">
          <img class="landscape-img" src="${landscapeUrl}" alt="${item.title}">
          ${logoUrl ? `<img class="title-logo" src="${logoUrl}" alt="${item.title} Logo">` : ''}
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `movie-library.html?type=movie&id=${item.id}`;
      });

      container.appendChild(card);
    }
  } catch (error) {
    console.error('Failed to fetch trending movies:', error);
    document.getElementById('related-list-movies').innerHTML = `<p class="empty-msg">Error loading trending movies.</p>`;
  }
}

// Call the new trending fetch function
fetchTrendingMovies();

function scrollCarousel(containerId, direction) {
  const container = document.getElementById(containerId);
  const scrollAmount = container.offsetWidth / 1.2; // adjust factor for speed
  container.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}


async function fetchRelatedShows(tvShowId) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/trending/tv/day?api_key=${apiKey}`);
        const data = await response.json();
        const relatedContainer = document.getElementById("related-list-tv");

        if (!relatedContainer) return;
        relatedContainer.innerHTML = "";

        const shows = data.results
            .filter(show => show.backdrop_path) // use landscape posters
            .sort(() => Math.random() - 0.5)
            .slice(0, 15); // limit to 15

        if (shows.length === 0) {
            relatedContainer.innerHTML = "<p>No valid related shows available.</p>";
            return;
        }

        for (const show of shows) {
            const showDiv = document.createElement("div");
            showDiv.classList.add("related-item");

            // Landscape poster (backdrop)
            const img = document.createElement("img");
            img.src = `https://image.tmdb.org/t/p/w780${show.backdrop_path}`;
            img.alt = show.name;
            showDiv.appendChild(img);

            // Fetch logo
            const logoUrl = await fetchLogoForTVShow(show.id);
            if (logoUrl) {
                const logoImg = document.createElement("img");
                logoImg.src = logoUrl;
                logoImg.alt = show.name + " Logo";
                logoImg.classList.add("logo-overlay");
                showDiv.appendChild(logoImg);
            }

            // Click handler
            showDiv.addEventListener("click", () => {
                window.location.href = `tv-shows-library.html?id=${show.id}`;
            });

            relatedContainer.appendChild(showDiv);
        }

        setupCarouselNavigation();
    } catch (error) {
        console.error("Error fetching related shows:", error);
        document.getElementById("related-list-tv").innerHTML = "<p>Failed to load related shows.</p>";
    }
}

async function fetchLogoForTVShow(tvId) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/images?api_key=${apiKey}`);
        const data = await res.json();
        const logos = data.logos || [];

        const englishLogo = logos.find(logo => logo.iso_639_1 === "en") || logos[0];
        if (englishLogo) {
            return `https://image.tmdb.org/t/p/w500${englishLogo.file_path}`;
        }
        return null;
    } catch (error) {
        console.error("Error fetching logo for show:", error);
        return null;
    }
}



function setupCarouselNavigation() {
    const prevButton = document.getElementById("prev-related-tv");
    const nextButton = document.getElementById("next-related-tv");
    const relatedSlider = document.getElementById("related-list-tv");

    let scrollPosition = 0;

    
    prevButton.addEventListener("click", () => {
        scrollPosition -= 200; 
        relatedSlider.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    });

    
    nextButton.addEventListener("click", () => {
        scrollPosition += 200; 
        relatedSlider.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    });
}


fetchRelatedShows();

if (movieId) {
  // Use this movieId to fetch movie info, stream URL, or embed player
  console.log("Movie ID to play:", movieId);
  // your playback code here
} else {
  console.error("No movie ID found in URL");
}


// Load Continue Watching on page load
document.addEventListener("DOMContentLoaded", () => {
  loadContinueWatching();
  attachCarouselScroll("continue-carousel");
});
