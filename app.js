const state = {
  topic: "",
  notes: "",
  sentences: [],
  cards: [],
  timerId: null,
  secondsLeft: 30 * 60,
  importantNotes: [],
  suggestedNotes: [],
  user: null,
  isGuest: false,
  savedKits: [],
  generatedImages: [],
};

const stopWords = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "but", "can",
  "does", "for", "from", "has", "have", "into", "its", "more", "not", "that",
  "the", "their", "then", "this", "through", "uses", "with", "while", "will",
  "usually", "across", "movement", "require", "requires",
]);

const form = document.querySelector("#noteForm");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const kitTitle = document.querySelector("#kitTitle");
const mastery = document.querySelector("#mastery");
const summaryList = document.querySelector("#summaryList");
const examAngle = document.querySelector("#examAngle");
const cardsGrid = document.querySelector("#cardsGrid");
const quizList = document.querySelector("#quizList");
const planList = document.querySelector("#planList");
const timer = document.querySelector("#timer");
const suggestedNotesList = document.querySelector("#suggestedNotesList");
const addImportantNoteBtn = document.querySelector("#addImportantNoteBtn");
const importantNoteInput = document.querySelector("#importantNoteInput");
const importantNotesList = document.querySelector("#importantNotesList");

// Auth elements
const authModal = document.querySelector("#authModal");
const authTabs = document.querySelectorAll(".auth-tab");
const authForms = document.querySelectorAll(".auth-form");
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const guestModeBtn = document.querySelector("#guestModeBtn");
const userMenuBtn = document.querySelector("#userMenuBtn");
const accountSidebar = document.querySelector("#accountSidebar");
const closeAccountBtn = document.querySelector("#closeAccountBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const accountNavItems = document.querySelectorAll(".account-nav-item");
const accountSections = document.querySelectorAll(".account-section");
const updateProfileBtn = document.querySelector("#updateProfileBtn");
const accountName = document.querySelector("#accountName");
const accountEmail = document.querySelector("#accountEmail");
const profileName = document.querySelector("#profileName");
const profileEmail = document.querySelector("#profileEmail");
const profilePhone = document.querySelector("#profilePhone");
const savedKitsList = document.querySelector("#savedKitsList");

// Image generation elements
const generateImageBtn = document.querySelector("#generateImageBtn");
const imageLoader = document.querySelector("#imageLoader");
const imageGallery = document.querySelector("#imageGallery");

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18);
}

function keywordsFrom(text) {
  const counts = new Map();
  text
    .toLowerCase()
    .match(/[a-z][a-z-]{3,}/g)
    ?.filter((word) => !stopWords.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 8)
    .map(([word]) => word);
}

function makeCards(sentences, keywords) {
  const source = sentences.length ? sentences : ["Add more notes to generate stronger flashcards."];
  return source.slice(0, 6).map((sentence, index) => {
    const keyword = keywords.find((word) => sentence.toLowerCase().includes(word)) || keywords[index] || "concept";
    return {
      question: `Explain "${titleCase(keyword)}" in your own words.`,
      answer: sentence,
    };
  });
}

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function makeDistractors(answer, keywords) {
  const pool = keywords.filter((keyword) => !answer.toLowerCase().includes(keyword));
  return [
    pool[0] ? `It mainly describes ${pool[0]}.` : "It is unrelated to the topic.",
    pool[1] ? `It always requires ${pool[1]}.` : "It only happens in advanced examples.",
  ];
}

function scoreImportance(sentence, keywords, allSentences) {
  // Score based on keyword density
  let keywordScore = 0;
  keywords.forEach((keyword) => {
    if (sentence.toLowerCase().includes(keyword)) keywordScore += 2;
  });
  
  // Score based on length (medium sentences are usually more informative)
  const words = sentence.split(/\s+/).length;
  const lengthScore = words > 10 && words < 40 ? 2 : 1;
  
  // Score based on position (earlier sentences often more important)
  const positionScore = Math.max(0, 3 - allSentences.indexOf(sentence) * 0.1);
  
  // Score based on unique vocabulary
  const uniqueWords = new Set(sentence.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []).size;
  const uniqueScore = uniqueWords > 8 ? 2 : 1;
  
  return keywordScore + lengthScore + positionScore + uniqueScore;
}

function generateSmartSummary(sentences, keywords, topic) {
  if (!sentences.length) return [];
  
  // Score and sort sentences by importance
  const scored = sentences.map((sentence) => ({
    sentence,
    score: scoreImportance(sentence, keywords, sentences),
  }));
  
  // Take top 5 sentences, but maintain original order
  const topIndices = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => sentences.indexOf(item.sentence))
    .sort((a, b) => a - b);
  
  return topIndices.map((idx) => sentences[idx]);
}

function suggestImportantNotes(topic, keywords, existingNotes) {
  // Knowledge base of important concepts by topic
  const conceptBase = {
    biology: {
      cell: ["Cell membrane structure", "Organelle functions", "Cell cycle stages", "Photosynthesis and respiration"],
      transport: ["Concentration gradients", "ATP energy requirements", "Membrane proteins", "Transport mechanisms comparison"],
      genetics: ["DNA structure", "Replication process", "Protein synthesis", "Gene expression"],
    },
    chemistry: {
      general: ["Periodic table trends", "Chemical bonding types", "Oxidation states", "Reaction mechanisms"],
      reactions: ["Reaction rates", "Equilibrium constants", "Catalysts", "Energy changes (endothermic/exothermic)"],
      solutions: ["Molarity and dilution", "pH and pOH", "Buffer systems", "Solubility rules"],
    },
    physics: {
      general: ["Newton's laws", "Forces and acceleration", "Energy conservation", "Momentum"],
      thermodynamics: ["Heat transfer", "Entropy", "Work and power", "Temperature scales"],
      waves: ["Wavelength and frequency", "Wave interference", "Doppler effect", "Sound vs. light"],
    },
  };
  
  // Determine topic category
  const lowerTopic = topic.toLowerCase();
  let suggestions = [];
  
  Object.entries(conceptBase).forEach(([subject, categories]) => {
    Object.entries(categories).forEach(([category, concepts]) => {
      if (lowerTopic.includes(subject) || lowerTopic.includes(category)) {
        suggestions.push(...concepts);
      }
    });
  });
  
  // Filter out concepts already covered
  const existingKeywords = new Set(keywords.map((k) => k.toLowerCase()));
  suggestions = suggestions.filter(
    (suggestion) =>
      !existingNotes.toLowerCase().includes(suggestion.toLowerCase()) &&
      !existingKeywords.has(suggestion.toLowerCase())
  );
  
  // Remove duplicates and limit to top 5
  return [...new Set(suggestions)].slice(0, 5);
}

function renderImportantNotes() {
  if (importantNotesList) {
    importantNotesList.innerHTML = "";
    state.importantNotes.forEach((note, index) => {
      const item = document.createElement("li");
      item.className = "important-note-item";
      item.innerHTML = `
        <span>${escapeHtml(note)}</span>
        <button type="button" class="remove-note" data-index="${index}">✕</button>
      `;
      item.querySelector(".remove-note").addEventListener("click", () => {
        state.importantNotes.splice(index, 1);
        renderImportantNotes();
      });
      importantNotesList.appendChild(item);
    });
  }
}

function renderSuggestedNotes(suggestions) {
  if (suggestedNotesList) {
    suggestedNotesList.innerHTML = "";
    suggestions.forEach((suggestion) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggested-note";
      button.textContent = `+ ${suggestion}`;
      button.addEventListener("click", () => {
        if (!state.importantNotes.includes(suggestion)) {
          state.importantNotes.push(suggestion);
          renderImportantNotes();
          renderSuggestedNotes(suggestions.filter((s) => s !== suggestion));
        }
      });
      suggestedNotesList.appendChild(button);
    });
  }
}

// ===== Authentication & Account Management =====

function initAuthUI() {
  const savedUser = localStorage.getItem("focusforgeUser");
  if (savedUser) {
    state.user = JSON.parse(savedUser);
    state.isGuest = false;
    closeAuthModal();
    updateAccountUI();
  } else {
    showAuthModal();
  }
}

function showAuthModal() {
  authModal.classList.add("active");
}

function closeAuthModal() {
  authModal.classList.remove("active");
}

function switchAuthTab(tabName) {
  authTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  authForms.forEach((form) => form.classList.toggle("active", form.id === `${tabName}Tab`));
}

function handleLogin(email, password) {
  // Simulate login - in production, this would be a real API call
  const user = {
    id: Date.now(),
    email: email,
    name: email.split("@")[0],
    phone: "",
    createdAt: new Date().toISOString(),
  };
  state.user = user;
  state.isGuest = false;
  localStorage.setItem("focusforgeUser", JSON.stringify(user));
  closeAuthModal();
  updateAccountUI();
}

function handleSignup(name, email, password, phone) {
  const user = {
    id: Date.now(),
    name: name,
    email: email,
    phone: phone || "",
    createdAt: new Date().toISOString(),
  };
  state.user = user;
  state.isGuest = false;
  localStorage.setItem("focusforgeUser", JSON.stringify(user));
  closeAuthModal();
  updateAccountUI();
}

function handleGuestMode() {
  state.user = {
    id: "guest",
    name: "Guest User",
    email: "guest@focusforge.app",
    phone: "",
  };
  state.isGuest = true;
  closeAuthModal();
  updateAccountUI();
}

function updateAccountUI() {
  if (state.user) {
    accountName.textContent = state.user.name;
    accountEmail.textContent = state.user.email;
    profileName.value = state.user.name;
    profileEmail.value = state.user.email;
    profilePhone.value = state.user.phone || "";
    
    const avatar = document.querySelector("#accountAvatar");
    avatar.textContent = state.user.name.charAt(0).toUpperCase();
  }
}

function toggleAccountSidebar() {
  accountSidebar.classList.toggle("open");
}

function closeAccountSidebar() {
  accountSidebar.classList.remove("open");
}

function switchAccountSection(sectionName) {
  accountNavItems.forEach((item) => item.classList.toggle("active", item.dataset.section === sectionName));
  accountSections.forEach((section) => {
    const sectionId = section.id.replace("Section", "");
    section.classList.toggle("active", sectionId === sectionName);
  });
}

function updateUserProfile() {
  if (state.user) {
    state.user.name = profileName.value;
    state.user.phone = profilePhone.value;
    localStorage.setItem("focusforgeUser", JSON.stringify(state.user));
    updateAccountUI();
    alert("Profile updated successfully!");
  }
}

function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    state.user = null;
    state.isGuest = false;
    localStorage.removeItem("focusforgeUser");
    initAuthUI();
  }
}

function saveStudyKit() {
  if (!state.isGuest && state.user) {
    const kit = {
      id: Date.now(),
      topic: state.topic,
      notes: state.notes,
      importantNotes: state.importantNotes,
      images: state.generatedImages,
      createdAt: new Date().toISOString(),
    };
    state.savedKits.push(kit);
    localStorage.setItem("focusforgeKits", JSON.stringify(state.savedKits));
    renderSavedKits();
  }
}

function loadSavedKits() {
  const saved = localStorage.getItem("focusforgeKits");
  if (saved) {
    state.savedKits = JSON.parse(saved);
    renderSavedKits();
  }
}

function renderSavedKits() {
  savedKitsList.innerHTML = "";
  if (state.savedKits.length === 0) {
    savedKitsList.innerHTML = '<p class="empty-state">No saved kits yet. Generate one and save it!</p>';
  } else {
    state.savedKits.forEach((kit) => {
      const item = document.createElement("div");
      item.className = "saved-kit-item";
      item.innerHTML = `
        <div>
          <h5>${escapeHtml(kit.topic)}</h5>
          <small>${new Date(kit.createdAt).toLocaleDateString()}</small>
        </div>
        <button type="button" class="load-kit-btn" data-id="${kit.id}">Load</button>
      `;
      item.querySelector(".load-kit-btn").addEventListener("click", () => {
        loadStudyKit(kit.id);
      });
      savedKitsList.appendChild(item);
    });
  }
}

function loadStudyKit(kitId) {
  const kit = state.savedKits.find((k) => k.id === kitId);
  if (kit) {
    document.querySelector("#topic").value = kit.topic;
    document.querySelector("#notes").value = kit.notes;
    state.importantNotes = kit.importantNotes || [];
    state.generatedImages = kit.images || [];
    renderStudyKit(kit.topic, kit.notes);
    renderImportantNotes();
    if (state.generatedImages.length > 0) {
      renderImageGallery();
    }
    closeAccountSidebar();
  }
}

// ===== Image Generation =====

async function generateTopicImage() {
  if (!state.topic) {
    alert("Please enter a topic first");
    return;
  }

  imageLoader.style.display = "flex";
  generateImageBtn.disabled = true;

  try {
    // Generate image description from topic and keywords
    const keywords = keywordsFrom(`${state.topic} ${state.notes}`);
    const imagePrompt = `Educational illustration: ${state.topic}. Key concepts: ${keywords.slice(0, 3).join(", ")}. Clear, simple, informative style suitable for studying.`;

    // Use a free image generation API (we'll use Unsplash API for demonstration)
    // In production, you might use DALL-E, Stable Diffusion, or similar
    const imageUrl = await generateImageViaAPI(imagePrompt);

    if (imageUrl) {
      state.generatedImages.push({
        url: imageUrl,
        prompt: imagePrompt,
        createdAt: new Date().toISOString(),
      });
      renderImageGallery();
    }
  } catch (error) {
    console.error("Image generation error:", error);
    alert("Failed to generate image. Using placeholder instead.");
    // Add a placeholder/fallback
    state.generatedImages.push({
      url: `https://via.placeholder.com/400x300?text=${encodeURIComponent(state.topic)}`,
      prompt: state.topic,
      createdAt: new Date().toISOString(),
    });
    renderImageGallery();
  } finally {
    imageLoader.style.display = "none";
    generateImageBtn.disabled = false;
  }
}

async function generateImageViaAPI(prompt) {
  try {
    // Using Hugging Face Inference API with a free model
    // You can replace this with your own API endpoint
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1", {
      headers: { Authorization: "Bearer hf_" }, // You would need a real token
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    });

    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.warn("API call failed, using Unsplash instead");
  }

  // Fallback to Unsplash API (no key required for search)
  try {
    const query = prompt.split(":")[1]?.split(".")[0]?.trim() || prompt.split(" ")[0];
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&count=1&client_id=YOUR_UNSPLASH_KEY`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results[0]) {
        return data.results[0].urls.regular;
      }
    }
  } catch (error) {
    console.warn("Unsplash API failed");
  }

  // Final fallback: generate a data URL with the prompt text
  return generatePlaceholderImage(prompt);
}

function generatePlaceholderImage(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 400, 300);
  gradient.addColorStop(0, "#c7dcff");
  gradient.addColorStop(1, "#bfe9dd");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 300);

  // Text
  ctx.fillStyle = "#19202a";
  ctx.font = "bold 24px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const words = text.split(" ").slice(0, 5);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? currentLine + " " + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 350) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);

  const startY = 150 - (lines.length * 30) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, 200, startY + index * 30);
  });

  return canvas.toDataURL();
}

function renderImageGallery() {
  imageGallery.innerHTML = "";
  if (state.generatedImages.length === 0) {
    imageGallery.innerHTML = '<p class="empty-state">No images yet. Generate one to get started!</p>';
  } else {
    state.generatedImages.forEach((image, index) => {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.innerHTML = `
        <img src="${image.url}" alt="Generated image for ${state.topic}" />
        <div class="gallery-actions">
          <button type="button" class="gallery-btn" title="Download">⬇️</button>
          <button type="button" class="gallery-btn delete-btn" data-index="${index}" title="Delete">🗑️</button>
        </div>
      `;

      item.querySelector(".gallery-btn:not(.delete-btn)").addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = image.url;
        link.download = `focusforge-${state.topic}-${index}.png`;
        link.click();
      });

      item.querySelector(".delete-btn").addEventListener("click", () => {
        state.generatedImages.splice(index, 1);
        renderImageGallery();
      });

      imageGallery.appendChild(item);
    });
  }
}

function renderStudyKit(topic, notes) {
  const sentences = splitSentences(notes);
  const keywords = keywordsFrom(`${topic} ${notes}`);
  const cards = makeCards(sentences, keywords);

  state.topic = topic;
  state.notes = notes;
  state.sentences = sentences;
  state.cards = cards;

  kitTitle.textContent = topic || "Untitled study kit";
  mastery.textContent = `${Math.min(96, 54 + sentences.length * 5 + keywords.length * 2)}%`;

  summaryList.innerHTML = "";
  const highlights = generateSmartSummary(sentences, keywords, topic);
  if (!highlights.length) {
    highlights.push("Add a paragraph of class notes, textbook excerpts, or rough bullet points.");
  }
  highlights.forEach((sentence) => {
    const item = document.createElement("li");
    item.textContent = sentence;
    summaryList.appendChild(item);
  });

  const focusTerms = keywords.slice(0, 4).map(titleCase).join(", ");
  examAngle.textContent = focusTerms
    ? `Expect questions that compare ${focusTerms} and ask when each idea applies.`
    : "Expect definition, comparison, and short explanation questions once more detail is added.";

  // Generate and display suggested important notes
  const suggestions = suggestImportantNotes(topic, keywords, notes);
  renderSuggestedNotes(suggestions);
  state.suggestedNotes = suggestions;

  renderCards(cards);
  renderQuiz(cards, keywords);
  renderPlan(topic, keywords);
}

function renderCards(cards) {
  cardsGrid.innerHTML = "";
  cards.forEach((card) => {
    const node = document.createElement("article");
    node.className = "flashcard";
    node.innerHTML = `
      <div>
        <h4>Prompt</h4>
        <p>${escapeHtml(card.question)}</p>
        <p class="answer">${escapeHtml(card.answer)}</p>
      </div>
      <button class="ghost" type="button">Reveal</button>
    `;
    node.querySelector("button").addEventListener("click", () => {
      node.classList.toggle("revealed");
      node.querySelector("button").textContent = node.classList.contains("revealed") ? "Hide" : "Reveal";
    });
    cardsGrid.appendChild(node);
  });
}

function renderQuiz(cards, keywords) {
  quizList.innerHTML = "";
  cards.slice(0, 4).forEach((card, index) => {
    const options = [card.answer, ...makeDistractors(card.answer, keywords)].sort(() => Math.random() - 0.5);
    const item = document.createElement("article");
    item.className = "quiz-item";
    item.innerHTML = `
      <p>${index + 1}. ${escapeHtml(card.question)}</p>
      <div class="quiz-actions"></div>
    `;
    const actions = item.querySelector(".quiz-actions");
    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option;
      button.addEventListener("click", () => {
        [...actions.children].forEach((child) => {
          child.disabled = true;
          child.classList.toggle("correct", child.textContent === card.answer);
        });
        button.classList.toggle("incorrect", option !== card.answer);
      });
      actions.appendChild(button);
    });
    quizList.appendChild(item);
  });
}

function renderPlan(topic, keywords) {
  const focus = keywords.slice(0, 3).map(titleCase).join(", ") || topic || "today's material";
  const steps = [
    `5 min: skim the summary and mark anything that feels uncertain.`,
    `8 min: drill flashcards for ${focus}.`,
    `10 min: answer the quiz without looking at your notes.`,
    `5 min: rewrite the weakest answer in simpler language.`,
    `2 min: choose one concept to revisit tomorrow.`,
  ];
  planList.innerHTML = "";
  steps.forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    planList.appendChild(item);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[char]);
}

function setActiveTab(tabName) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === tabName));
}

function tickTimer() {
  state.secondsLeft -= 1;
  const minutes = Math.floor(state.secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (state.secondsLeft % 60).toString().padStart(2, "0");
  timer.textContent = `${minutes}:${seconds}`;
  if (state.secondsLeft <= 0) {
    clearInterval(state.timerId);
    state.timerId = null;
    timer.textContent = "Done";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  renderStudyKit(data.get("topic").trim(), data.get("notes").trim());
  saveStudyKit();
});

tabs.forEach((tab) => tab.addEventListener("click", () => setActiveTab(tab.dataset.tab)));

document.querySelector("#shuffleCards").addEventListener("click", () => {
  state.cards.sort(() => Math.random() - 0.5);
  renderCards(state.cards);
});

document.querySelector("#resetQuiz").addEventListener("click", () => {
  renderQuiz(state.cards, keywordsFrom(`${state.topic} ${state.notes}`));
});

document.querySelector("#copySummary").addEventListener("click", async () => {
  const text = [...summaryList.children].map((item) => `- ${item.textContent}`).join("\n");
  await navigator.clipboard.writeText(`${state.topic}\n${text}`);
});

document.querySelector("#startTimer").addEventListener("click", () => {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
    return;
  }
  state.secondsLeft = 30 * 60;
  tickTimer();
  state.timerId = setInterval(tickTimer, 1000);
});

if (addImportantNoteBtn && importantNoteInput) {
  addImportantNoteBtn.addEventListener("click", () => {
    const note = importantNoteInput.value.trim();
    if (note && !state.importantNotes.includes(note)) {
      state.importantNotes.push(note);
      importantNoteInput.value = "";
      renderImportantNotes();
    }
  });

  importantNoteInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addImportantNoteBtn.click();
    }
  });
}

// ===== Auth & Account Event Listeners =====

// Auth tabs
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchAuthTab(tab.dataset.tab));
});

// Login form
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.querySelector("#loginEmail").value;
    const password = document.querySelector("#loginPassword").value;
    handleLogin(email, password);
  });
}

// Signup form
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.querySelector("#signupName").value;
    const email = document.querySelector("#signupEmail").value;
    const password = document.querySelector("#signupPassword").value;
    const phone = document.querySelector("#signupPhone").value;
    handleSignup(name, email, password, phone);
  });
}

// Guest mode
if (guestModeBtn) {
  guestModeBtn.addEventListener("click", handleGuestMode);
}

// Auth modal close
document.querySelector(".modal-close").addEventListener("click", () => {
  if (state.user) closeAuthModal();
});

// Account menu
if (userMenuBtn) {
  userMenuBtn.addEventListener("click", toggleAccountSidebar);
}

if (closeAccountBtn) {
  closeAccountBtn.addEventListener("click", closeAccountSidebar);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", handleLogout);
}

// Account navigation
accountNavItems.forEach((item) => {
  item.addEventListener("click", () => switchAccountSection(item.dataset.section));
});

if (updateProfileBtn) {
  updateProfileBtn.addEventListener("click", updateUserProfile);
}

// Image generation
if (generateImageBtn) {
  generateImageBtn.addEventListener("click", generateTopicImage);
}

// Close account sidebar when clicking outside
document.addEventListener("click", (e) => {
  if (!accountSidebar.contains(e.target) && !userMenuBtn.contains(e.target)) {
    closeAccountSidebar();
  }
});

// Initialize the app
initAuthUI();
loadSavedKits();
renderStudyKit(document.querySelector("#topic").value, document.querySelector("#notes").value);

// ===== PWA Service Worker Registration =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful');
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// ===== PWA Install Prompt =====
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;

  // Show install button if not already installed
  showInstallButton();
});

function showInstallButton() {
  // Remove existing install button if any
  const existingBtn = document.querySelector('.install-btn');
  if (existingBtn) existingBtn.remove();

  // Create install button
  const installBtn = document.createElement('button');
  installBtn.className = 'install-btn primary-btn';
  installBtn.innerHTML = '📱 Install App';
  installBtn.onclick = installApp;

  // Add to sidebar header
  const sidebarHeader = document.querySelector('.sidebar-header');
  if (sidebarHeader) {
    sidebarHeader.appendChild(installBtn);
  }
}

function installApp() {
  if (!deferredPrompt) return;

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    deferredPrompt = null;
  });
}

// Check if app is already installed
window.addEventListener('appinstalled', (evt) => {
  console.log('App was installed successfully');
  // Hide install button
  const installBtn = document.querySelector('.install-btn');
  if (installBtn) installBtn.remove();
});
