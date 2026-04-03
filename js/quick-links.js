/**
 * Homepage quick links list.
 * Add more by appending objects to QUICK_LINKS.
 */
(function() {
  var QUICK_LINKS = [
    { label: "BNFc", url: "https://bnfc.nice.org.uk/", emoji: "💊", tags: ["medications", "dosing", "nice"] },
    { label: "BSAC", url: "https://bsac.org.uk/paediatricpathways/", emoji: "🧫", tags: ["paediatrics", "pathways", "antimicrobial"] },
    { label: "MDCalc", url: "https://www.mdcalc.com/", emoji: "🧮", tags: ["scores", "calculator", "reference"] },
    { label: "Healthier Together", url: "https://www.healthiertogether.nhs.uk/professional", emoji: "🌿", tags: ["paediatrics", "guidelines", "professional"] },
    { label: "SORT", url: "https://www.sort.nhs.uk/home.aspx", emoji: "📚", tags: ["resources", "local", "sort"] },
    { label: "PIER", url: "https://www.piernetwork.org/", emoji: "🧠", tags: ["guidelines", "paediatrics", "pier"] },
    { label: "Staffnet", url: "https://staffnet.uhs.nhs.uk", emoji: "🏢", tags: ["uhs", "intranet", "staff"] },
    { label: "Southampton Hospital at Home (H@H)", url: "https://forms.office.com/pages/responsepage.aspx?id=wRwyQbnsfEaw1YVGRNlOO96jJGeS21RFoF5oTRt3gkpUODdMM1JGV0tKU0pTTjI0R1VSUlhaWk5UTy4u&route=shorturl", emoji: "🏠", tags: ["h@h", "hospital at home", "southampton"] }
  ];

  function normalise(value) {
    return String(value || "").toLowerCase().trim();
  }

  function getSearchText(link) {
    var tagText = Array.isArray(link.tags) ? link.tags.join(" ") : "";
    return normalise(link.label + " " + tagText + " " + link.url);
  }

  function createLinkButton(link) {
    var anchor = document.createElement("a");
    anchor.className = "app-btn";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.setAttribute("aria-label", link.label);

    var emoji = document.createElement("span");
    emoji.className = "quick-link-emoji";
    emoji.textContent = link.emoji || "🔗";

    var text = document.createElement("span");
    text.textContent = link.label;

    anchor.appendChild(emoji);
    anchor.appendChild(text);
    return anchor;
  }

  function renderLinks(links, grid, emptyState) {
    grid.textContent = "";
    links.forEach(function(link) {
      grid.appendChild(createLinkButton(link));
    });
    emptyState.hidden = links.length > 0;
  }

  function initQuickLinks() {
    var searchInput = document.getElementById("quick-links-search");
    var grid = document.getElementById("quick-links-grid");
    var emptyState = document.getElementById("quick-links-empty");
    if (!searchInput || !grid || !emptyState) return;

    renderLinks(QUICK_LINKS, grid, emptyState);

    searchInput.addEventListener("input", function() {
      var query = normalise(searchInput.value);
      var filtered = QUICK_LINKS.filter(function(link) {
        return getSearchText(link).indexOf(query) !== -1;
      });
      renderLinks(filtered, grid, emptyState);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initQuickLinks);
  } else {
    initQuickLinks();
  }
})();
