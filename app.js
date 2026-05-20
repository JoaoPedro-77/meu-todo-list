const STORAGE_KEY = "todolist-items-v1";

const nameInput = document.querySelector(".js-name-input");
const daySelect = document.querySelector(".js-due-day");
const monthSelect = document.querySelector(".js-due-month");
const yearSelect = document.querySelector(".js-due-year");
const timeInput = document.querySelector(".js-due-time");
const listEl = document.querySelector(".js-todo-list");
const form = document.querySelector(".js-form");

let todos = load();
let chartInstance = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } 
  catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/** Texto da lista em dia/mês/ano (DD/MM/AAAA). O valor guardado é sempre YYYY-MM-DD. */
function formatDateDisplay(iso) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (m) {
    const [, y, mo, d] = m;
    return `${d}/${mo}/${y}`;
  }
  const date = new Date(iso + "T12:00:00");
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/** Relógio 24 h para o texto da lista (ex.: 14h30, 09h); o valor guardado continua HH:mm do <input type="time">. */
function formatTimeDisplay(hm) {
  if (!hm) return "";
  const [hRaw, mRaw] = hm.split(":");
  const h = parseInt(hRaw, 10);
  const m = parseInt(mRaw ?? "0", 10);
  if (Number.isNaN(h)) return hm;
  const mm = Number.isNaN(m) ? 0 : m;
  const hh = String(h).padStart(2, "0");
  if (mm === 0) return `${hh}h`;
  return `${hh}h${String(mm).padStart(2, "0")}`;
}

function buildScheduleLine(item) {
  const datePart = item.dueDate ? formatDateDisplay(item.dueDate) : "";
  const timePart = item.dueTime ? formatTimeDisplay(item.dueTime) : "";

  if (datePart && timePart) {
    return "Quando: " + datePart + " às " + timePart;
  }
  if (datePart) {
    return "Data: " + datePart;
  }
  if (timePart) {
    return "Horário: " + timePart;
  }
  return "";
}

function render() {
  updateDashboard();
  if (todos.length === 0) {
    listEl.innerHTML =
      '<p class="empty">Nenhuma tarefa ainda. Digite acima e clique em Adicionar.</p>';
    return;
  }

  listEl.innerHTML = "";
  const ul = document.createElement("ul");
  ul.className = "list";

  todos.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = item.done ? "done" : "";
    if (item.dueDate || item.dueTime) {
      li.classList.add("has-meta");
    }

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!item.done;
    cb.setAttribute("aria-label", "Concluída");
    cb.addEventListener("change", () => {
      item.done = cb.checked;
      li.classList.toggle("done", item.done);
      save();
      updateDashboard();
    });

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = item.name;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-delete";
    del.textContent = "Excluir";
    del.addEventListener("click", () => {
      todos.splice(index, 1);
      save();
      render();
    });

    li.append(cb, text, del);

    const scheduleText = buildScheduleLine(item);
    if (scheduleText) {
      const meta = document.createElement("div");
      meta.className = "task-meta";
      meta.textContent = scheduleText;
      li.appendChild(meta);
    }

    ul.appendChild(li);
  });

  listEl.appendChild(ul);
}

function daysInMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate();
}

function fillYearOptions() {
  const y = new Date().getFullYear();
  for (let yi = y - 1; yi <= y + 6; yi += 1) {
    const opt = document.createElement("option");
    opt.value = String(yi);
    opt.textContent = String(yi);
    yearSelect.appendChild(opt);
  }
}

function fillDayOptions() {
  const y = parseInt(yearSelect.value, 10);
  const m = parseInt(monthSelect.value, 10);
  const prev = daySelect.value;
  daySelect.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
  const max = y && m ? daysInMonth(y, m) : 31;
  for (let d = 1; d <= max; d += 1) {
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = String(d);
    daySelect.appendChild(opt);
  }
  if (prev && parseInt(prev, 10) <= max) {
    daySelect.value = prev;
  } else {
    daySelect.value = "";
  }
}

function resetDateFields() {
  daySelect.value = "";
  monthSelect.value = "";
  yearSelect.value = "";
  fillDayOptions();
}

/** "" se tudo vazio; null se incompleto ou dia inválido para o mês; senão YYYY-MM-DD. */
function getDueDateIsoFromFields() {
  const d = daySelect.value;
  const m = monthSelect.value;
  const y = yearSelect.value;
  if (!d && !m && !y) return "";
  if (!d || !m || !y) return null;
  const di = parseInt(d, 10);
  const mi = parseInt(m, 10);
  const yi = parseInt(y, 10);
  const max = daysInMonth(yi, mi);
  if (di < 1 || di > max) return null;
  return `${yi}-${String(mi).padStart(2, "0")}-${String(di).padStart(2, "0")}`;
}

function addTodo() {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  const dueDateRaw = getDueDateIsoFromFields();
  if (dueDateRaw === null) {
    alert("Para a data, escolha dia, mês e ano, ou deixe os três vazios.");
    return;
  }
  const dueDate = dueDateRaw;
  const dueTime = timeInput.value || "";

  todos.push({
    name,
    dueDate,
    dueTime,
    done: false,
  });

  nameInput.value = "";
  resetDateFields();
  save();
  render();
  nameInput.focus();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo();
});

fillYearOptions();
fillDayOptions();
monthSelect.addEventListener("change", fillDayOptions);
yearSelect.addEventListener("change", fillDayOptions);

function updateDashboard() {
  const total = todos.length;
  const completed = todos.filter((t) => t.done).length;
  const pending = total - completed;
  const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Atualiza os textos
  const totalEl = document.querySelector(".js-stat-total");
  const doneEl = document.querySelector(".js-stat-done");
  const pendingEl = document.querySelector(".js-stat-pending");
  const ratioEl = document.querySelector(".js-stat-ratio");

  if (totalEl) totalEl.textContent = String(total);
  if (doneEl) doneEl.textContent = String(completed);
  if (pendingEl) pendingEl.textContent = String(pending);
  if (ratioEl) ratioEl.textContent = `${ratio}%`;

  const canvas = document.getElementById("todoChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Destrói gráfico anterior se houver
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Se não houver tarefas, exibe um gráfico "vazio" neutro
  const chartData = total > 0 ? [completed, pending] : [0, 1];
  const chartColors = total > 0 
    ? ["#6bcf7f", "#3d9cf0"] 
    : ["#2d3a4d", "#2d3a4d"];

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: total > 0 ? ["Concluídas", "Pendentes"] : ["Nenhuma tarefa", ""],
      datasets: [
        {
          data: chartData,
          backgroundColor: chartColors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: total > 0,
        },
      },
    },
  });
}

render();
