const apiKey = 'ea97a714a43a0e3481592c37d2c7178a';
const baseUrl = 'https://api.themoviedb.org/3/';

// ===== Search Handling =====
const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get('query');

if (!query) {
  document.getElementById('search-results').innerHTML = '<p>No search query found.</p>';
} else {
  displaySearchResults();
}

async function fetchData(endpoint) {
  const url = `${baseUrl}${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error fetching data from ${url}`);
  const data = await res.json();
  return data.results;
}

async function displaySearchResults() {
  try {
    const movieResults = await fetchData('search/movie');
    const tvShowResults = await fetchData('search/tv');

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    // Tab buttons container
    const tabs = document.createElement('div');
    tabs.className = 'tab-buttons';
    tabs.innerHTML = `
      <button class="tab-btn active" data-tab="movies">Movies</button>
      <button class="tab-btn" data-tab="tvshows">TV Shows</button>
    `;
    resultsContainer.appendChild(tabs);

    // Content containers
    const tabContents = document.createElement('div');
    tabContents.innerHTML = `
      <div id="movies" class="tab-content active-tab"></div>
      <div id="tvshows" class="tab-content"></div>
    `;
    resultsContainer.appendChild(tabContents);

    // Render results into each tab
    displayResults(movieResults, 'Movies', document.getElementById('movies'));
    displayResults(tvShowResults, 'TV Shows', document.getElementById('tvshows'));

    // Add tab switching logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-tab'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active-tab');
      });
    });
  } catch (error) {
    console.error('Error fetching search results:', error);
    document.getElementById('search-results').innerHTML = `<p>Error fetching results: ${error.message}. Please try again later.</p>`;
  }
}


function displayResults(results, category, container) {
  const section = document.createElement('div');
  section.classList.add('search-result-category');

  const header = document.createElement('h2');
  header.textContent = category;
  section.appendChild(header);

  const filteredResults = results.filter(item => item.poster_path);

  if (filteredResults.length > 0) {
    const itemsContainer = document.createElement('div');
    itemsContainer.classList.add('search-result-items');

    filteredResults.forEach(item => {
      const isMovie = item.hasOwnProperty('title');
      const targetPage = isMovie ? 'movie-library.html' : 'tv-shows-library.html';

      const resultItem = document.createElement('div');
      resultItem.classList.add('search-result-item');
      resultItem.innerHTML = `
        <a href="${targetPage}?id=${item.id}">
          <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name}">
        </a>
      `;
      itemsContainer.appendChild(resultItem);
    });

    section.appendChild(itemsContainer);
  } else {
    section.innerHTML += `<p>No results found for this category.</p>`;
  }

  container.appendChild(section);
}


// ===== Utility Functions =====
function formatReleaseDate(releaseDate) {
  const date = new Date(releaseDate);
  const options = { month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function getStarRating(voteAverage) {
  const totalStars = 5;
  const fullStars = Math.round(voteAverage / 2);
  return '★'.repeat(fullStars) + '☆'.repeat(totalStars - fullStars);
}

// ===== Lazy-load images =====
document.querySelectorAll('img').forEach(img => {
  if (!img.hasAttribute('loading')) {
    img.setAttribute('loading', 'lazy');
  }
});

// ===== Passive Listeners =====
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('touchmove', () => {}, { passive: true });
window.addEventListener('scroll', () => {}, { passive: true });

// ===== Trailer Modal =====
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("trailerModal");
  const closeButton = document.querySelector(".close");

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      modal.style.display = "none";
      document.getElementById("trailerFrame").innerHTML = "";
    });
  }

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
      document.getElementById("trailerFrame").innerHTML = "";
    }
  });

  showTrendingNotifications();
  setInterval(showTrendingNotifications, 60 * 60 * 1000); // Refresh hourly
});

// ===== Auto-unmute Audio on Click =====
document.body.addEventListener('click', function () {
  const audio = document.getElementById('audio-player');
  if (!audio) return;

  audio.play().then(() => {
    audio.muted = false;
  }).catch(err => {
    console.log("Autoplay failed:", err);
  });
});

// ===== Burger Menu & Notification Modal Toggles =====
const burger = document.getElementById('burger');
const meowflexMenu = document.getElementById('meowflexMenu');
const notificationIcon = document.getElementById('notificationIcon');
const notificationModal = document.getElementById('notificationModal');

// Hide both menus when toggling one
burger?.addEventListener('click', (e) => {
  e.stopPropagation();
  const shouldShow = !meowflexMenu.classList.contains('show');
  meowflexMenu.classList.toggle('show', shouldShow);
  notificationModal.classList.remove('show'); // hide other modal
});

notificationIcon?.addEventListener('click', (e) => {
  e.stopPropagation();
  const shouldShow = !notificationModal.classList.contains('show');
  notificationModal.classList.toggle('show', shouldShow);
  meowflexMenu.classList.remove('show'); // hide other menu

  if (window.currentTrendingIds) {
    localStorage.setItem('lastSeenTrendingIds', window.currentTrendingIds);
    document.getElementById("notificationBadge").style.display = 'none';
  }
});

document.addEventListener('click', (e) => {
  if (!notificationModal.contains(e.target) && !notificationIcon.contains(e.target)) {
    notificationModal.classList.remove('show');
  }
  if (!meowflexMenu.contains(e.target) && !burger.contains(e.target)) {
    meowflexMenu.classList.remove('show');
  }
});

// ===== Fetch Trending with Logos for Notifications =====
async function fetchTrendingWithLogos() {
  const res = await fetch(`${baseUrl}trending/all/day?api_key=${apiKey}`);
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
      const logoRes = await fetch(`${baseUrl}${item.media_type}/${item.id}/images?api_key=${apiKey}`);
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

// ===== BurgerMenuIcon Toggle for Mobile =====
document.getElementById("burgerMenuIcon")?.addEventListener("click", () => {
  const menu = document.getElementById("burgerMenu");
  const isHidden = window.getComputedStyle(menu).display === "none";
  menu.style.display = isHidden ? "block" : "none";

  // ✅ Hide the notification modal if it's open
  document.getElementById("notificationModal")?.classList.remove('show');
});
