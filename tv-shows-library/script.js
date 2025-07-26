const apiKey = 'ea97a714a43a0e3481592c37d2c7178a';
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const type = "tv";

let pinnedFavorites = JSON.parse(localStorage.getItem("meowbot_pinned") || "[]");
let progressInterval;
let isMuted = true;

const iframe = document.getElementById("movie-frame");
const trailerFrame = document.getElementById("trailer-player");
const select = document.getElementById("server-select");
const titleEl = document.getElementById("movie-title");
const downloadBtn = document.getElementById("download-btn");
const soundToggle = document.getElementById("sound-toggle");
const labels = document.querySelectorAll(".label");
const infoContainer = document.getElementById("media-info");
const labelContent = document.getElementById("info-container");

// ✅ Toast Helper (only on mobile)
function showWatchlistToast(title) {
  if (window.innerWidth <= 768) {
    let toast = document.getElementById("watchlist-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "watchlist-toast";
      document.body.appendChild(toast);
      toast.style.position = "fixed";
      toast.style.bottom = "60px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.backgroundColor = "#00cc66";
      toast.style.color = "white";
      toast.style.padding = "12px 20px";
      toast.style.fontSize = "0.9rem";
      toast.style.borderRadius = "20px";
      toast.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
      toast.style.zIndex = "9999";
      toast.style.transition = "opacity 0.5s ease";
      toast.style.display = "none";
    }

    toast.textContent = `✅ “${title}” successfully added to watchlist.`;
    toast.style.display = "block";
    toast.style.opacity = "1";

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.style.display = "none";
      }, 500);
    }, 2500);
  }
}

// ------------------------- Load Poster, Logo, Trailer -------------------------
async function loadPosterThenPlayTrailer() {
  if (!id) {
    document.body.innerHTML = '<h2 style="color:white;text-align:center;margin-top:20vh;">Missing TV Show ID.</h2>';
    return;
  }

  try {
    const [detailsRes, imagesRes, trailerRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}`),
      fetch(`https://api.themoviedb.org/3/tv/${id}/images?api_key=${apiKey}`),
      fetch(`https://api.themoviedb.org/3/tv/${id}/videos?api_key=${apiKey}`)
    ]);

    const details = await detailsRes.json();
    const images = await imagesRes.json();
    const videos = await trailerRes.json();

    if (titleEl) titleEl.textContent = details.name || "Untitled";

    if (infoContainer) {
      const genres = (details.genres?.[0]?.name?.split(" & ")[0]) || "Unknown Genre";
      const releaseDate = details.first_air_date || "Unknown Date";

      function formatDuration(minutes) {
        if (!minutes || isNaN(minutes)) return "Unknown Duration";
        const h = Math.floor(minutes / 60), m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      }

      let duration = "Unknown Duration";
      if (details.episode_run_time?.length > 0)
        duration = formatDuration(details.episode_run_time[0]) + "/episode";

      const overview = details.overview || "No overview available.";

      infoContainer.innerHTML = `
        <div class="media-meta-row">
          <span>TV Show</span>
          <span class="dot">&bull;</span>
          <span>${genres}</span>
          <span class="dot">&bull;</span>
          <span>${releaseDate}</span>
          <span class="dot">&bull;</span>
          <span class="watchlist-toggle">
            <img src="bookmark.svg" alt="Bookmark" class="bookmark-icon" />
            <span class="watchlist-text">Add to Watchlist</span>
          </span>
        </div>
        <div class="media-overview" data-full-text="${overview}">
          <strong style="color: yellow;">Overview:</strong> ${overview}
        </div>`;

      shortenOverviewText(".media-overview", 120, 160);

      const toggle = document.querySelector(".watchlist-toggle");
      if (toggle) {
        const list = JSON.parse(localStorage.getItem("meowflex_watchlist") || "[]");
        const exists = list.some(item => item.id == id && item.type === type);
        if (exists) {
          toggle.querySelector(".watchlist-text").textContent = "In Watchlist";
          toggle.style.opacity = 0.6;
        }

        toggle.addEventListener("click", () => {
          let current = JSON.parse(localStorage.getItem("meowflex_watchlist") || "[]");
          if (!current.some(i => i.id == id && i.type === type)) {
            current.push({
              id: details.id,
              title: details.name,
              poster: details.poster_path,
              release_date: details.first_air_date,
              type
            });
            localStorage.setItem("meowflex_watchlist", JSON.stringify(current));
            toggle.querySelector(".watchlist-text").textContent = "Added!";
            toggle.style.opacity = 0.6;

            // ✅ Toast notification
            showWatchlistToast(details.name);
          }
        });
      }
    }

    const poster = document.getElementById('poster');
    const posterPath = details.backdrop_path || details.poster_path;
    poster.src = posterPath
      ? `https://image.tmdb.org/t/p/original${posterPath}`
      : `https://via.placeholder.com/1280x720?text=No+Poster`;
    poster.style.display = "block";

    const logo = document.getElementById('title-logo');
    logo.style.display = "none";

    const selectedLogo = images.logos.find(l => l.iso_639_1 === "en" && l.file_path?.endsWith(".png"))
      || images.logos.find(l => l.iso_639_1 === "en")
      || images.logos.find(l => !["zh", "cn", "zh-Hans", "zh-Hant"].includes(l.iso_639_1));

    if (selectedLogo) {
      const img = new Image();
      img.onload = () => {
        logo.src = img.src;
        logo.style.display = "block";
      };
      img.onerror = () => {
        logo.style.display = "none";
      };
      img.src = `https://image.tmdb.org/t/p/w500${selectedLogo.file_path}`;
    }

    const trailer = videos.results.find(v => v.type === "Trailer" && v.site === "YouTube");

    if (trailer?.key) {
      poster.style.display = "block";
      trailerFrame.style.display = "none";
      soundToggle.style.display = "none";

      setTimeout(() => {
        poster.style.display = "none";
        trailerFrame.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&rel=0&controls=0&showinfo=0&enablejsapi=1&cc_load_policy=0`;
        trailerFrame.style.display = "block";
        soundToggle.style.display = "block";
      }, 2000);
    } else {
      trailerFrame.style.display = "none";
      trailerFrame.src = "";
      poster.style.display = "block";
      soundToggle.style.display = "none";
    }

  } catch (err) {
    console.error("Error loading trailer:", err);
    document.body.innerHTML = '<h2 style="color:white;text-align:center;margin-top:20vh;">Failed to load content.</h2>';
  }
}



// ------------------------- Event Handlers -------------------------

soundToggle?.addEventListener("click", () => {
  const action = isMuted ? "unMute" : "mute";
  trailerFrame.contentWindow?.postMessage(JSON.stringify({
    event: "command",
    func: action,
    args: []
  }), "*");
  isMuted = !isMuted;
  soundToggle.textContent = isMuted ? "🔇" : "🔊";
});

labels.forEach(label => {
  label.addEventListener("click", () => {
    labels.forEach(lbl => lbl.classList.remove("active"));
    label.classList.add("active");
    const section = label.textContent.trim();
    if (section === "Overview") showOverview(id);
    else if (section === "Trailer") showTrailer(id);
    else if (section === "Cast") showCast(id);
    else if (section === "Gallery") showGallery(id);
    else if (section === "Reviews") showReviews(id);
  });
});

// ------------------------- Overview, Trailer, Cast, Gallery, Reviews -------------------------

async function showOverview(id) {
  const res = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}`);
  const data = await res.json();
  labelContent.innerHTML = `<p class="overview-text">${data.overview || 'No overview available.'}</p>`;
}

async function showTrailer(id) {
  const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/videos?api_key=${apiKey}`);
  const data = await res.json();
  const trailers = data.results.filter(v => v.site === 'YouTube' && v.type.toLowerCase().includes('trailer'));

  if (!trailers.length) {
    labelContent.innerHTML = `<p class="no-trailers">No trailers found.</p>`;
    return;
  }

  const thumbs = trailers.map(t => `
    <div class="trailer-thumb" data-key="${t.key}">
      <img src="https://img.youtube.com/vi/${t.key}/hqdefault.jpg" alt="${t.name}" />
    </div>`).join('');
  labelContent.innerHTML = `
    <div class="carousel-wrapper" id="trailer-carousel">
      <button class="carousel-btn left">&#10094;</button>
      <div class="carousel-inner">${thumbs}</div>
      <button class="carousel-btn right">&#10095;</button>
    </div>`;

  document.querySelectorAll('.trailer-thumb').forEach(el => {
    el.addEventListener("click", () => {
      const key = el.dataset.key;
      const modal = document.getElementById("label-trailer-modal");
      const frame = document.getElementById("label-trailer-frame");
      frame.src = `https://www.youtube.com/embed/${key}?autoplay=1&controls=1`;
      modal.style.display = "flex";
      modal.classList.remove("hidden");
    });
  });

  attachCarouselScroll("trailer-carousel");
}

async function showCast(id) {
  const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/credits?api_key=${apiKey}`);
  const data = await res.json();
  const cast = data.cast.filter(actor => actor.profile_path).map(actor => `
    <div class="cast-card">
      <img src="https://image.tmdb.org/t/p/w185${actor.profile_path}" />
      <div class="cast-name">${actor.name}</div>
      <div class="cast-role">${actor.character}</div>
    </div>`).join('');
  labelContent.innerHTML = `
    <div class="carousel-wrapper" id="cast-carousel">
      <button class="carousel-btn left">&#10094;</button>
      <div class="carousel-inner">${cast}</div>
      <button class="carousel-btn right">&#10095;</button>
    </div>`;
  attachCarouselScroll("cast-carousel");
}

async function showGallery(id) {
  const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/images?api_key=${apiKey}`);
  const data = await res.json();

  const posters = data.posters.map(img => `
    <div class="gallery-card">
      <a href="https://image.tmdb.org/t/p/original${img.file_path}" target="_blank">
        <img class="gallery-img poster" src="https://image.tmdb.org/t/p/w342${img.file_path}" />
      </a>
    </div>`).join('');

  const backdrops = data.backdrops.map(img => `
    <div class="gallery-card">
      <a href="https://image.tmdb.org/t/p/original${img.file_path}" target="_blank">
        <img class="gallery-img backdrop" src="https://image.tmdb.org/t/p/w500${img.file_path}" />
      </a>
    </div>`).join('');

  labelContent.innerHTML = `
    <div class="gallery-section">
      <div class="carousel-wrapper advanced" id="poster-carousel">
        <button class="carousel-btn left">&#10094;</button>
        <div class="carousel-inner">${posters}</div>
        <button class="carousel-btn right">&#10095;</button>
      </div>
      <div class="carousel-wrapper advanced" id="backdrop-carousel">
        <button class="carousel-btn left">&#10094;</button>
        <div class="carousel-inner">${backdrops}</div>
        <button class="carousel-btn right">&#10095;</button>
      </div>
    </div>
  `;

  attachCarouselScroll("poster-carousel");
  attachCarouselScroll("backdrop-carousel");
}


async function showReviews(id) {
  const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/reviews?api_key=${apiKey}`);
  const data = await res.json();

  if (!data.results.length) {
    labelContent.innerHTML = `<p class="no-reviews">No reviews available.</p>`;
    return;
  }

  labelContent.innerHTML = data.results.map((r, i) => `
    <div class="review-block">
      <span class="review-author">${r.author}</span>
      <p class="review-content">${r.content.length > 300 ? `${r.content.slice(0, 300)}...` : r.content}</p>
    </div>`).join('');
}


// ------------------------- Utility -------------------------

function shortenOverviewText(selector, mobile, tablet, desktop = 1000) {
  const width = window.innerWidth;
  const limit = width < 600 ? mobile : width < 768 ? tablet : desktop;

  document.querySelectorAll(selector).forEach(el => {
    const full = el.dataset.fullText || el.textContent;
    el.dataset.fullText = full;
    if (full.length > limit) {
      const trimmed = full.slice(0, full.lastIndexOf(" ", limit));
      el.textContent = trimmed + "...";
    } else {
      el.textContent = full;
    }
  });
}

function attachCarouselScroll(wrapperId) {
  const wrapper = document.getElementById(wrapperId);
  const inner = wrapper?.querySelector(".carousel-inner");
  wrapper?.querySelector(".carousel-btn.left")?.addEventListener("click", () => inner.scrollBy({ left: -300, behavior: "smooth" }));
  wrapper?.querySelector(".carousel-btn.right")?.addEventListener("click", () => inner.scrollBy({ left: 300, behavior: "smooth" }));
}

// ------------------------- Init -------------------------

window.addEventListener("DOMContentLoaded", () => {
  loadPosterThenPlayTrailer();
  shortenOverviewText(".media-overview", 120, 160);
});

window.addEventListener("resize", () => {
  shortenOverviewText(".media-overview", 120, 160);
});

// Modal close
const labelModal = document.getElementById("label-trailer-modal");
const labelClose = document.getElementById("label-trailer-close");
labelClose?.addEventListener("click", () => {
  labelModal.classList.add("hidden");
  labelModal.style.display = "none";
  document.getElementById("label-trailer-frame").src = "";
});
window.addEventListener("click", (e) => {
  if (e.target === labelModal) {
    labelModal.classList.add("hidden");
    labelModal.style.display = "none";
    document.getElementById("label-trailer-frame").src = "";
  }
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
  const scrollAmount = 300; // Adjust as needed

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

function playMovie() {
  // Pass the current movie id and type as URL parameters to player.html
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const type = params.get("type") || "movie";
  
  if (!id) {
    alert("Movie ID is missing.");
    return;
  }

  // Redirect to player.html with id and type as query params
  window.location.href = `tv-shows-player.html?type=tv&id=${id}`;
}


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

  // 👇 Hide burger menu when notification modal is opened
  const navMenu = document.getElementById('navburgerMenu');
  const meowflexMenu = document.getElementById('meowflexMenu');
  if (navMenu) navMenu.classList.remove('active');
  if (meowflexMenu) meowflexMenu.style.display = 'none';

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

