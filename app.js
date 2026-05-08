const state = {
  topic: "",
  notes: "",
  sentences: [],
  cards: [],
  timerId: null,
  secondsLeft: 30 * 60,
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
  const highlights = sentences.slice(0, 5);
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

renderStudyKit(document.querySelector("#topic").value, document.querySelector("#notes").value);
