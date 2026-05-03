const state = {
  lang: "en",
  property: null,
  galleryPhotos: [],
  activePhotoIndex: 0,
};

const labels = {
  en: {
    viewZillow: "View on Zillow",
    viewRedfin: "View on Redfin",
    beds: "Beds",
    baths: "Baths",
    sqft: "Sq Ft",
    lot: "Lot",
    built: "Built",
    garage: "Garage",
    listedBy: "Listed by",
    missingPhoto: "Photo coming soon",
    noHighlights: "Highlights will be added as listing details are collected.",
    open3d: "Open 3D tour",
    openFloorPlan: "Open floor plan",
    downloadFloorPlan: "Download floor plan",
  },
  zh: {
    viewZillow: "查看 Zillow",
    viewRedfin: "查看 Redfin",
    beds: "卧室",
    baths: "浴室",
    sqft: "室内面积",
    lot: "土地面积",
    built: "建造年份",
    garage: "车库",
    listedBy: "挂牌经纪",
    missingPhoto: "照片待补充",
    noHighlights: "房源亮点将在资料收集后补充。",
    open3d: "打开 3D 看房",
    openFloorPlan: "打开户型图",
    downloadFloorPlan: "下载户型图",
  },
};

async function loadProperty() {
  try {
    const response = await fetch("./property.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return {
      address: { display: "Single Property Website" },
      listing: {},
      facts: {},
      highlights: [],
      media: { photos: [], videoAssets: [] },
      copy: {
        headlineEn: "Single Property Website",
        headlineZh: "独立房源网站",
        summaryEn: "Replace this template with listing-specific copy.",
        summaryZh: "请用房源专属文案替换此模板内容。",
      },
    };
  }
}

function money(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function area(value) {
  if (!value) return null;
  return new Intl.NumberFormat("en-US").format(value);
}

function text(en, zh) {
  return state.lang === "zh" ? zh || en : en || zh;
}

function setStaticLanguage() {
  document.documentElement.lang = state.lang === "zh" ? "zh-Hans" : "en";
  document.querySelector("[data-lang-toggle]").textContent = state.lang === "zh" ? "EN" : "中文";
  document.querySelectorAll("[data-i18n-en]").forEach((node) => {
    node.textContent = text(node.dataset.i18nEn, node.dataset.i18nZh);
  });
}

function sourceButtons(property) {
  const links = [];
  if (property.listing?.zillowUrl) links.push([labels[state.lang].viewZillow, property.listing.zillowUrl]);
  if (property.listing?.redfinUrl) links.push([labels[state.lang].viewRedfin, property.listing.redfinUrl]);
  return links
    .map(([label, url], index) => {
      const variant = index === 0 ? "button" : "button secondary";
      return `<a class="${variant}" href="${url}" rel="noreferrer" target="_blank">${label}</a>`;
    })
    .join("");
}

function renderHero(property) {
  const headline = text(property.copy?.headlineEn, property.copy?.headlineZh) || property.address?.display || "Single Property Website";
  const summary = text(property.copy?.summaryEn, property.copy?.summaryZh) || property.address?.display || "";
  const price = money(property.listing?.price);
  const status = property.listing?.status || "Listing";
  const heroPhoto = property.media?.heroPhoto || property.media?.photos?.[0]?.path;

  document.querySelector("[data-headline]").textContent = headline;
  document.querySelector("[data-brand]").textContent = property.address?.display || headline;
  document.querySelector("[data-summary]").textContent = summary;
  document.querySelector("[data-price]").textContent = price || "";
  document.querySelector("[data-address]").textContent = property.address?.display || "";
  document.querySelector("[data-status]").textContent = status;
  document.querySelector("[data-hero-facts]").innerHTML = heroFactPills(property);
  document.querySelector("[data-source-links]").innerHTML = sourceButtons(property);
  document.querySelector("[data-source-links-secondary]").innerHTML = sourceButtons(property) || `<p>${property.address?.display || ""}</p>`;

  const hero = document.querySelector("[data-hero-media]");
  if (heroPhoto) {
    hero.innerHTML = `<img src="${heroPhoto}" alt="${property.address?.display || labels[state.lang].missingPhoto}">`;
  } else {
    hero.innerHTML = `<div class="photo-placeholder">${labels[state.lang].missingPhoto}</div>`;
  }
}

function heroFactPills(property) {
  const facts = [
    [property.facts?.beds, labels[state.lang].beds],
    [property.facts?.baths, labels[state.lang].baths],
    [area(property.facts?.livingAreaSqft), labels[state.lang].sqft],
    [area(property.facts?.lotSizeSqft), labels[state.lang].lot],
    [property.facts?.parking, labels[state.lang].garage],
  ].filter(([value]) => value);
  return facts.map(([value, label]) => `<span><strong>${value}</strong>${label}</span>`).join("");
}

function renderFacts(property) {
  const facts = [
    [property.facts?.beds, labels[state.lang].beds],
    [property.facts?.baths, labels[state.lang].baths],
    [area(property.facts?.livingAreaSqft), labels[state.lang].sqft],
    [area(property.facts?.lotSizeSqft), labels[state.lang].lot],
    [property.facts?.yearBuilt, labels[state.lang].built],
  ].filter(([value]) => value);
  document.querySelector("[data-facts]").innerHTML = facts
    .map(([value, label]) => `<div class="fact"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
}

function renderGallery(property) {
  const photos = property.media?.photos || [];
  const gallery = document.querySelector("[data-gallery]");
  state.galleryPhotos = [];
  if (!photos.length) {
    gallery.innerHTML = `<figure><div class="photo-placeholder">${labels[state.lang].missingPhoto}</div></figure>`;
    return;
  }
  const byPath = new Map(photos.map((photo) => [photo.path, photo]));
  const sections = property.gallerySections?.length
    ? property.gallerySections
    : [{ titleEn: "Gallery", titleZh: "图集", photos: photos.map((photo) => photo.path) }];

  gallery.innerHTML = sections
    .map((section) => {
      const sectionPhotos = (section.photos || []).map((path) => byPath.get(path)).filter(Boolean);
      if (!sectionPhotos.length) return "";
      const title = text(section.titleEn, section.titleZh);
      const intro = text(section.introEn, section.introZh);
      const figures = sectionPhotos
        .map((photo) => {
          const index = state.galleryPhotos.push(photo) - 1;
          const alt = text(photo.altEn, photo.altZh) || property.address?.display || "Property photo";
          const caption = text(photo.captionEn, photo.captionZh);
          return `
            <figure>
              <button class="gallery-trigger" type="button" data-photo-index="${index}" aria-label="Open ${alt}">
                <img src="${photo.path}" alt="${alt}">
              </button>
              ${caption ? `<figcaption>${caption}</figcaption>` : ""}
            </figure>
          `;
        })
        .join("");
      return `
        <section class="gallery-section">
          <div class="gallery-section-heading">
            <h3>${title}</h3>
            ${intro ? `<p>${intro}</p>` : ""}
          </div>
          <div class="gallery">${figures}</div>
        </section>
      `;
    })
    .join("");
}

function actionLabel(item) {
  if (item.type === "matterport") return labels[state.lang].open3d;
  if (item.type === "floorPlan") return labels[state.lang].openFloorPlan;
  return text("Open", "打开");
}

function renderInteractiveMedia(property) {
  const items = property.interactiveMedia || [];
  const section = document.querySelector("[data-tours-section]");
  const container = document.querySelector("[data-interactive-media]");
  if (!items.length) {
    section?.classList.add("is-hidden");
    return;
  }
  section?.classList.remove("is-hidden");
  container.innerHTML = items
    .map((item) => {
      const title = text(item.titleEn, item.titleZh);
      const description = text(item.descriptionEn, item.descriptionZh);
      const href = item.url || item.embedUrl || item.imagePath;
      const primaryAction = href
        ? `<a class="button" href="${href}" rel="noreferrer" target="_blank">${actionLabel(item)}</a>`
        : "";
      const downloadAction = item.downloadPath
        ? `<a class="button secondary" href="${item.downloadPath}" download>${labels[state.lang].downloadFloorPlan}</a>`
        : "";
      let media = "";

      if (item.type === "matterport" && item.embedUrl) {
        media = `
          <div class="tour-frame">
            <iframe src="${item.embedUrl}" title="${title}" allow="fullscreen; xr-spatial-tracking" allowfullscreen></iframe>
          </div>
        `;
      } else if (item.type === "floorPlan" && item.imagePath) {
        media = `
          <a class="floor-plan-preview" href="${href}" rel="noreferrer" target="_blank">
            <img src="${item.imagePath}" alt="${title}">
          </a>
        `;
      } else {
        media = `<div class="tour-link-card"><span>${title}</span></div>`;
      }

      return `
        <article class="tour-card ${item.type === "matterport" ? "tour-card-wide" : ""}">
          ${media}
          <div class="tour-copy">
            <h3>${title}</h3>
            ${description ? `<p>${description}</p>` : ""}
            <div class="tour-actions">${primaryAction}${downloadAction}</div>
          </div>
        </article>
      `;
    })
    .join("");
}

function lightboxCaption(photo) {
  const caption = text(photo.captionEn, photo.captionZh);
  const alt = text(photo.altEn, photo.altZh);
  return caption || alt || "";
}

function renderLightbox() {
  const photo = state.galleryPhotos[state.activePhotoIndex];
  if (!photo) return;
  const lightbox = document.querySelector("[data-lightbox]");
  const image = document.querySelector("[data-lightbox-img]");
  image.src = photo.path;
  image.alt = text(photo.altEn, photo.altZh) || "";
  document.querySelector("[data-lightbox-caption]").textContent = lightboxCaption(photo);
  lightbox.classList.remove("is-hidden");
  document.body.classList.add("no-scroll");
}

function closeLightbox() {
  document.querySelector("[data-lightbox]").classList.add("is-hidden");
  document.body.classList.remove("no-scroll");
}

function moveLightbox(delta) {
  if (!state.galleryPhotos.length) return;
  state.activePhotoIndex = (state.activePhotoIndex + delta + state.galleryPhotos.length) % state.galleryPhotos.length;
  renderLightbox();
}

function renderHighlights(property) {
  const highlights = property.highlights || [];
  const list = document.querySelector("[data-highlights]");
  if (!highlights.length) {
    list.innerHTML = `<li>${labels[state.lang].noHighlights}</li>`;
    return;
  }
  list.innerHTML = highlights
    .map((item) => {
      if (typeof item === "string") return `<li>${item}</li>`;
      const title = text(item.titleEn, item.titleZh);
      const body = text(item.en, item.zh);
      return `<li>${title ? `<strong>${title}</strong>` : ""}<span>${body}</span></li>`;
    })
    .join("");
}

function renderOverview(property) {
  const intro = text(property.copy?.featureIntroEn, property.copy?.featureIntroZh);
  const node = document.querySelector("[data-feature-intro]");
  if (node) node.textContent = intro || text(property.copy?.summaryEn, property.copy?.summaryZh) || "";
  const slogans = document.querySelector("[data-slogans]");
  if (slogans) {
    slogans.innerHTML = (property.copy?.marketingSlogans || [])
      .map((item) => `<p>${text(item.en, item.zh)}</p>`)
      .join("");
  }
}

function agentMarkup(property) {
  const agents = property.agents || [];
  if (!agents.length) return "";
  return agents
    .map((agent) => {
      const phone = agent.phone ? `<a href="tel:${agent.phone.replace(/[^\d+]/g, "")}">${agent.phone}</a>` : "";
      const license = agent.license ? `<span>${agent.license}</span>` : "";
      const brokerage = agent.brokerage ? `<span>${agent.brokerage}</span>` : "";
      const photo = agent.photo?.path
        ? `<img class="agent-photo" src="${agent.photo.path}" alt="${text(agent.photo.altEn, agent.photo.altZh) || agent.name}">`
        : "";
      return `
        <article class="agent-card">
          ${photo}
          <div>
            <strong>${agent.name}</strong>
            <div>${[license, brokerage].filter(Boolean).join("")}</div>
            ${phone ? `<div class="agent-phone">${phone}</div>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAgents(property) {
  const markup = agentMarkup(property);
  document.querySelector("[data-agents]").innerHTML = markup;
  document.querySelector("[data-agents-secondary]").innerHTML = markup;
}

function renderDescription(property) {
  const container = document.querySelector("[data-description]");
  const description = text(property.copy?.descriptionEn, property.copy?.descriptionZh);
  if (!description) return;
  container.innerHTML = description
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.trim()}</p>`)
    .join("");
}

function renderVideo(property) {
  const videos = property.media?.videoAssets || [];
  const section = document.querySelector("[data-video-section]");
  if (!videos.length) {
    section.classList.add("is-hidden");
    return;
  }
  section.classList.remove("is-hidden");
  document.querySelector("[data-video-target]").innerHTML = `<video controls src="${videos[0].path}"></video>`;
}

function render() {
  setStaticLanguage();
  renderHero(state.property);
  renderFacts(state.property);
  renderOverview(state.property);
  renderAgents(state.property);
  renderInteractiveMedia(state.property);
  renderGallery(state.property);
  renderHighlights(state.property);
  renderDescription(state.property);
  renderVideo(state.property);
}

document.querySelector("[data-lang-toggle]").addEventListener("click", () => {
  state.lang = state.lang === "en" ? "zh" : "en";
  render();
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-photo-index]");
  if (trigger) {
    state.activePhotoIndex = Number(trigger.dataset.photoIndex);
    renderLightbox();
  }
});

document.querySelector("[data-lightbox-close]").addEventListener("click", closeLightbox);
document.querySelector("[data-lightbox-prev]").addEventListener("click", () => moveLightbox(-1));
document.querySelector("[data-lightbox-next]").addEventListener("click", () => moveLightbox(1));
document.querySelector("[data-lightbox]").addEventListener("click", (event) => {
  if (event.target.matches("[data-lightbox]")) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (document.querySelector("[data-lightbox]").classList.contains("is-hidden")) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
});

loadProperty().then((property) => {
  state.property = property;
  render();
});
