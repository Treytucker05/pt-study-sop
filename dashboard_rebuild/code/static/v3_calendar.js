const filters = {
  sources: {},
  courses: {},
};

let filtersInitialized = false;
let calendarInstance = null;

const sourceLabels = {
  course_event: "Course Events",
  study_session: "Study Sessions",
  planned_repetition: "Planned Repetition",
};

function formatStatusMessage(status) {
  if (!status) return "Status unavailable";
  if (status.connected) {
    return `Connected${status.email ? ` (${status.email})` : ""}`;
  }
  if (status.error) return `Not connected (${status.error})`;
  return "Not connected";
}

async function fetchCalendarData(info) {
  const params = new URLSearchParams({
    start: info.startStr,
    end: info.endStr,
  });
  const response = await fetch(`/api/v3/calendar/data?${params.toString()}`);
  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || "Failed to load calendar data");
  }
  return data;
}

function renderFilters(sources, courses) {
  const container = document.getElementById("calendar-filters");
  if (!container) return;
  container.innerHTML = "";

  const sourceHeader = document.createElement("div");
  sourceHeader.className = "v3-filter-title";
  sourceHeader.textContent = "Event Types";
  container.appendChild(sourceHeader);

  sources.forEach((source) => {
    if (!(source.id in filters.sources)) {
      filters.sources[source.id] = true;
    }
    const row = document.createElement("label");
    row.className = "v3-filter-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = filters.sources[source.id];
    checkbox.addEventListener("change", () => {
      filters.sources[source.id] = checkbox.checked;
      calendarInstance?.refetchEvents();
    });

    const text = document.createElement("span");
    text.textContent = source.label || sourceLabels[source.id] || source.id;

    row.appendChild(checkbox);
    row.appendChild(text);
    container.appendChild(row);
  });

  if (courses.length) {
    const courseHeader = document.createElement("div");
    courseHeader.className = "v3-filter-title";
    courseHeader.textContent = "Courses";
    container.appendChild(courseHeader);
  }

  courses.forEach((course) => {
    if (!(course.id in filters.courses)) {
      filters.courses[course.id] = true;
    }
    const row = document.createElement("label");
    row.className = "v3-filter-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = filters.courses[course.id];
    checkbox.addEventListener("change", () => {
      filters.courses[course.id] = checkbox.checked;
      calendarInstance?.refetchEvents();
    });

    const swatch = document.createElement("span");
    swatch.className = "v3-color";
    if (course.color) {
      swatch.style.background = course.color;
    }

    const text = document.createElement("span");
    text.textContent = course.code || course.name || "Untitled";

    row.appendChild(checkbox);
    row.appendChild(swatch);
    row.appendChild(text);
    container.appendChild(row);
  });
}

async function updateGcalStatus() {
  const statusEl = document.getElementById("gcal-status");
  if (!statusEl) return;
  statusEl.textContent = "Checking status...";
  try {
    const response = await fetch("/api/gcal/status");
    const status = await response.json();
    statusEl.textContent = formatStatusMessage(status);
  } catch (error) {
    statusEl.textContent = "Status unavailable";
  }
}

async function startGcalAuth() {
  const response = await fetch("/api/gcal/auth/start");
  const data = await response.json();
  if (!data.auth_url) {
    alert(data.error || "Unable to start Google auth");
    return;
  }
  const popup = window.open(data.auth_url, "gcal-auth", "width=520,height=640");
  if (!popup) {
    alert("Popup blocked. Please allow popups and try again.");
  }
}

async function runGcalSync() {
  const button = document.getElementById("gcal-sync-btn");
  if (button) button.disabled = true;
  try {
    const response = await fetch("/api/gcal/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!result.success) {
      alert(result.error || "Sync failed");
    }
    calendarInstance?.refetchEvents();
    updateGcalStatus();
  } catch (error) {
    alert("Sync failed");
  } finally {
    if (button) button.disabled = false;
  }
}

async function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  calendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    height: "auto",
    navLinks: true,
    editable: false,
    selectable: false,
    eventSources: [
      async (info, success, failure) => {
        try {
          const data = await fetchCalendarData(info);
          if (!filtersInitialized) {
            filtersInitialized = true;
            renderFilters(data.sources || [], data.courses || []);
          }
          const filtered = (data.events || []).filter((event) => {
            const source = event.extendedProps?.source;
            if (source && filters.sources[source] === false) {
              return false;
            }
            const courseId = event.extendedProps?.course_id;
            if (
              source === "course_event" &&
              courseId &&
              filters.courses[courseId] === false
            ) {
              return false;
            }
            return true;
          });
          success(filtered);
        } catch (error) {
          failure(error);
        }
      },
    ],
  });

  calendarInstance.render();
}

document.addEventListener("DOMContentLoaded", () => {
  initCalendar();
  updateGcalStatus();

  document.getElementById("gcal-auth-btn")?.addEventListener("click", () => {
    startGcalAuth();
  });

  document.getElementById("gcal-sync-btn")?.addEventListener("click", () => {
    runGcalSync();
  });

  window.addEventListener("message", (event) => {
    if (event?.data?.type === "gcal-auth-success") {
      updateGcalStatus();
      calendarInstance?.refetchEvents();
    }
  });
});
