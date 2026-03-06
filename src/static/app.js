document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const modalOverlay = document.getElementById("modal-overlay");
  const modalClose = document.getElementById("modal-close");
  const modalActivityName = document.getElementById("modal-activity-name");

  let allActivities = {};
  let currentActivityName = "";

  // Show a toast message
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Open registration modal
  function openModal(activityName) {
    currentActivityName = activityName;
    modalActivityName.textContent = activityName;
    document.getElementById("email").value = "";
    modalOverlay.classList.remove("hidden");
  }

  // Close registration modal
  function closeModal() {
    modalOverlay.classList.add("hidden");
  }

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();
      populateCategories();
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Populate category filter from data
  function populateCategories() {
    const cats = new Set();
    Object.values(allActivities).forEach((d) => {
      if (d.category) cats.add(d.category);
    });
    // Keep the "All Categories" option, remove old dynamic ones
    categoryFilter.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
    [...cats].sort().forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
  }

  // Filter, sort, and render activity cards
  function renderActivities() {
    const query = searchInput.value.toLowerCase();
    const selectedCat = categoryFilter.value;
    const sortVal = sortSelect.value;

    let entries = Object.entries(allActivities);

    // Filter by search
    if (query) {
      entries = entries.filter(
        ([name, d]) =>
          name.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCat) {
      entries = entries.filter(([, d]) => d.category === selectedCat);
    }

    // Sort
    entries.sort((a, b) => {
      const [nameA, detA] = a;
      const [nameB, detB] = b;
      switch (sortVal) {
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "spots-asc":
          return (
            detA.max_participants -
            detA.participants.length -
            (detB.max_participants - detB.participants.length)
          );
        case "spots-desc":
          return (
            detB.max_participants -
            detB.participants.length -
            (detA.max_participants - detA.participants.length)
          );
        default:
          return nameA.localeCompare(nameB);
      }
    });

    activitiesList.innerHTML = "";

    if (entries.length === 0) {
      activitiesList.innerHTML = "<p class='no-results'>No activities match your criteria.</p>";
      return;
    }

    entries.forEach(([name, details]) => {
      const spotsLeft = details.max_participants - details.participants.length;

      const card = document.createElement("div");
      card.className = "activity-card";

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}" title="Unregister">&#10060;</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p class="no-participants"><em>No participants yet</em></p>`;

      card.innerHTML = `
        <div class="card-header">
          <h4>${name}</h4>
          <span class="category-badge">${details.category || ""}</span>
        </div>
        <p class="card-description">${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">${participantsHTML}</div>
        <button class="register-btn" data-activity="${name}" ${spotsLeft === 0 ? "disabled" : ""}>
          ${spotsLeft === 0 ? "Full" : "Register Student"}
        </button>
      `;

      activitiesList.appendChild(card);
    });

    // Bind register buttons
    document.querySelectorAll(".register-btn").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.activity));
    });

    // Bind unregister buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister
  async function handleUnregister(event) {
    const button = event.target.closest(".delete-btn");
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle signup form
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(currentActivityName)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        closeModal();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Live filtering & sorting
  searchInput.addEventListener("input", renderActivities);
  categoryFilter.addEventListener("change", renderActivities);
  sortSelect.addEventListener("change", renderActivities);

  // Init
  fetchActivities();
});
