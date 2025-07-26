const apiKey = 'ea97a714a43a0e3481592c37d2c7178a';
let genreMap = {};
const safeIdle = window.requestIdleCallback || function(cb) { setTimeout(cb, 0); };

document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const menu = document.getElementById('meowflexMenu');
  const notificationModal = document.getElementById('notificationModal');
  let hideTimeout;

  function getScreenType() {
    const width = window.innerWidth;
    if (width <= 500) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  let lastScreenType = getScreenType();

  if (burger && menu) {
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menu.classList.contains('active');
      menu.classList.toggle('active');
      if (notificationModal && notificationModal.style.display === 'block') {
        notificationModal.style.display = 'none';
      }
      if (!isVisible) {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          menu.classList.remove('active');
        }, 6000);
      }
    });

    menu.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('click', () => {
      menu.classList.remove('active');
      clearTimeout(hideTimeout);
      if (notificationModal) {
        notificationModal.style.display = 'none';
      }
    });

    window.addEventListener('resize', () => {
      const currentScreenType = getScreenType();
      if (currentScreenType !== lastScreenType) {
        menu.classList.remove('active');
        clearTimeout(hideTimeout);
        if (notificationModal) {
          notificationModal.style.display = 'none';
        }
        lastScreenType = currentScreenType;
      }
    });
  }
});

// Carousel pointer lock on hover
document.querySelectorAll('.carousel-btn').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    document.querySelectorAll('.poster-wrapper').forEach(p => p.style.pointerEvents = 'none');
  });
  btn.addEventListener('mouseleave', () => {
    document.querySelectorAll('.poster-wrapper').forEach(p => p.style.pointerEvents = 'auto');
  });
});

// More menu toggle
function toggleMoreMenu() {
  const moreMenu = document.getElementById('moreMenu');
  if (moreMenu) moreMenu.classList.toggle('show');
}

document.addEventListener('click', function (e) {
  const moreDropdown = document.querySelector('.more-dropdown');
  if (moreDropdown && !moreDropdown.contains(e.target)) {
    const moreMenu = document.getElementById('moreMenu');
    if (moreMenu) moreMenu.classList.remove('show');
  }
});

// Trailer modal logic
async function loadTrailer(buttonElement) {
  const activeSlide = document.querySelector('.slide.active');
  if (!activeSlide) return alert("No active slide.");
  const mediaType = activeSlide.dataset.type;
  const mediaId = activeSlide.dataset.id;
  const url = `https://api.themoviedb.org/3/${mediaType}/${mediaId}/videos?api_key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    if (!trailer) return alert('Trailer not available.');
    const iframe = document.getElementById('trailerIframe');
    iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
    document.getElementById('trailerModal').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    alert('Failed to load trailer.');
  }
}

function closeTrailer() {
  const modal = document.getElementById('trailerModal');
  const iframe = document.getElementById('trailerIframe');
  iframe.src = '';
  modal.classList.add('hidden');
}

// TV Explore Logic
let currentPage = 1;
let currentType = 'trending';
let currentGenreId = null;
let isGenreMode = false;
let canLoadMore = true;

const MOBILE_BREAKPOINT = 768;
const exploreGrid = document.getElementById('exploreGrid');
const mqMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

// Lazy loading images
const lazyImageObserver = new IntersectionObserver((entries, observer) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const img = entry.target;
      const src = img.dataset.src;
      if (src && !img.src) {
        img.src = src;
        img.onload = () => img.classList.add('loaded');
        img.onerror = () => img.src = 'https://via.placeholder.com/640x360?text=No+Image';
      }
      observer.unobserve(img);
    }
  }
}, { rootMargin: '400px', threshold: 0.01 });

// Infinite scroll observer
const rowObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && canLoadMore) {
      canLoadMore = false;
      rowObserver.unobserve(entry.target);
      fetchExploreData(getTVApiUrl());
    }
  });
}, { rootMargin: '600px', threshold: 0.01 });

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getTVApiUrl() {
  if (isGenreMode && currentGenreId)
    return `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_genres=${currentGenreId}&sort_by=popularity.desc&page=${currentPage}`;
  if (currentType === 'trending')
    return `https://api.themoviedb.org/3/trending/tv/day?api_key=${apiKey}&page=${currentPage}`;
  if (currentType === 'latest') {
    const today = getTodayDate();
    return `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&sort_by=first_air_date.desc&first_air_date.lte=${today}&page=${currentPage}`;
  }
  return `https://api.themoviedb.org/3/tv/${currentType}?api_key=${apiKey}&page=${currentPage}`;
}

function loadExploreCategory(type, reset = true) {
  if (reset) {
    currentPage = 1;
    exploreGrid.innerHTML = '';
    canLoadMore = true;
  }
  currentType = type;
  isGenreMode = false;
  currentGenreId = null;
  fetchExploreData(getTVApiUrl());
}

function filterExploreByGenre(genreId) {
  if (!genreId) return;
  currentPage = 1;
  canLoadMore = true;
  currentGenreId = genreId;
  isGenreMode = true;
  exploreGrid.innerHTML = '';
  fetchExploreData(getTVApiUrl());
}

async function fetchExploreData(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results?.length) {
      canLoadMore = false;
      return;
    }

    const isMobile = mqMobile.matches;
    const fragment = document.createDocumentFragment();

    for (const show of data.results) {
      if (!show.poster_path) continue;

      const id = show.id;
      const title = show.name || 'Untitled';
      const rating = show.vote_average ? show.vote_average.toFixed(1) : 'N/A';
      const portraitUrl = `https://image.tmdb.org/t/p/w500${show.poster_path}`;
      const landscapeUrl = show.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${show.backdrop_path}`
        : portraitUrl;

      let logo = null;
      if (!isMobile) {
        try {
          const logoRes = await fetch(`https://api.themoviedb.org/3/tv/${id}/images?api_key=${apiKey}`);
          const logoData = await logoRes.json();
          const logoObj = logoData.logos?.find(l => l.iso_639_1 === 'en') || logoData.logos?.[0];
          logo = logoObj ? `https://image.tmdb.org/t/p/w500${logoObj.file_path}` : null;
        } catch (e) {
          console.warn('Logo fetch failed:', title, e);
        }
      }

      const item = document.createElement('div');
      item.className = 'explore-item';
      item.innerHTML = `
        <a href="../tv-shows-library.html?id=${id}" class="poster-link">
          <div class="poster-wrapper">
            <img
              class="lazy-img"
              data-src="${isMobile ? portraitUrl : landscapeUrl}"
              data-portrait="${portraitUrl}"
              data-landscape="${landscapeUrl}"
              alt="${title}"
              loading="lazy"
              style="aspect-ratio: ${isMobile ? '2/3' : '16/9'};"
            />
            ${!isMobile && logo ? `<img class="title-logo" src="${logo}" alt="${title} Logo" loading="lazy" />` : ''}
          </div>
          <div class="explore-info">
            <h4 title="${title}">${title}</h4>
            <span class="explore-rating">⭐ ${rating}</span>
          </div>
        </a>
      `;
      fragment.appendChild(item);
    }

    if (!exploreGrid) return;
    exploreGrid.appendChild(fragment);

    safeIdle(() => {
      if (!exploreGrid) return;
      exploreGrid.querySelectorAll('img.lazy-img:not(.loaded)').forEach(img => {
        lazyImageObserver.observe(img);
      });
    });

    const allItems = exploreGrid.querySelectorAll('.explore-item');
    const lastItem = allItems[allItems.length - 1];
    if (lastItem) rowObserver.observe(lastItem);

    currentPage++;
    canLoadMore = true;
  } catch (err) {
    console.error('Fetch failed:', err);
    canLoadMore = false;
  }
}

mqMobile.addEventListener('change', (e) => {
  swapExploreImageOrientations(e.matches);
});

function swapExploreImageOrientations(nowMobile) {
  const imgs = exploreGrid.querySelectorAll('img.lazy-img');
  imgs.forEach(img => {
    const portrait = img.dataset.portrait;
    const landscape = img.dataset.landscape;
    const desired = nowMobile ? portrait : landscape;
    img.dataset.src = desired;
    img.style.aspectRatio = nowMobile ? '2 / 3' : '16 / 9';
    if (img.src && !img.src.endsWith(desired)) {
      img.classList.remove('loaded');
      img.src = desired;
    }
    if (!img.complete || img.naturalWidth === 0) {
      lazyImageObserver.observe(img);
    }
    const wrapper = img.closest('.poster-wrapper');
    if (wrapper) {
      const logoEl = wrapper.querySelector('.title-logo');
      if (logoEl) logoEl.style.display = nowMobile ? 'none' : '';
    }
  });

  document.body.classList.toggle('is-mobile', nowMobile);
}

loadExploreCategory('trending');
document.body.classList.toggle('is-mobile', mqMobile.matches);

// Auto-refresh every 5 mins
setInterval(() => {
  console.log("Auto-refreshing explore TV shows...");
  loadExploreCategory(currentType, true);
}, 300000);

// Back to Top Button
window.addEventListener("scroll", () => {
  const btn = document.getElementById("backToTopBtn");
  if (btn) {
    btn.style.display = window.scrollY > 300 ? "block" : "none";
  }
});

document.getElementById("backToTopBtn")?.addEventListener("click", function (e) {
  e.preventDefault();
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
});

// Passive scroll optimizations
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('touchmove', () => {}, { passive: true });
window.addEventListener('scroll', () => {}, { passive: true });

// Debounced infinite scroll
function debounce(fn, delay = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

window.addEventListener('scroll', debounce(() => {
  const allItems = exploreGrid.querySelectorAll('.explore-item');
  const lastItem = allItems[allItems.length - 1];
  if (lastItem && canLoadMore) {
    const rect = lastItem.getBoundingClientRect();
    if (rect.top < window.innerHeight + 300) {
      rowObserver.unobserve(lastItem);
      fetchExploreData(getTVApiUrl());
    }
  }
}, 150), { passive: true });



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
  const url = `../movie-library.html?id=${item.id}`;
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