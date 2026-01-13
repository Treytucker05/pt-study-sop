/* ===== Collapsible Section Toggle ===== */
function toggleCollapsible(headerEl) {
  const section = headerEl.closest('.collapsible-section');
  if (section) {
    section.classList.toggle('collapsed');
    // Save state to localStorage
    const sectionId = section.id || section.dataset.section;
    if (sectionId) {
      const collapsed = section.classList.contains('collapsed');
      localStorage.setItem('collapse_' + sectionId, collapsed ? '1' : '0');
    }
  }
}

function initCollapsibles() {
  // Restore collapsed state from localStorage
  document.querySelectorAll('.collapsible-section').forEach(section => {
    const sectionId = section.id || section.dataset.section;
    if (sectionId) {
      const saved = localStorage.getItem('collapse_' + sectionId);
      if (saved === '1') {
        section.classList.add('collapsed');
      }
    }
  });

  // Also restore <details> state from localStorage
  // Default: all sections start COLLAPSED unless explicitly opened by user this session
  document.querySelectorAll('details.section-panel').forEach(details => {
    const sectionId = details.id;

    // Force collapsed on page load - user can expand as needed
    details.removeAttribute('open');

    // Listen for toggle events to save state (but don't restore on load)
    details.addEventListener('toggle', () => {
      if (details.id) {
        localStorage.setItem('details_' + details.id, details.open ? 'open' : 'closed');
      }
    });
  });
}

/* ===== Expand/Collapse All Sections ===== */
function expandAllSections(tabId) {
  const tab = document.getElementById(tabId);
  if (!tab) return;

  // Expand all <details> elements
  tab.querySelectorAll('details.section-panel').forEach(details => {
    details.setAttribute('open', '');
    if (details.id) {
      localStorage.setItem('details_' + details.id, 'open');
    }
  });

  // Also expand .collapsible-section elements
  tab.querySelectorAll('.collapsible-section').forEach(section => {
    section.classList.remove('collapsed');
    const sectionId = section.id || section.dataset.section;
    if (sectionId) {
      localStorage.setItem('collapse_' + sectionId, '0');
    }
  });
}

function collapseAllSections(tabId) {
  const tab = document.getElementById(tabId);
  if (!tab) return;

  // Collapse all <details> elements
  tab.querySelectorAll('details.section-panel').forEach(details => {
    details.removeAttribute('open');
    if (details.id) {
      localStorage.setItem('details_' + details.id, 'closed');
    }
  });

  // Also collapse .collapsible-section elements
  tab.querySelectorAll('.collapsible-section').forEach(section => {
    section.classList.add('collapsed');
    const sectionId = section.id || section.dataset.section;
    if (sectionId) {
      localStorage.setItem('collapse_' + sectionId, '1');
    }
  });
}

// Call initCollapsibles on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initCollapsibles);

// Scroll to top on page load to show hero logo
window.addEventListener('load', () => {
  window.scrollTo({ top: 0, behavior: 'instant' });
});

/* ===== Mobile Navigation Toggle ===== */
function toggleMobileNav() {
  const isOpen = document.body.classList.toggle('mobile-nav-open');
  const hamburger = document.getElementById('hamburger-btn');
  if (hamburger) {
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  const overlay = document.getElementById('mobile-nav-overlay');
  if (overlay) {
    overlay.style.display = isOpen ? 'block' : 'none';
  }
}

function closeMobileNav() {
  document.body.classList.remove('mobile-nav-open');
  const hamburger = document.getElementById('hamburger-btn');
  if (hamburger) {
    hamburger.setAttribute('aria-expanded', 'false');
  }
  const overlay = document.getElementById('mobile-nav-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Close mobile nav on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && document.body.classList.contains('mobile-nav-open')) {
    closeMobileNav();
  }
});

// Close mobile nav when a nav item is clicked
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.mobile-nav-panel .nav-item').forEach(function (item) {
    item.addEventListener('click', closeMobileNav);
  });
});

/* ===== Status Display Helper ===== */
function showStatus(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error('Status element not found:', elementId);
    return;
  }

  let bgColor, textColor;
  switch (type) {
    case 'success':
      bgColor = 'rgba(63, 185, 80, 0.2)';
      textColor = 'var(--success)';
      break;
    case 'error':
      bgColor = 'rgba(248, 81, 73, 0.2)';
      textColor = 'var(--error)';
      break;
    case 'warning':
      bgColor = 'rgba(218, 165, 32, 0.2)';
      textColor = 'var(--warning)';
      break;
    default:
      bgColor = 'rgba(31, 111, 235, 0.2)';
      textColor = 'var(--accent)';
  }

  el.innerHTML = `<div style="padding: 8px 12px; border-radius: 6px; font-size: 13px; background: ${bgColor}; color: ${textColor};">${message}</div>`;
}

/* ===== Fast Entry (Paste from Tutor) ===== */
const FAST_ENTRY_PROMPTS = {
  'session-log': `At the end of our session, output a JSON session log I can paste into my study tracker. Use this exact format:

\`\`\`json
{
  "date": "YYYY-MM-DD",
  "topic": "Main topic we covered",
  "mode": "Core",
  "duration": 45,
  "understanding": 4,
  "retention": 4,
  "system_performance": 5,
  "what_worked": "Bullet points of what was effective, separated by semicolons",
  "what_needs_fixing": "Bullet points of gaps or issues, separated by semicolons",
  "anchors": "Key concepts/hooks created, separated by semicolons",
  "notes": "Any additional insights or next steps"
}
\`\`\`

Rules:
- date: Use today's date in YYYY-MM-DD format
- mode: One of "Core", "Sprint", or "Drill"
- duration: Integer minutes
- understanding/retention/system_performance: Integer 1-5
- All text fields: Use semicolons to separate multiple items

Generate this JSON at the end of our session.`,

  'quick-recap': `At the end of our session, give me a quick JSON recap:

\`\`\`json
{
  "date": "YYYY-MM-DD",
  "topic": "Topic",
  "mode": "Core",
  "duration": 30,
  "understanding": 4,
  "retention": 3,
  "what_worked": "Brief summary",
  "notes": "Key takeaway or next step"
}
\`\`\`
`
};

function copyFastEntryPrompt() {
  const select = document.getElementById('fast-entry-prompt-select');
  const promptKey = select.value;
  const displayDiv = document.getElementById('fast-entry-prompt-display');
  const promptText = document.getElementById('fast-entry-prompt-text');

  if (!promptKey) {
    displayDiv.style.display = 'none';
    return;
  }

  const prompt = FAST_ENTRY_PROMPTS[promptKey];
  if (prompt) {
    promptText.textContent = prompt;
    displayDiv.style.display = 'block';
    navigator.clipboard.writeText(prompt).then(() => {
      showStatus('fast-entry-status', 'Prompt copied to clipboard!', 'success');
    }).catch(() => {
      showStatus('fast-entry-status', 'Select and copy the prompt manually', 'warning');
    });
  }
}

async function submitFastEntry() {
  const pasteContent = document.getElementById('fast-entry-paste').value.trim();
  if (!pasteContent) {
    showStatus('fast-entry-status', 'Please paste session content first', 'error');
    return;
  }

  // Parse the pasted content
  const parsed = parseFastEntry(pasteContent);
  if (!parsed.topic) {
    showStatus('fast-entry-status', 'Could not parse topic from pasted content. Make sure it includes "Topic:" line.', 'error');
    return;
  }

  showStatus('fast-entry-status', 'Ingesting session...', 'info');

  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    });

    if (response.ok) {
      showStatus('fast-entry-status', 'Session ingested successfully!', 'success');
      document.getElementById('fast-entry-paste').value = '';
      loadStats(); // Refresh session list
      loadOverviewData(); // Refresh overview stats
    } else {
      const err = await response.json();
      showStatus('fast-entry-status', 'Error: ' + (err.error || 'Unknown error'), 'error');
    }
  } catch (e) {
    showStatus('fast-entry-status', 'Network error: ' + e.message, 'error');
  }
}

function parseFastEntry(content) {
  const result = {
    topic: '',
    study_mode: 'Core',
    time_spent_minutes: 30,
    understanding_level: 3,
    retention_confidence: 3,
    system_performance: 3,
    what_worked: '',
    what_needs_fixing: '',
    notes_insights: ''
  };

  // Try to parse as JSON first (preferred format)
  try {
    // Extract JSON from markdown code blocks if present
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON object
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Map JSON fields to result
    result.topic = parsed.topic || '';
    result.study_mode = parsed.mode || 'Core';
    result.time_spent_minutes = parseInt(parsed.duration) || 30;
    result.understanding_level = parseInt(parsed.understanding) || 3;
    result.retention_confidence = parseInt(parsed.retention) || 3;
    result.system_performance = parseInt(parsed.system_performance) || 3;
    result.what_worked = parsed.what_worked || '';
    result.what_needs_fixing = parsed.what_needs_fixing || parsed.gaps || '';
    result.notes_insights = parsed.notes || '';

    // Handle anchors - append to notes if present
    if (parsed.anchors) {
      result.notes_insights = result.notes_insights
        ? result.notes_insights + '\n\nAnchors: ' + parsed.anchors
        : 'Anchors: ' + parsed.anchors;
    }

    return result;
  } catch (e) {
    // JSON parse failed, fall back to text parsing
    console.log('JSON parse failed, trying text format:', e.message);
  }

  // Fallback: Parse as structured text format
  const lines = content.split('\n');
  let currentSection = null;
  let sectionContent = [];
  let unstructuredLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '---' || trimmed.startsWith('```')) continue;

    // Check for key: value pairs
    const kvMatch = trimmed.match(/^(Date|Topic|Subject|Mode|Duration|Time|Understanding|Retention|System Performance|What Worked|What Needs Fixing|Gaps|Anchors Locked|Anchors|Notes|Session):?\s*(.*)$/i);
    if (kvMatch) {
      // Save previous section if any
      if (currentSection && sectionContent.length > 0) {
        const text = sectionContent.join('\n').trim();
        if (currentSection === 'what_worked') result.what_worked = text;
        else if (currentSection === 'what_needs_fixing') result.what_needs_fixing = text;
        else if (currentSection === 'notes') result.notes_insights = text;
        sectionContent = [];
      }

      const key = kvMatch[1].toLowerCase();
      const val = kvMatch[2].trim();

      if (key === 'topic' || key === 'subject' || key === 'session') result.topic = val;
      else if (key === 'mode') result.study_mode = val.includes('Sprint') ? 'Sprint' : val.includes('Drill') ? 'Drill' : 'Core';
      else if (key === 'duration' || key === 'time') result.time_spent_minutes = parseInt(val) || 30;
      else if (key === 'understanding') result.understanding_level = parseInt(val) || 3;
      else if (key === 'retention') result.retention_confidence = parseInt(val) || 3;
      else if (key === 'system performance') result.system_performance = parseInt(val) || 3;
      else if (key === 'what worked') { currentSection = 'what_worked'; if (val) sectionContent.push(val); }
      else if (key === 'what needs fixing' || key === 'gaps') { currentSection = 'what_needs_fixing'; if (val) sectionContent.push(val); }
      else if (key === 'notes' || key === 'anchors locked' || key === 'anchors') { currentSection = 'notes'; if (val) sectionContent.push(val); }
    } else if (currentSection && trimmed) {
      sectionContent.push(trimmed);
    } else if (trimmed) {
      unstructuredLines.push(trimmed);
    }
  }

  // Capture final section
  if (currentSection && sectionContent.length > 0) {
    const text = sectionContent.join('\n').trim();
    if (currentSection === 'what_worked') result.what_worked = text;
    else if (currentSection === 'what_needs_fixing') result.what_needs_fixing = text;
    else if (currentSection === 'notes') result.notes_insights = text;
  }
  // Fallback for unstructured content: use first line as topic, rest as notes
  if (!result.topic && unstructuredLines.length > 0) {
    // Try to find a meaningful first line (skip bullets)
    let topicLine = unstructuredLines[0];
    for (const line of unstructuredLines) {
      if (!line.startsWith('*') && !line.startsWith('-') && line.length > 5) {
        topicLine = line;
        break;
      }
    }
    // Clean up the topic line
    result.topic = topicLine.replace(/^[\*\-\#\s]+/, '').substring(0, 100);
    // Put all content as notes
    result.notes_insights = unstructuredLines.join('\n');
  }

  return result;
}

// Show prompt when dropdown changes
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('fast-entry-prompt-select');
  if (select) {
    select.addEventListener('change', () => {
      const displayDiv = document.getElementById('fast-entry-prompt-display');
      const promptText = document.getElementById('fast-entry-prompt-text');
      const promptKey = select.value;

      if (promptKey && FAST_ENTRY_PROMPTS[promptKey]) {
        promptText.textContent = FAST_ENTRY_PROMPTS[promptKey];
        displayDiv.style.display = 'block';
      } else {
        displayDiv.style.display = 'none';
      }
    });
  }
});

function openTab(evt, tabName) {
  if (evt && typeof evt.preventDefault === 'function') {
    // Prevent hash navigation/auto-open behavior on tab links.
    evt.preventDefault();
  }
  // 0. Check if switching AWAY from Scholar before hiding panels
  const currentActivePanel = document.querySelector('.tab-panel.active');
  const wasScholarActive = currentActivePanel && currentActivePanel.id === 'tab-scholar';
  if (wasScholarActive && tabName !== 'scholar') {
    // Clear polling interval when leaving Scholar (but keep sessionStorage)
    if (typeof runStatusInterval !== 'undefined' && runStatusInterval) {
      clearInterval(runStatusInterval);
      runStatusInterval = null;
    }
  }

  // 1. Hide all panels
  const panels = document.getElementsByClassName("tab-panel");
  for (let i = 0; i < panels.length; i++) {
    panels[i].style.display = "none";
    panels[i].classList.remove("active");
  }

  // 2. Deactivate all tab controls (top nav, mobile, legacy, arcade, and any tab buttons)
  document.querySelectorAll('.tab-button, .top-nav-item, .mobile-nav-item, .nav-item, .arcade-nav-btn')
    .forEach(item => item.classList.remove('active'));

  // 3. Show specific panel
  const panel = document.getElementById("tab-" + tabName);
  if (panel) {
    panel.style.display = "block";
    panel.classList.add("active");
  }

  // 4. Activate specific button
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add("active");
  } else {
    // Fallback: find any nav item by data-tab
    document.querySelectorAll('[data-tab]')
      .forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
          item.classList.add('active');
        }
      });
  }

  // Update aria-current for top nav accessibility
  document.querySelectorAll('.top-nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  // 5. Update Hash
  // window.location.hash = tabName; // Optional, maybe skip to avoid jumping

  // 6. Lazy Load
  if (tabName === 'syllabus' && typeof loadSyllabusDashboard === 'function') loadSyllabusDashboard();
  if (tabName === 'scholar' && typeof loadScholar === 'function') {
    loadScholar();
    // Restore polling if there's an active run in sessionStorage
    const storedRunId = restoreScholarRunId();
    if (storedRunId && !runStatusInterval) {
      currentRunId = storedRunId;
      runStatusInterval = setInterval(() => checkRunStatus(currentRunId), 2000);
      checkRunStatus(currentRunId);
    }
  }
  if (tabName === 'tutor' && typeof loadTutor === 'function') loadTutor();
  if (tabName === 'brain' && typeof loadBrain === 'function') loadBrain();
  if (tabName === 'sync' && typeof loadSyncPending === 'function') loadSyncPending();

  // 7. Force all sections collapsed on tab switch, then scroll to top
  const currentTab = document.getElementById('tab-' + tabName);
  if (currentTab) {
    currentTab.querySelectorAll('details.section-panel').forEach(d => d.removeAttribute('open'));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Global State
let allCourses = [];
let currentCalendarDate = new Date();
let calendarData = { events: [], sessions: [], planned: [] };
let syllabusEvents = [];
let syllabusViewMode = 'calendar';

// Week Selector State (for Syllabus List view)
const SEMESTER_START = new Date('2026-01-05'); // Week 1 starts here (Spring 2026)
let listStartWeek = 1;
let listWeekCount = 3; // number or 'all'
let currentScholarQuestions = [];
let currentScholarAnsweredQuestions = [];
let answeredQuestionsExpanded = false;
let modeChartInstance = null; // Global chart instance for updates

// DOM Elements
const totalSessions = document.getElementById('total-sessions');
const sessionsSubtitle = document.getElementById('sessions-subtitle');
const totalTime = document.getElementById('total-time');
const timeSubtitle = document.getElementById('time-subtitle');
const avgScore = document.getElementById('avg-score');
const progressCircle = document.getElementById('progress-circle');
const avgU = document.getElementById('avg-u');
const avgR = document.getElementById('avg-r');
const avgS = document.getElementById('avg-s');
const ankiCards = document.getElementById('anki-cards');
const sessionsTbody = document.getElementById('sessions-tbody');
const modeLegend = document.getElementById('mode-legend');
const frameworksList = document.getElementById('frameworks-list');
const weakTopics = document.getElementById('weak-topics');
const strongTopics = document.getElementById('strong-topics');
const whatWorked = document.getElementById('what-worked');
const issuesList = document.getElementById('issues-list');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const resumeBox = document.getElementById('resume-box');
const btnResume = document.getElementById('btn-resume');
const tutorQuestion = document.getElementById('tutor-question');
const tutorAnswerBox = document.getElementById('tutor-answer-box');
const btnTutorSend = document.getElementById('btn-tutor-send');
const tutorModeSelect = document.getElementById('tutor-mode-select');
const btnTutorNewSession = document.getElementById('btn-tutor-new-session');

const tutorKindNote = document.getElementById('tutor-kind-note');
const tutorKindTextbook = document.getElementById('tutor-kind-textbook');
const tutorKindTranscript = document.getElementById('tutor-kind-transcript');
const tutorKindSlide = document.getElementById('tutor-kind-slide');
const tutorKindOther = document.getElementById('tutor-kind-other');
const tutorKindPowerpoint = document.getElementById('tutor-kind-powerpoint');
const tutorKindPdf = document.getElementById('tutor-kind-pdf');
const tutorKindTxt = document.getElementById('tutor-kind-txt');
const tutorKindMp4 = document.getElementById('tutor-kind-mp4');
const tutorKindYoutube = document.getElementById('tutor-kind-youtube');

const tutorProjectFile = document.getElementById('tutor-project-file');
const tutorProjectDocType = document.getElementById('tutor-project-doc-type');
const tutorProjectTags = document.getElementById('tutor-project-tags');
const btnTutorUpload = document.getElementById('btn-tutor-upload');
const btnTutorAddLink = document.getElementById('btn-tutor-add-link');
const tutorUploadStatusBox = document.getElementById('tutor-upload-status');
const btnTutorRefreshDocs = document.getElementById('btn-tutor-refresh-docs');
const tutorDocSearch = document.getElementById('tutor-doc-search');
const tutorDocTypeFilter = document.getElementById('tutor-doc-type-filter');
const tutorDocsList = document.getElementById('tutor-docs-list');
const tutorCitationsBox = document.getElementById('tutor-citations');
const tutorLinkUrl = document.getElementById('tutor-link-url');
const tutorLinkDocType = document.getElementById('tutor-link-doc-type');

const btnTutorStudySync = document.getElementById('btn-tutor-study-sync');
const btnTutorStudyRefresh = document.getElementById('btn-tutor-study-refresh');
const tutorStudyStatusBox = document.getElementById('tutor-study-status');
const tutorStudyFoldersBox = document.getElementById('tutor-study-folders');

const btnTutorRuntimeRefresh = document.getElementById('btn-tutor-runtime-refresh');
const tutorRuntimeItemsBox = document.getElementById('tutor-runtime-items');
const syllabusForm = document.getElementById('syllabus-form');
const syllabusStatus = document.getElementById('syllabus-status');
const syllabusJsonInput = document.getElementById('syllabus_json_input');
const syllabusJsonStatus = document.getElementById('syllabus-json-status');
const btnSyllabusJsonImport = document.getElementById('btn-syllabus-json-import');
const btnSyllabusPromptCopy = document.getElementById('btn-syllabus-prompt-copy');
const syllabusPromptTemplate = document.getElementById('syllabus_prompt_template');
const btnViewCalendar = document.getElementById('btn-view-calendar');
const btnViewList = document.getElementById('btn-view-list');
const syllabusListCourse = document.getElementById('syllabus-list-course');
const syllabusListType = document.getElementById('syllabus-list-type');
const syllabusListSearch = document.getElementById('syllabus-list-search');
const syllabusListBody = document.getElementById('syllabus-list-body');
const syllabusListEmpty = document.getElementById('syllabus-list-empty');
const btnRefreshSyllabusList = document.getElementById('btn-refresh-syllabus-list');
const btnListCollapse = document.getElementById('btn-list-collapse');
const btnListExpand = document.getElementById('btn-list-expand');
const courseSortMode = document.getElementById('course-sort-mode');
const courseDedupToggle = document.getElementById('course-dedup-toggle');

// Helpers
const formatMinutes = (m) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

const formatNumber = (n) => {
  return n.toLocaleString();
};

const getModeClass = (mode) => {
  const m = (mode || '').toLowerCase();
  // Map study modes to badge color classes
  if (m.includes('core') || m.includes('focus') || m.includes('deep')) return 'badge-core';
  if (m.includes('sprint') || m.includes('pomodoro')) return 'badge-sprint';
  if (m.includes('drill') || m.includes('review')) return 'badge-drill';
  return 'badge-neutral';
};

// Load and render stats
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    renderStats(data);
    renderSessions(data);
    renderPatterns(data);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load and render Scholar insights on Overview tab
async function loadScholarInsights() {
  try {
    const res = await fetch('/api/scholar/insights');
    const data = await res.json();
    renderScholarInsights(data);
  } catch (error) {
    console.error('Failed to load Scholar insights:', error);
  }
}

// Load all data needed for the Overview tab
function loadOverviewData() {
  loadStats();
  loadScholarInsights();
}

function renderScholarInsights(data) {
  const card = document.getElementById('scholar-insights-card');
  const alertsList = document.getElementById('scholar-alerts-list');
  const proposalsCount = document.getElementById('scholar-proposals-count');
  const questionsCount = document.getElementById('scholar-questions-count');
  const findingsList = document.getElementById('scholar-findings-list');

  if (!card) return;

  // Check if there's any content to show
  const hasAlerts = data.alerts && data.alerts.length > 0;
  const hasProposals = data.proposals && data.proposals.length > 0;
  const hasQuestions = data.questions_pending && data.questions_pending > 0;
  const hasFindings = data.recent_findings && data.recent_findings.length > 0;

  const hasContent = hasAlerts || hasProposals || hasQuestions || hasFindings;

  // Show/hide the card based on content
  card.style.display = hasContent ? 'block' : 'none';

  if (!hasContent) return;

  // Render alerts
  if (alertsList) {
    if (hasAlerts) {
      alertsList.innerHTML = data.alerts.map(a => {
        const icon = a.type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>️' : 'ℹ️';
        const color = a.type === 'warning' ? '#f59e0b' : '#3b82f6';
        return `<div style="display:flex; align-items:start; gap:8px; margin-bottom:8px; cursor:pointer;" onclick="openTab(null, 'scholar')">
          <span style="color:${color};">${icon}</span>
          <span style="color:#e2e8f0;">${a.message}</span>
        </div>`;
      }).join('');
    } else {
      alertsList.innerHTML = '<div style="color:#64748b;">No alerts</div>';
    }
  }

  // Render proposals count
  if (proposalsCount) {
    const count = data.proposals ? data.proposals.length : 0;
    if (count > 0) {
      proposalsCount.innerHTML = `<span style="color:#a855f7; font-weight:600;">${count} proposal${count !== 1 ? 's' : ''}</span>
        <span style="color:#64748b; font-size:0.8rem;"> awaiting review</span>`;
    } else {
      proposalsCount.innerHTML = '<span style="color:#64748b;">0 proposals</span>';
    }
  }

  // Render questions count
  if (questionsCount) {
    const count = data.questions_pending || 0;
    if (count > 0) {
      questionsCount.innerHTML = `<span style="color:#ef4444; font-weight:600;">${count} question${count !== 1 ? 's' : ''}</span>
        <span style="color:#64748b; font-size:0.8rem;"> need answers</span>`;
    } else {
      questionsCount.innerHTML = '<span style="color:#64748b;">0 questions</span>';
    }
  }

  // Render recent findings
  if (findingsList) {
    if (hasFindings) {
      findingsList.innerHTML = data.recent_findings.slice(0, 3).map(f => {
        // Truncate long findings
        const text = f.length > 80 ? f.substring(0, 77) + '...' : f;
        return `<li style="margin-bottom:6px; color:#94a3b8;">• ${text}</li>`;
      }).join('');
    } else {
      findingsList.innerHTML = '<li style="color:#64748b;">No recent findings</li>';
    }
  }
}

function renderStats(data) {
  // Total Sessions
  if (totalSessions) totalSessions.textContent = formatNumber(data.counts.sessions);
  if (sessionsSubtitle) sessionsSubtitle.textContent = `${data.counts.sessions_30d} in last 30 days`;

  // Total Time
  if (totalTime) totalTime.textContent = formatMinutes(data.counts.total_minutes);
  if (timeSubtitle) timeSubtitle.textContent = `Avg. ${formatMinutes(data.counts.avg_daily_minutes)}/day`;

  // Score with progress ring
  const overallScore = Math.round(data.averages.overall) || 0;
  if (avgScore) avgScore.textContent = `${overallScore}%`;

  // Update progress ring (if present)
  if (progressCircle) {
    const circumference = 2 * Math.PI * 26;
    const offset = circumference - (overallScore / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  // Individual scores (convert 1-5 to percentage) - only if present
  if (avgU) avgU.textContent = `${Math.round(data.averages.understanding * 20)}%`;
  if (avgR) avgR.textContent = `${Math.round(data.averages.retention * 20)}%`;
  if (avgS) avgS.textContent = `${Math.round(data.averages.performance * 20)}%`;

  // Anki cards
  if (ankiCards) ankiCards.textContent = formatNumber(data.counts.anki_cards);
}

function renderSessions(data) {
  if (!sessionsTbody) return; // Guard clause for new simplified HTML

  const sessions = data.recent_sessions || [];
  sessionsTbody.innerHTML = sessions.map(s => {
    const modeClass = getModeClass(s.study_mode);
    const u = s.understanding_level || '-';
    const r = s.retention_confidence || '-';
    const sys = s.system_performance || '-';

    // Build detail content for expandable row
    const whatWorked = s.what_worked || 'Not recorded';
    const whatNeedsFix = s.what_needs_fixing || 'Not recorded';
    const notes = s.notes_insights || 'No notes';
    const frameworks = s.frameworks_used || 'None';

    return `
          <tr data-session-id="${s.id}">
            <td>${s.session_date}<br><span style="font-size: 12px; color: var(--text-muted)">${s.session_time || ''}</span></td>
            <td class="badge-cell"><span class="badge ${modeClass}">${s.study_mode || 'N/A'}</span></td>
            <td>${s.topic}</td>
            <td>${formatMinutes(s.time_spent_minutes)}</td>
            <td>
              <div class="score-display">
                <span class="u">U:${u}</span>
                <span class="r">R:${r}</span>
                <span class="s">S:${sys}</span>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn" onclick="toggleSessionDetails(${s.id})" title="View details">View</button>
                <button class="btn" onclick="openEditModal(${s.id})" title="Edit session">✎</button>
                <button class="btn" onclick="deleteSession(${s.id})" title="Delete session" style="color: var(--error);">✕</button>
              </div>
            </td>
          </tr>
          <tr id="session-detail-${s.id}" class="session-detail-row hidden">
            <td colspan="6">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 8px 0;">
                <div>
                  <strong style="color: var(--text-muted); font-size: 12px;">What Worked</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">${whatWorked}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 12px;">What Needs Fixing</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">${whatNeedsFix}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 12px;">Notes & Insights</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">${notes}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 12px;">Frameworks Used</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">${frameworks}</p>
                </div>
              </div>
            </td>
          </tr>
        `;
  }).join('');
}

// ============================================
// SESSION CRUD FUNCTIONS
// ============================================

async function deleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) return;
  try {
    const resp = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    const data = await resp.json();
    if (data.ok) {
      // Refresh both stats and session list
      loadStats();
      loadOverviewData();
      // Also remove the row directly for immediate feedback
      const row = document.querySelector(`tr[data-session-id="${sessionId}"]`);
      if (row) row.remove();
    } else {
      alert('Error: ' + (data.message || data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error deleting session: ' + err.message);
  }
}

// Open the edit modal and populate with session data
async function openEditModal(sessionId) {
  try {
    const resp = await fetch(`/api/sessions/${sessionId}`);
    const data = await resp.json();
    if (!data.ok) {
      alert('Error loading session: ' + (data.error || 'Unknown error'));
      return;
    }
    const s = data.session;

    // Populate form fields
    document.getElementById('edit-session-id').value = s.id;
    document.getElementById('edit-date').value = s.session_date || '';
    document.getElementById('edit-start-time').value = s.session_time || '';
    document.getElementById('edit-topic').value = s.main_topic || s.topic || '';
    document.getElementById('edit-study-mode').value = s.study_mode || 'Core';
    document.getElementById('edit-duration').value = s.time_spent_minutes || s.duration_minutes || '';
    document.getElementById('edit-understanding').value = s.understanding_level || '';
    document.getElementById('edit-retention').value = s.retention_confidence || '';
    document.getElementById('edit-system-performance').value = s.system_performance || '';
    document.getElementById('edit-goal').value = s.plan_of_attack || '';
    document.getElementById('edit-summary').value = s.notes_insights || '';
    document.getElementById('edit-wins').value = s.what_worked || '';
    document.getElementById('edit-friction').value = s.what_needs_fixing || '';

    // Show modal
    document.getElementById('edit-session-modal').style.display = 'flex';
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Save session edits
async function saveSession(event) {
  event.preventDefault();

  const sessionId = document.getElementById('edit-session-id').value;
  const data = {
    session_date: document.getElementById('edit-date').value,
    session_time: document.getElementById('edit-start-time').value,
    topic: document.getElementById('edit-topic').value,
    study_mode: document.getElementById('edit-study-mode').value,
    time_spent_minutes: parseInt(document.getElementById('edit-duration').value) || 0,
    understanding_level: parseInt(document.getElementById('edit-understanding').value) || null,
    retention_confidence: parseInt(document.getElementById('edit-retention').value) || null,
    system_performance: parseInt(document.getElementById('edit-system-performance').value) || null,
    plan_of_attack: document.getElementById('edit-goal').value,
    notes_insights: document.getElementById('edit-summary').value,
    what_worked: document.getElementById('edit-wins').value,
    what_needs_fixing: document.getElementById('edit-friction').value
  };

  try {
    const resp = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await resp.json();
    if (result.ok) {
      closeEditModal();
      loadStats();
      loadOverviewData();
    } else {
      alert('Error saving: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Close the edit modal
function closeEditModal() {
  document.getElementById('edit-session-modal').style.display = 'none';
}

function toggleSessionDetails(sessionId) {
  const detailRow = document.getElementById('session-detail-' + sessionId);
  if (detailRow) {
    detailRow.classList.toggle('hidden');
  }
}

function renderPatterns(data) {
  // Mode frequencies - define colors for each study mode
  const modes = data.mode_percentages || {};
  const modeColors = {
    'Core': '#EF4444',      // Red
    'Sprint': '#64748B',    // Grey
    'Drill': '#10B981',     // Green
    'Focus': '#EF4444',
    'Deep Work': '#EF4444',
    'Pomodoro': '#10B981',
    'Review': '#3b82f6'
  };

  // Update legend with study mode percentages
  if (modeLegend) {
    const entries = Object.entries(modes);
    if (entries.length > 0) {
      modeLegend.innerHTML = entries.map(([mode, pct]) => `
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="width:10px; height:10px; border-radius:50%; background:${modeColors[mode] || '#64748b'};"></span>
          <span>${mode}: ${pct}%</span>
        </div>
      `).join('');
    } else {
      modeLegend.innerHTML = '<div>No data yet</div>';
    }
  }

  // Update the Chart.js doughnut with real data
  if (modeChartInstance && Object.keys(modes).length > 0) {
    const labels = Object.keys(modes);
    const dataValues = Object.values(modes);
    const colors = labels.map(m => modeColors[m] || '#64748b');

    modeChartInstance.data.labels = labels;
    modeChartInstance.data.datasets[0].data = dataValues;
    modeChartInstance.data.datasets[0].backgroundColor = colors;
    modeChartInstance.update();
  }

  // Frameworks (if present)
  const frameworks = data.frameworks || [];
  if (frameworksList) {
    frameworksList.innerHTML = frameworks.map(([name, count]) => `
        <div class="framework-item">${name}</div>
      `).join('') || '<div style="color: var(--text-muted);">No data yet</div>';
  }

  // Weak topics
  const weak = data.weak_areas || [];
  if (weakTopics) weakTopics.textContent = weak.map(w => w.topic).join(', ') || 'None flagged';

  // Strong topics
  const strong = data.strong_areas || [];
  if (strongTopics) strongTopics.textContent = strong.map(s => s.topic).join(', ') || 'None yet';

  // What worked
  const worked = data.what_worked || [];
  if (whatWorked) {
    whatWorked.innerHTML = worked.map(w => `<li>${w.split('\\n')[0]}</li>`).join('')
      || '<li>No notes yet</li>';
  }

  // Issues (if present)
  const issues = data.common_issues || [];
  if (issuesList) {
    issuesList.innerHTML = issues.map(i => `<li>${i.split('\\n')[0]}</li>`).join('')
      || '<li>No issues logged</li>';
  }
}

function drawPieChart(modes, colors) {
  const canvas = document.getElementById('modeChart');
  const ctx = canvas.getContext('2d');
  const centerX = 60;
  const centerY = 60;
  const radius = 50;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const entries = Object.entries(modes);
  if (entries.length === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    return;
  }

  let startAngle = -Math.PI / 2;
  entries.forEach(([mode, pct]) => {
    const sliceAngle = (pct / 100) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[mode] || '#64748b';
    ctx.fill();
    startAngle += sliceAngle;
  });
}

// ============================================
// TRENDS CHART
// ============================================
let trendsChartData = null;

async function loadTrends(days = 30) {
  const canvas = document.getElementById('trends-chart');
  const emptyMsg = document.getElementById('trends-empty');
  const legend = document.getElementById('trends-legend');

  if (!canvas) return;

  try {
    const res = await fetch(`/api/trends?days=${days}`);
    const data = await res.json();

    // Normalize API shape (new fields first, fallback to legacy keys)
    const normalized = {
      dates: data.dates || [],
      understanding: data.avg_understanding_per_day || data.understanding || [],
      retention: data.avg_retention_per_day || data.retention || [],
      sessionsPerDay: data.sessions_per_day || data.session_count || [],
      avgDurationPerDay: data.avg_duration_per_day || data.duration_avg || [],
    };

    trendsChartData = normalized;

    const hasMetricData = (
      (normalized.understanding || []).some(v => v !== null && !isNaN(v)) ||
      (normalized.retention || []).some(v => v !== null && !isNaN(v)) ||
      (normalized.sessionsPerDay || []).some(v => v > 0)
    );
    const hasDates = normalized.dates && normalized.dates.length > 0;

    if (!hasDates || !hasMetricData) {
      canvas.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (legend) legend.style.display = 'none';
      return;
    }

    canvas.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (legend) legend.style.display = 'flex';

    drawTrendsChart(canvas, normalized);
  } catch (error) {
    console.error('Failed to load trends:', error);
  }
}

function drawTrendsChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;

  // Set canvas size for sharp rendering
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const understanding = (data.understanding || []).map(v => v !== null ? v : NaN);
  const retention = (data.retention || []).map(v => v !== null ? v : NaN);
  const sessions = data.sessionsPerDay || data.session_count || [];

  // Filter out null values and find min/max for the line chart
  const allValues = [...understanding, ...retention].filter(v => !isNaN(v));
  if (allValues.length === 0) return;

  const minVal = Math.max(0, Math.floor(Math.min(...allValues) - 0.5));
  const maxVal = Math.min(5, Math.ceil(Math.max(...allValues) + 0.5));
  const valueRange = maxVal - minVal || 1;

  // Draw grid lines and y-axis labels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight * i / gridLines);
    const value = maxVal - (valueRange * i / gridLines);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(value.toFixed(1), padding.left - 8, y);
  }

  // Draw x-axis labels (dates)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const dates = data.dates;
  const labelInterval = Math.ceil(dates.length / 7); // Show ~7 labels max

  dates.forEach((date, i) => {
    if (i % labelInterval === 0 || i === dates.length - 1) {
      const x = padding.left + (chartWidth * i / (dates.length - 1 || 1));
      // Format date as MM/DD
      const parts = date.split('-');
      const label = `${parts[1]}/${parts[2]}`;
      ctx.fillText(label, x, height - padding.bottom + 8);
    }
  });

  // Helper function to draw a line
  function drawLine(values, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    let started = false;

    values.forEach((val, i) => {
      if (isNaN(val)) return;

      const x = padding.left + (chartWidth * i / (values.length - 1 || 1));
      const y = padding.top + chartHeight - ((val - minVal) / valueRange) * chartHeight;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw dots
    values.forEach((val, i) => {
      if (isNaN(val)) return;

      const x = padding.left + (chartWidth * i / (values.length - 1 || 1));
      const y = padding.top + chartHeight - ((val - minVal) / valueRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  // Draw understanding line (purple)
  drawLine(understanding, '#a855f7');

  // Draw retention line (blue)
  drawLine(retention, '#3b82f6');

  // Add tooltip functionality
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find closest data point
    const dataX = (x - padding.left) / chartWidth;
    const index = Math.round(dataX * (dates.length - 1));

    if (index >= 0 && index < dates.length) {
      const u = understanding[index];
      const r = retention[index];
      const count = sessions[index];
      const date = dates[index];

      // Update cursor
      canvas.style.cursor = 'crosshair';

      // Show tooltip (using title for simplicity)
      let tip = `${date}`;
      if (!isNaN(u)) tip += ` | Understanding: ${u}`;
      if (!isNaN(r)) tip += ` | Retention: ${r}`;
      if (typeof count === 'number') tip += ` | Sessions: ${count}`;
      canvas.title = tip;
    }
  };

  canvas.onmouseleave = () => {
    canvas.style.cursor = 'default';
    canvas.title = '';
  };
}

// Set up trends period selector
const trendsPeriodSelect = document.getElementById('trends-period');
if (trendsPeriodSelect) {
  trendsPeriodSelect.addEventListener('change', (e) => {
    loadTrends(parseInt(e.target.value, 10));
  });
}

// Handle window resize for trends chart
let trendsResizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(trendsResizeTimeout);
  trendsResizeTimeout = setTimeout(() => {
    if (trendsChartData && trendsChartData.dates && trendsChartData.dates.length > 0) {
      const canvas = document.getElementById('trends-chart');
      if (canvas) drawTrendsChart(canvas, trendsChartData);
    }
  }, 200);
});

// Upload handling
if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent)';
    dropzone.style.background = 'var(--accent-light)';
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.background = 'var(--bg)';
  });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.background = 'var(--bg)';
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
  });
}
if (fileInput) {
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) uploadFile(e.target.files[0]);
  });
}

async function uploadFile(file) {
  uploadStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Uploading...</div>';
  const form = new FormData();
  form.append('file', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();

    if (data.ok) {
      uploadStatus.innerHTML = `<div class="upload-status success">[OK] ${data.message} (${data.filename})</div>`;
      loadStats();
    } else {
      uploadStatus.innerHTML = `<div class="upload-status error">[ERROR] ${data.message}</div>`;
    }
  } catch (error) {
    uploadStatus.innerHTML = `<div class="upload-status error">[ERROR] Upload failed: ${error.message}</div>`;
  }
}

// Resume handling
if (btnResume && resumeBox) {
  btnResume.addEventListener('click', async () => {
    resumeBox.textContent = 'Generating...';
    try {
      const res = await fetch('/api/resume');
      const txt = await res.text();
      resumeBox.textContent = txt;
    } catch (error) {
      resumeBox.textContent = 'Failed to generate resume: ' + error.message;
    }
  });
}

// Quick session form handling
const quickSessionForm = document.getElementById('quick-session-form');
const quickSessionStatus = document.getElementById('quick-session-status');

if (quickSessionForm) quickSessionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collect form data
  const formData = {
    topic: document.getElementById('topic').value,
    study_mode: document.getElementById('study_mode').value,
    time_spent_minutes: parseInt(document.getElementById('time_spent_minutes').value),
    understanding_level: parseInt(document.getElementById('understanding_level').value),
    retention_confidence: parseInt(document.getElementById('retention_confidence').value) || 3,
    system_performance: parseInt(document.getElementById('system_performance').value) || 3,
    what_worked: document.getElementById('what_worked').value,
    what_needs_fixing: document.getElementById('what_needs_fixing').value,
    notes_insights: document.getElementById('notes_insights').value,
    frameworks_used: "",  // Optional - can be added later if needed
    gated_platter_triggered: "No",  // Default
    wrap_phase_reached: "No",  // Default
    anki_cards_count: 0  // Default
  };

  // Validate required fields
  if (!formData.topic || !formData.time_spent_minutes || !formData.understanding_level) {
    quickSessionStatus.innerHTML = '<div class="upload-status error">Please fill in all required fields (Topic, Time, Understanding).</div>';
    return;
  }

  quickSessionStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Saving session...</div>';

  try {
    const res = await fetch('/api/quick_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await res.json();

    if (result.ok) {
      quickSessionStatus.innerHTML = '<div class="upload-status success">[OK] Session saved successfully!</div>';
      resetQuickForm();
      loadStats(); // Refresh the dashboard
    } else {
      quickSessionStatus.innerHTML = `<div class="upload-status error">[ERROR] ${result.message}</div>`;
    }
  } catch (error) {
    quickSessionStatus.innerHTML = `<div class="upload-status error">[ERROR] Network error: ${error.message}</div>`;
  }
});

function resetQuickForm() {
  quickSessionForm.reset();
  // Set some reasonable defaults
  document.getElementById('study_mode').value = 'Core';
  document.getElementById('retention_confidence').value = '3';
  document.getElementById('system_performance').value = '3';
}

// Tutor tab handling (prototype calling stub API)
let activeTutorSessionId = null;

let tutorDocsCache = [];
let tutorSelectedDocIds = new Set();
let tutorSearchDebounceTimer = null;

function getTutorAllowedKindsFromUI() {
  const kinds = [];
  if (tutorKindNote && tutorKindNote.checked) kinds.push('note');
  if (tutorKindTextbook && tutorKindTextbook.checked) kinds.push('textbook');
  if (tutorKindTranscript && tutorKindTranscript.checked) kinds.push('transcript');
  if (tutorKindSlide && tutorKindSlide.checked) kinds.push('slide');
  if (tutorKindOther && tutorKindOther.checked) kinds.push('other');
  if (tutorKindPowerpoint && tutorKindPowerpoint.checked) kinds.push('powerpoint');
  if (tutorKindPdf && tutorKindPdf.checked) kinds.push('pdf');
  if (tutorKindTxt && tutorKindTxt.checked) kinds.push('txt');
  if (tutorKindMp4 && tutorKindMp4.checked) kinds.push('mp4');
  if (tutorKindYoutube && tutorKindYoutube.checked) kinds.push('youtube');
  if (kinds.length === 0) {
    return ['note', 'textbook', 'transcript', 'slide', 'other', 'powerpoint', 'pdf', 'txt', 'mp4', 'youtube'];
  }
  return kinds;
}

function setTutorUploadStatus(html) {
  if (!tutorUploadStatusBox) return;
  tutorUploadStatusBox.innerHTML = html;
}

function setTutorStudyStatus(html) {
  if (!tutorStudyStatusBox) return;
  tutorStudyStatusBox.innerHTML = html;
}

// Store the current study RAG root path globally
let currentStudyRagRoot = '';

function renderTutorStudyFolders(folders, root) {
  if (!tutorStudyFoldersBox) return;
  currentStudyRagRoot = root || '';

  // Update the path display in the UI
  const pathDisplay = document.getElementById('study-rag-path-display');
  if (pathDisplay && root) {
    pathDisplay.textContent = root.replace(/\\/g, '/');
  }

  if (!folders || folders.length === 0) {
    const pathHint = root ? root.replace(/\\/g, '/') : 'brain/data/study_rag';
    tutorStudyFoldersBox.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">No Study files ingested yet. Drop files into <span style="font-family: monospace;">${pathHint}</span> and click Sync.</div>`;
    return;
  }

  const header = root ? `<div style="color: var(--text-muted); font-size: 12px; margin-bottom: 8px;">Root: <span style="font-family: monospace;">${root.replace(/\\/g, '/')}</span></div>` : '';
  tutorStudyFoldersBox.innerHTML = header + folders.map((f) => {
    const checked = f.enabled ? 'checked' : '';
    const label = f.folder_path ? f.folder_path : '(root)';
    return `
      <label style="display:block; padding: 8px 6px; border-bottom: 1px solid var(--border); cursor: pointer;">
        <input type="checkbox" class="tutor-study-folder-checkbox" data-folder-path="${label === '(root)' ? '' : f.folder_path}" ${checked} style="margin-right: 8px;" />
        <span style="font-weight: 600;">${label}</span>
        <span style="color: var(--text-muted);"> • ${f.doc_count} docs</span>
      </label>
    `;
  }).join('');

  const checkboxes = tutorStudyFoldersBox.querySelectorAll('.tutor-study-folder-checkbox');
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', async (e) => {
      const folderPath = e.target.getAttribute('data-folder-path') || '';
      const enabled = !!e.target.checked;
      await setTutorStudyFolderEnabled(folderPath, enabled);
      await loadTutorStudyFolders();
    });
  });
}

async function loadTutorStudyFolders() {
  if (!tutorStudyFoldersBox) return;
  tutorStudyFoldersBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading Study folders...</div>';
  try {
    const res = await fetch('/api/tutor/study/folders');
    const data = await res.json();
    if (!data.ok) {
      tutorStudyFoldersBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Failed to load Study folders.</div>';
      return;
    }
    renderTutorStudyFolders(data.folders || [], data.root || '');
  } catch (e) {
    tutorStudyFoldersBox.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Failed to load Study folders: ${e.message}</div>`;
  }
}

async function syncTutorStudyFolder() {
  setTutorStudyStatus('<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Syncing Study folder...</div>');
  try {
    const res = await fetch('/api/tutor/study/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (!data.ok) {
      setTutorStudyStatus(`<div class="upload-status error">[ERROR] ${data.message || 'Study sync failed.'}</div>`);
      return;
    }
    const errors = (data.errors || []).length ? `<div style="margin-top:6px; font-size:12px; color: var(--text-muted);">Errors: ${data.errors.length}</div>` : '';
    setTutorStudyStatus(`<div class="upload-status success">[OK] ${data.message}</div>${errors}`);
    await loadTutorStudyFolders();
  } catch (e) {
    setTutorStudyStatus(`<div class="upload-status error">[ERROR] ${e.message}</div>`);
  }
}

async function setTutorStudyFolderEnabled(folderPath, enabled) {
  try {
    await fetch('/api/tutor/study/folders/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_path: folderPath, enabled })
    });
  } catch (e) {
    // Best-effort
  }
}

function renderTutorRuntimeItems(items) {
  if (!tutorRuntimeItemsBox) return;
  if (!items || items.length === 0) {
    tutorRuntimeItemsBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No Runtime items found.</div>';
    return;
  }

  let lastGroup = null;
  tutorRuntimeItemsBox.innerHTML = items.map((it) => {
    const checked = it.enabled ? 'checked' : '';
    const group = it.group || 'Runtime';
    const groupHeader = group !== lastGroup ? `<div style="margin-top:${lastGroup ? '10px' : '0'}; font-size: 12px; font-weight: 700; color: var(--text-muted);">${group}</div>` : '';
    lastGroup = group;
    const desc = it.description ? `<div style="margin-left: 26px; font-size: 12px; color: var(--text-muted);">${it.description}</div>` : '';
    return `
      ${groupHeader}
      <label style="display:block; padding: 6px 0; cursor: pointer;">
        <input type="checkbox" class="tutor-runtime-item-checkbox" data-item-id="${it.id}" ${checked} style="margin-right: 8px;" />
        <span style="font-weight: 600;">${it.key}</span>
        ${desc}
      </label>
    `;
  }).join('');

  const checkboxes = tutorRuntimeItemsBox.querySelectorAll('.tutor-runtime-item-checkbox');
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', async (e) => {
      const id = parseInt(e.target.getAttribute('data-item-id'));
      if (!Number.isFinite(id)) return;
      const enabled = !!e.target.checked;
      await setTutorRuntimeItemEnabled(id, enabled);
    });
  });
}

async function loadTutorRuntimeItems() {
  if (!tutorRuntimeItemsBox) return;
  tutorRuntimeItemsBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading Runtime items...</div>';
  try {
    const res = await fetch('/api/tutor/runtime/items');
    const data = await res.json();
    if (!data.ok) {
      tutorRuntimeItemsBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Failed to load Runtime items.</div>';
      return;
    }
    renderTutorRuntimeItems(data.items || []);
  } catch (e) {
    tutorRuntimeItemsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Failed to load Runtime items: ${e.message}</div>`;
  }
}

async function setTutorRuntimeItemEnabled(id, enabled) {
  try {
    await fetch('/api/tutor/runtime/items/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled })
    });
  } catch (e) {
    // Best-effort
  }
}

function renderTutorCitations(citations, messageId) {
  // If messageId is provided, update citations in that specific message
  if (messageId) {
    const citationsContainer = document.getElementById(`citations-${messageId}`);
    if (citationsContainer) {
      if (!citations || citations.length === 0) {
        citationsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No citations available.</div>';
      } else {
        const lines = citations.map((c) => {
          const header = `[${c.doc_id}] (${c.doc_type}) ${c.source_path}`;
          const snippet = (c.snippet || '').trim();
          return snippet ? `<div style="margin-bottom: 8px;"><strong>${header}</strong><br><span style="color: var(--text-secondary);">${snippet}</span></div>` : `<div style="margin-bottom: 8px;">${header}</div>`;
        });
        citationsContainer.innerHTML = lines.join('');
      }
    }
    return;
  }

  // Legacy: update hidden citations box for backward compatibility
  if (!tutorCitationsBox) return;
  if (!citations || citations.length === 0) {
    tutorCitationsBox.textContent = 'No citations.';
    return;
  }
  const lines = citations.map((c) => {
    const header = `[${c.doc_id}] (${c.doc_type}) ${c.source_path}`;
    const snippet = (c.snippet || '').trim();
    return snippet ? `${header}\n  ${snippet}` : header;
  });
  tutorCitationsBox.textContent = lines.join('\n\n');
}

function renderTutorDocsList(docs) {
  if (!tutorDocsList) return;
  if (!docs || docs.length === 0) {
    tutorDocsList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No RAG docs found.</div>';
    return;
  }

  tutorDocsList.innerHTML = docs.map((d) => {
    const checked = tutorSelectedDocIds.has(d.id) ? 'checked' : '';
    const tags = (d.topic_tags || '').trim();
    const tagText = tags ? ` • ${tags}` : '';
    const path = (d.source_path || '').replace(/\\/g, '/');
    return `
      <label style="display: block; padding: 8px 6px; border-bottom: 1px solid var(--border); cursor: pointer;">
        <input type="checkbox" class="tutor-doc-checkbox" data-doc-id="${d.id}" ${checked} style="margin-right: 8px;" />
        <span style="font-weight: 600;">#${d.id}</span>
        <span style="color: var(--text-muted);">(${d.doc_type})</span>
        <span style="color: var(--text-secondary);">${path}</span>
        <span style="color: var(--text-muted);">${tagText}</span>
      </label>
    `;
  }).join('');

  const checkboxes = tutorDocsList.querySelectorAll('.tutor-doc-checkbox');
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(e.target.getAttribute('data-doc-id'));
      if (!Number.isFinite(id)) return;
      if (e.target.checked) tutorSelectedDocIds.add(id);
      else tutorSelectedDocIds.delete(id);
    });
  });
}

async function loadTutorRagDocs() {
  if (!tutorDocsList) return;
  tutorDocsList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading RAG docs...</div>';

  const search = (tutorDocSearch && tutorDocSearch.value || '').trim();
  const docType = (tutorDocTypeFilter && tutorDocTypeFilter.value || '').trim();
  const params = new URLSearchParams();
  params.set('limit', '200');
  if (search) params.set('search', search);
  if (docType) params.set('doc_type', docType);

  try {
    const res = await fetch(`/api/tutor/rag-docs?${params.toString()}`);
    const data = await res.json();
    if (!data.ok) {
      tutorDocsList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Failed to load RAG docs.</div>';
      return;
    }
    tutorDocsCache = data.docs || [];
    renderTutorDocsList(tutorDocsCache);
  } catch (e) {
    tutorDocsList.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Failed to load RAG docs: ${e.message}</div>`;
  }
}

async function uploadTutorProjectFile() {
  if (!tutorProjectFile || !tutorProjectFile.files || tutorProjectFile.files.length === 0) {
    setTutorUploadStatus('<div class="upload-status error">Choose a file first.</div>');
    return;
  }
  const file = tutorProjectFile.files[0];
  const docType = (tutorProjectDocType && tutorProjectDocType.value) ? tutorProjectDocType.value : 'other';
  const tags = (tutorProjectTags && tutorProjectTags.value || '').trim();

  setTutorUploadStatus('<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Uploading + ingesting...</div>');
  const form = new FormData();
  form.append('file', file);
  form.append('doc_type', docType);
  if (tags) form.append('tags', tags);

  try {
    const res = await fetch('/api/tutor/project-files/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!data.ok) {
      setTutorUploadStatus(`<div class="upload-status error">[ERROR] ${data.message || 'Upload failed.'}</div>`);
      return;
    }
    setTutorUploadStatus(`<div class="upload-status success">[OK] ${data.message}</div>`);
    if (data.doc_id) tutorSelectedDocIds.add(parseInt(data.doc_id));
    await loadTutorRagDocs();
  } catch (e) {
    setTutorUploadStatus(`<div class="upload-status error">[ERROR] ${e.message}</div>`);
  }
}

async function addTutorLink() {
  if (!tutorLinkUrl) return;
  const url = (tutorLinkUrl.value || '').trim();
  if (!url) {
    setTutorUploadStatus('<div class="upload-status error">Enter a URL first.</div>');
    return;
  }
  const docType = (tutorLinkDocType && tutorLinkDocType.value) ? tutorLinkDocType.value : 'youtube';
  const tags = (tutorProjectTags && tutorProjectTags.value || '').trim();

  setTutorUploadStatus('<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Adding link...</div>');
  try {
    const res = await fetch('/api/tutor/links/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, doc_type: docType, tags })
    });
    const data = await res.json();
    if (!data.ok) {
      setTutorUploadStatus(`<div class="upload-status error">[ERROR] ${data.message || 'Add link failed.'}</div>`);
      return;
    }
    setTutorUploadStatus(`<div class="upload-status success">[OK] ${data.message}</div>`);
    if (data.doc_id) tutorSelectedDocIds.add(parseInt(data.doc_id));
    await loadTutorRagDocs();
  } catch (e) {
    setTutorUploadStatus(`<div class="upload-status error">[ERROR] ${e.message}</div>`);
  }
}

function loadTutor() {
  // Idempotent-ish init: only binds listeners once.
  if (loadTutor._initialized) {
    loadStudyRagConfig();
    loadTutorStudyFolders();
    loadTutorRuntimeItems();
    return;
  }
  loadTutor._initialized = true;

  if (btnTutorStudySync) btnTutorStudySync.addEventListener('click', () => syncTutorStudyFolder());
  if (btnTutorStudyRefresh) btnTutorStudyRefresh.addEventListener('click', () => loadTutorStudyFolders());
  if (btnTutorRuntimeRefresh) btnTutorRuntimeRefresh.addEventListener('click', () => loadTutorRuntimeItems());
  if (btnTutorAddLink) btnTutorAddLink.addEventListener('click', () => addTutorLink());

  if (btnTutorNewSession) btnTutorNewSession.addEventListener('click', () => {
    activeTutorSessionId = null;
    clearChatMessages();
    if (tutorAnswerBox) tutorAnswerBox.textContent = 'New session started. Ask a question when ready.';
    renderTutorCitations([]);
  });

  loadStudyRagConfig();
  setupStudyRagPathControls();
  loadTutorStudyFolders();
  loadTutorRuntimeItems();
}

// Fetch and display the Study RAG path configuration
async function loadStudyRagConfig() {
  try {
    const res = await fetch('/api/tutor/study/config');
    const data = await res.json();
    if (data.ok && data.root) {
      currentStudyRagRoot = data.root;
      const pathDisplay = document.getElementById('study-rag-path-display');
      const pathInput = document.getElementById('study-rag-path-input');
      const normalizedPath = data.root.replace(/\\\\/g, '/').replace(/\\/g, '/');

      if (pathDisplay) {
        pathDisplay.textContent = normalizedPath;
        if (!data.exists) {
          pathDisplay.style.color = 'var(--warning)';
          pathDisplay.title = 'Folder does not exist';
        } else {
          pathDisplay.style.color = 'var(--text-primary)';
          pathDisplay.title = '';
        }
      }

      // Also populate the input field
      if (pathInput) {
        pathInput.value = data.root;
      }
    }
  } catch (e) {
    console.error('Failed to load Study RAG config:', e);
  }
}

// Save Study RAG path
async function saveStudyRagPath(newPath) {
  const statusEl = document.getElementById('study-rag-path-status');
  if (statusEl) statusEl.textContent = 'Saving...';

  try {
    const res = await fetch('/api/tutor/study/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath })
    });
    const data = await res.json();

    if (data.ok) {
      if (statusEl) {
        statusEl.textContent = '<i class="fas fa-check"></i> Saved!';
        statusEl.style.color = 'var(--success)';
      }
      // Reload the config to update display
      await loadStudyRagConfig();
      // Refresh folders list
      loadTutorStudyFolders();
    } else {
      if (statusEl) {
        statusEl.textContent = '✗ ' + (data.message || 'Failed to save');
        statusEl.style.color = 'var(--danger)';
      }
    }
  } catch (e) {
    console.error('Failed to save Study RAG path:', e);
    if (statusEl) {
      statusEl.textContent = '✗ Error saving path';
      statusEl.style.color = 'var(--danger)';
    }
  }
}

// Setup Study RAG path controls
function setupStudyRagPathControls() {
  const saveBtn = document.getElementById('btn-save-study-path');
  const pathInput = document.getElementById('study-rag-path-input');
  const folderPicker = document.getElementById('study-rag-folder-picker');

  if (saveBtn && pathInput) {
    saveBtn.addEventListener('click', () => {
      const path = pathInput.value.trim();
      if (path) {
        saveStudyRagPath(path);
      } else {
        const statusEl = document.getElementById('study-rag-path-status');
        if (statusEl) {
          statusEl.textContent = 'Please enter a path';
          statusEl.style.color = 'var(--warning)';
        }
      }
    });
  }

  // Handle folder picker (browser file dialog)
  if (folderPicker && pathInput) {
    folderPicker.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        // Get the common parent folder from selected files
        const firstFile = e.target.files[0];
        // webkitRelativePath gives us the folder structure
        const relativePath = firstFile.webkitRelativePath;
        if (relativePath) {
          // Extract the root folder name
          const rootFolder = relativePath.split('/')[0];
          // Unfortunately, we can't get the full path from the browser for security reasons
          // So we'll show a message and ask user to paste the path
          const statusEl = document.getElementById('study-rag-path-status');
          if (statusEl) {
            statusEl.innerHTML = `Selected folder: <strong>${rootFolder}</strong><br>Please paste the full path above (browsers don't allow reading full paths for security).`;
            statusEl.style.color = 'var(--info)';
          }
        }
      }
    });
  }
}

// ===== Chat UI Helper Functions =====
let tutorMessageCounter = 0;

function getChatContainer() {
  return document.getElementById('tutor-chat-messages');
}

function scrollChatToBottom() {
  const container = getChatContainer();
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function addChatMessage(sender, text, options = {}) {
  const container = getChatContainer();
  if (!container) return null;

  const messageId = `msg-${++tutorMessageCounter}`;
  const isUser = sender === 'user';
  const senderLabel = isUser ? 'You' : 'Tutor';
  const senderColor = isUser ? 'var(--success)' : 'var(--primary)';
  const bubbleBg = isUser ? 'var(--primary)' : 'var(--surface-2)';
  const bubbleColor = isUser ? '#fff' : 'var(--text-primary)';
  const bubbleRadius = isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px';
  const align = isUser ? 'flex-end' : 'flex-start';

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  messageDiv.id = messageId;
  messageDiv.style.cssText = `align-self: ${align}; max-width: 85%;`;

  let citationsHtml = '';
  if (!isUser && options.showCitationsToggle) {
    citationsHtml = `
      <div style="margin-top: 8px;">
        <button type="button" class="btn-citation-toggle" onclick="toggleCitations('${messageId}')" style="
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          cursor: pointer;
          transition: var(--transition);
        ">Show Citations</button>
        <div id="citations-${messageId}" class="citations-content" style="
          display: none;
          margin-top: 8px;
          padding: 10px;
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          max-height: 200px;
          overflow-y: auto;
        ">Loading citations...</div>
      </div>
    `;
  }

  // Handle unverified banner
  let displayText = text;
  let unverifiedBadge = '';
  if (options.unverified) {
    unverifiedBadge = `<span style="
      display: inline-block;
      background: var(--warning);
      color: #000;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 6px;
    ">UNVERIFIED</span><br>`;
  }

  messageDiv.innerHTML = `
    <div class="chat-sender" style="font-size: 11px; font-weight: 600; color: ${senderColor}; margin-bottom: 4px; text-align: ${isUser ? 'right' : 'left'};">${senderLabel}</div>
    <div class="chat-bubble" style="
      background: ${bubbleBg};
      color: ${bubbleColor};
      padding: 12px 16px;
      border-radius: ${bubbleRadius};
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    ">${unverifiedBadge}${escapeHtml(displayText)}</div>
    ${citationsHtml}
  `;

  container.appendChild(messageDiv);
  scrollChatToBottom();

  return messageId;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateChatMessage(messageId, newText) {
  const messageEl = document.getElementById(messageId);
  if (messageEl) {
    const bubble = messageEl.querySelector('.chat-bubble');
    if (bubble) {
      bubble.innerHTML = escapeHtml(newText);
    }
  }
}

function toggleCitations(messageId) {
  const citationsEl = document.getElementById(`citations-${messageId}`);
  const msgEl = document.getElementById(messageId);
  if (citationsEl && msgEl) {
    const btn = msgEl.querySelector('.btn-citation-toggle');
    if (citationsEl.style.display === 'none') {
      citationsEl.style.display = 'block';
      if (btn) btn.textContent = 'Hide Citations';
    } else {
      citationsEl.style.display = 'none';
      if (btn) btn.textContent = 'Show Citations';
    }
  }
}

function clearChatMessages() {
  const container = getChatContainer();
  if (container) {
    container.innerHTML = `
      <div class="chat-message tutor" style="align-self: flex-start; max-width: 85%;">
        <div class="chat-sender" style="font-size: 11px; font-weight: 600; color: var(--primary); margin-bottom: 4px;">Tutor</div>
        <div class="chat-bubble" style="
          background: var(--surface-2);
          color: var(--text-primary);
          padding: 12px 16px;
          border-radius: 16px 16px 16px 4px;
          font-size: 14px;
          line-height: 1.5;
        ">New session started! Ask me anything.</div>
      </div>
    `;
  }
}

if (btnTutorSend && tutorQuestion) {
  // Send tutor question logic - extracted for reuse
  async function sendTutorQuestion() {
    const question = (tutorQuestion.value || '').trim();
    if (!question) {
      return;
    }

    // Add user message to chat
    addChatMessage('user', question);
    tutorQuestion.value = '';

    // Add thinking message
    const thinkingId = addChatMessage('tutor', 'Thinking...', { showCitationsToggle: false });

    try {
      if (!activeTutorSessionId) {
        const startRes = await fetch('/api/tutor/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const startData = await startRes.json();
        if (!startData.ok) {
          updateChatMessage(thinkingId, '[ERROR] Failed to start Tutor session.');
          return;
        }
        activeTutorSessionId = startData.session_id;
      }

      const turnPayload = {
        user_id: 'local',
        session_id: activeTutorSessionId,
        course_id: null,
        topic_id: null,
        mode: (tutorModeSelect && tutorModeSelect.value) ? tutorModeSelect.value : 'Core',
        question,
        plan_snapshot_json: '{}',
        sources: {
          allowed_doc_ids: Array.from(tutorSelectedDocIds.values()),
          allowed_kinds: getTutorAllowedKindsFromUI(),
          disallowed_doc_ids: []
        },
        notes_context_ids: []
      };

      const res = await fetch('/api/tutor/session/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnPayload)
      });
      const data = await res.json();
      if (!data.ok) {
        updateChatMessage(thinkingId, `[ERROR] ${data.message || 'Tutor call failed.'}`);
        return;
      }
      activeTutorSessionId = data.session_id;

      // Remove thinking message and add real response with citations toggle
      const thinkingEl = document.getElementById(thinkingId);
      if (thinkingEl) thinkingEl.remove();

      const responseId = addChatMessage('tutor', data.answer || '', {
        showCitationsToggle: true,
        unverified: data.unverified
      });

      // Render citations into the collapsible section
      renderTutorCitations(data.citations || [], responseId);

      // Also update legacy elements for compatibility
      if (tutorAnswerBox) {
        const unverifiedBanner = data.unverified ? '[UNVERIFIED]\n\n' : '';
        tutorAnswerBox.textContent = unverifiedBanner + (data.answer || '');
      }
      renderTutorCitations(data.citations || []);

    } catch (error) {
      updateChatMessage(thinkingId, `Failed to contact Tutor: ${error.message}`);
    }
  }

  // Send on button click
  btnTutorSend.addEventListener('click', sendTutorQuestion);

  // Send on Enter key (Shift+Enter allows newlines)
  tutorQuestion.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTutorQuestion();
    }
  });
}

// Syllabus intake form handling
if (syllabusForm) syllabusForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (syllabusStatus) {
    syllabusStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Saving...</div>';
  }

  const payload = {
    name: document.getElementById('course_name').value,
    code: document.getElementById('course_code').value,
    term: document.getElementById('course_term').value,
    instructor: document.getElementById('course_instructor').value,
    default_study_mode: document.getElementById('course_mode').value,
    time_budget_per_week_minutes: parseInt(document.getElementById('course_time_budget').value || '0'),
    event_title: document.getElementById('event_title').value,
    event_type: document.getElementById('event_type').value,
    event_date: document.getElementById('event_date').value || null,
    event_due_date: document.getElementById('event_due_date').value || null,
    event_weight: parseFloat(document.getElementById('event_weight').value || '0'),
    event_raw_text: document.getElementById('event_raw_text').value
  };

  if (!payload.name || !payload.event_title) {
    if (syllabusStatus) {
      syllabusStatus.innerHTML = '<div class="upload-status error">Course name and event title are required.</div>';
    }
    return;
  }

  try {
    const res = await fetch('/api/syllabus/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      if (syllabusStatus) {
        syllabusStatus.innerHTML = `<div class="upload-status error">[ERROR] ${data.message || 'Syllabus save failed.'}</div>`;
      }
      return;
    }
    if (syllabusStatus) {
      syllabusStatus.innerHTML = `<div class="upload-status success">[OK] ${data.message}</div>`;
    }
  } catch (error) {
    if (syllabusStatus) {
      syllabusStatus.innerHTML = `<div class="upload-status error">[ERROR] ${error.message}</div>`;
    }
  }
});

// Syllabus JSON import (ChatGPT helper)
if (btnSyllabusJsonImport && syllabusJsonInput && syllabusJsonStatus) btnSyllabusJsonImport.addEventListener('click', async () => {
  const raw = (syllabusJsonInput.value || '').trim();
  if (!raw) {
    syllabusJsonStatus.innerHTML = '<div class="upload-status error">Paste JSON from ChatGPT first.</div>';
    return;
  }
  let jsonData = null;
  try {
    jsonData = JSON.parse(raw);
  } catch (e) {
    syllabusJsonStatus.innerHTML = '<div class="upload-status error">Invalid JSON: ' + e.message + '</div>';
    return;
  }

  syllabusJsonStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Importing...</div>';

  try {
    const res = await fetch('/api/syllabus/import_bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData)
    });
    const data = await res.json();
    if (!data.ok) {
      syllabusJsonStatus.innerHTML = `<div class="upload-status error">[ERROR] ${data.message || 'Bulk syllabus import failed.'}</div>`;
      return;
    }
    syllabusJsonStatus.innerHTML = `<div class="upload-status success">[OK] ${data.message}</div>`;
  } catch (error) {
    syllabusJsonStatus.innerHTML = `<div class="upload-status error">[ERROR] ${error.message}</div>`;
  }
});

// Copy syllabus prompt to clipboard
if (btnSyllabusPromptCopy && syllabusPromptTemplate) btnSyllabusPromptCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(syllabusPromptTemplate.value);
    btnSyllabusPromptCopy.textContent = 'Copied!';
    setTimeout(() => {
      btnSyllabusPromptCopy.textContent = 'Copy Prompt';
    }, 1500);
  } catch (error) {
    alert('Copy failed. Please select and copy the text manually.');
  }
});

// Scholar data loading
async function loadScholar() {
  try {
    const res = await fetch('/api/scholar');
    const data = await res.json();
    renderScholar(data);
    // Also load saved digests
    if (typeof loadSavedDigests === 'function') {
      loadSavedDigests();
    }
  } catch (error) {
    console.error('Failed to load Scholar data:', error);
  }
}

function renderScholar(data) {
  // Status
  document.getElementById('scholar-status').textContent = data.status || 'unknown';
  const safeModeEl = document.getElementById('scholar-safe-mode');
  safeModeEl.textContent = data.safe_mode ? 'True (patch drafts allowed)' : 'False (no patch drafts)';
  safeModeEl.setAttribute('data-safe-mode', data.safe_mode ? 'true' : 'false');
  const multiAgentEl = document.getElementById('scholar-multi-agent');
  if (multiAgentEl) {
    const enabled = !!data.multi_agent_enabled;
    const conc = data.multi_agent_max_concurrency || 4;
    multiAgentEl.textContent = enabled
      ? `True (max ${conc})`
      : 'False (single agent)';
    multiAgentEl.setAttribute('data-multi-agent', enabled ? 'true' : 'false');
  }
  const multiAgentSelect = document.getElementById('scholar-multi-agent-max');
  if (multiAgentSelect) {
    multiAgentSelect.value = String(data.multi_agent_max_concurrency || 4);
  }
  document.getElementById('scholar-last-updated').textContent = data.last_updated || 'Never';

  // Proposals section
  const proposalsContainer = document.getElementById('scholar-proposals-list');
  const proposalsCount = document.getElementById('scholar-proposals-section-count');
  const proposals = data.proposals || [];

  if (proposalsCount) {
    proposalsCount.textContent = `(${proposals.length})`;
  }

  if (proposalsContainer) {
    if (proposals.length === 0) {
      proposalsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No proposals pending review.</div>';
    } else {
      proposalsContainer.innerHTML = proposals.map((p, i) => {
        const typeColor = p.type === 'change' ? '#a855f7' : p.type === 'experiment' ? '#06b6d4' : '#64748b';
        const typeLabel = p.type === 'change' ? '📝 Change' : p.type === 'experiment' ? '🧪 Experiment' : '📋 Other';
        return `
          <div style="padding: 12px; border-bottom: 1px solid var(--border); ${i === proposals.length - 1 ? 'border-bottom: none;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${typeColor}20; color: ${typeColor}; font-weight: 500;">${typeLabel}</span>
                  <span style="font-size: 11px; color: var(--text-muted);">Status: ${p.status || 'draft'}</span>
                </div>
                <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${p.title}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; font-family: monospace;">${p.file}</div>
              </div>
              <button class="btn" style="font-size: 11px; padding: 4px 10px;" onclick="viewProposalFile('${p.file}')">View</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Questions
  const questionsContainer = document.getElementById('scholar-questions');
  const questionsSectionCount = document.getElementById('scholar-questions-section-count');
  const questions = data.questions || [];
  currentScholarQuestions = questions;
  // Update Scholar tab section count
  if (questionsSectionCount) {
    questionsSectionCount.textContent = `(${questions.length})`;
  }
  // Also update overview count
  const overviewQuestionsCount = document.getElementById('scholar-questions-count');
  if (overviewQuestionsCount) {
    if (questions.length > 0) {
      overviewQuestionsCount.innerHTML = `<span style="color:#ef4444; font-weight:600;">${questions.length} question${questions.length !== 1 ? 's' : ''}</span>
        <span style="color:#64748b; font-size:0.8rem;"> need answers</span>`;
    } else {
      overviewQuestionsCount.innerHTML = '<span style="color:#64748b;">0 questions</span>';
    }
  }
  const saveAnswersBtn = document.getElementById('btn-save-answers');

  if (questions.length === 0) {
    questionsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No questions pending.</div>';
    saveAnswersBtn.style.display = 'none';
  } else {
    saveAnswersBtn.style.display = 'inline-block';
    questionsContainer.innerHTML = questions.map((q, i) => `
          <div class="scholar-question-card" style="padding: 16px; margin-bottom: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;">
            <!-- Question -->
            <div style="font-size: 14px; color: var(--text-primary); font-weight: 600; margin-bottom: 12px;">Q${i + 1}: ${q}</div>
            
            <!-- Chat Response Area -->
            <div id="chat-response-${i}" style="max-height: 250px; overflow-y: auto; margin-bottom: 12px; padding: 10px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; gap: 8px; min-height: 60px;">
              <div style="color: var(--text-muted); font-size: 12px;">Ask a question to get an AI response with repo context...</div>
            </div>
            
            <!-- Chat Input -->
            <div style="display: flex; gap: 8px; align-items: flex-end;">
              <textarea 
                id="chat-input-${i}" 
                class="form-textarea" 
                rows="2" 
                placeholder="Ask about this question..."
                style="flex: 1; font-size: 13px; resize: vertical;"
                onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();askScholarQuestion(${i})}"
              ></textarea>
              <button 
                class="btn btn-primary" 
                style="padding: 8px 16px; height: fit-content;"
                onclick="askScholarQuestion(${i})" 
                id="btn-ask-${i}"
              >
                Ask
              </button>
            </div>
            
            <!-- Answer Section with per-question submit -->
            <div id="answer-section-${i}" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">💬 Your Answer:</span>
                <span id="answer-status-${i}" style="font-size: 11px; color: var(--text-muted);"></span>
              </div>
              <div style="display: flex; gap: 8px; align-items: flex-end;">
                <textarea 
                  id="answer-${i}" 
                  class="form-textarea" 
                  rows="2" 
                  placeholder="Type your answer here..."
                  style="flex: 1; font-size: 13px; resize: vertical;"
                  onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();submitSingleAnswer(${i})}"
                ></textarea>
                <button 
                  class="btn btn-success" 
                  style="padding: 8px 12px; height: fit-content; background: var(--success); color: white;"
                  onclick="submitSingleAnswer(${i})" 
                  id="btn-submit-answer-${i}"
                  title="Submit this answer"
                >
                  <i class="fas fa-check"></i> Submit
                </button>
              </div>
            </div>
          </div>
        `).join('');
  }

  // Answered Questions
  const answeredContainer = document.getElementById('scholar-answered-questions');
  const answeredSectionCount = document.getElementById('scholar-answered-section-count');
  const answeredQuestions = data.answered_questions || [];
  currentScholarAnsweredQuestions = answeredQuestions;

  if (answeredSectionCount) {
    answeredSectionCount.textContent = `(${answeredQuestions.length})`;
  }

  if (answeredContainer) {
    if (answeredQuestions.length === 0) {
      answeredContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No answered questions yet.</div>';
    } else {
      answeredContainer.innerHTML = answeredQuestions.map((item, i) => `
        <div style="padding: 12px; margin-bottom: 8px; background: rgba(63, 185, 80, 0.05); border: 1px solid rgba(63, 185, 80, 0.2); border-radius: 8px;">
          <div style="font-size: 13px; color: var(--text-primary); font-weight: 500; margin-bottom: 8px;">
            <span style="color: var(--success);"><i class="fas fa-check"></i></span> ${item.question}
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); padding-left: 16px; border-left: 2px solid var(--success);">
            ${item.answer}
          </div>
        </div>
      `).join('');
    }
  }

  // Coverage
  const coverage = data.coverage || {};
  const completeCount = coverage.complete || 0;
  const progressCount = coverage.in_progress || 0;
  const notStartedCount = coverage.not_started || 0;

  document.getElementById('scholar-coverage-complete').textContent = completeCount;
  document.getElementById('scholar-coverage-progress').textContent = progressCount;
  document.getElementById('scholar-coverage-not-started').textContent = notStartedCount;

  const total = completeCount + progressCount + notStartedCount;
  const pct = total > 0 ? Math.round((completeCount / total) * 100) : 0;
  const progressPct = total > 0 ? Math.round((progressCount / total) * 100) : 0;
  document.getElementById('scholar-coverage-summary').textContent = `${pct}% complete • ${total} modules`;

  // Update progress bar
  const barComplete = document.getElementById('scholar-coverage-bar-complete');
  const barProgress = document.getElementById('scholar-coverage-bar-progress');
  if (barComplete) barComplete.style.width = `${pct}%`;
  if (barProgress) barProgress.style.width = `${progressPct}%`;

  // Coverage list
  const coverageList = document.getElementById('scholar-coverage-list');
  const items = coverage.items || [];
  if (items.length === 0) {
    coverageList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No coverage data available. Run Scholar to scan modules.</div>';
  } else {
    coverageList.innerHTML = items.map(item => {
      let statusColor = 'var(--text-muted)';
      let statusIcon = '○';
      let bgColor = 'transparent';
      const statusLower = (item.status || '').toLowerCase();

      if (statusLower.includes('complete') || statusLower.includes('[x]')) {
        statusColor = 'var(--success)';
        statusIcon = '<i class="fas fa-check"></i>';
        bgColor = 'rgba(63, 185, 80, 0.1)';
      } else if (statusLower.includes('progress') || statusLower.includes('[/]')) {
        statusColor = 'var(--warning)';
        statusIcon = '<i class="fas fa-spinner fa-spin"></i>';
        bgColor = 'rgba(218, 165, 32, 0.1)';
      }
      return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 4px; border-radius: 6px; background: ${bgColor};">
              <span style="color: ${statusColor}; font-size: 16px;">${statusIcon}</span>
              <div style="flex: 1;">
                <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${item.module || ''}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${item.grouping || ''}</div>
              </div>
              <span style="font-size: 10px; color: ${statusColor}; text-transform: uppercase;">${statusLower.includes('complete') ? 'Done' : statusLower.includes('progress') ? 'WIP' : 'Pending'}</span>
            </div>
          `;
    }).join('');
  }

  // Next steps - now structured with action buttons
  const nextStepsContainer = document.getElementById('scholar-next-steps');
  const nextSteps = data.next_steps || [];
  if (nextSteps.length === 0) {
    nextStepsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No next steps defined. Run Scholar to generate tasks.</div>';
  } else {
    nextStepsContainer.innerHTML = nextSteps.map((step, idx) => {
      // Handle both old string format and new object format
      const stepText = typeof step === 'string' ? step : (step.text || '');
      const action = typeof step === 'object' ? step.action : null;
      const actionLabel = typeof step === 'object' ? step.action_label : null;

      let actionBtn = '';
      if (action === 'open_final') {
        actionBtn = '<button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" type="button" onclick="openScholarLatestFinal()">📄 Open Latest Run</button>';
      } else if (action === 'answer_questions') {
        actionBtn = '<button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" type="button" onclick="document.getElementById(\'scholar-questions\').scrollIntoView({behavior:\'smooth\', block:\'start\'})">❓ Answer Questions</button>';
      } else if (action === 'start_run') {
        actionBtn = '<button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" type="button" onclick="startScholarRun()">▶ Start Run</button>';
      } else if (action === 'review_proposals') {
        actionBtn = '<button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" type="button" onclick="document.getElementById(\'scholar-proposals-list\').scrollIntoView({behavior:\'smooth\', block:\'start\'})">📝 Review Proposals</button>';
      } else {
        // Fallback for old string format
        const lower = stepText.toLowerCase();
        if (lower.includes('unattended_final') || lower.includes('open the latest')) {
          actionBtn = '<button class="btn" style="font-size: 11px; padding: 4px 8px;" type="button" onclick="openScholarLatestFinal()">Open</button>';
        } else if (lower.includes('questions_needed') || lower.includes('answer')) {
          actionBtn = '<button class="btn" style="font-size: 11px; padding: 4px 8px;" type="button" onclick="document.getElementById(\'scholar-questions\').scrollIntoView({behavior:\'smooth\', block:\'start\'})">Go</button>';
        }
      }

      // Number badge
      const numBadge = `<span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--primary); color: white; font-size: 12px; font-weight: 600; flex-shrink: 0;">${idx + 1}</span>`;

      return `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--border); display: flex; gap: 12px; align-items: center;">
          ${numBadge}
          <div style="font-size: 13px; color: var(--text-primary); flex: 1;">${stepText.replace(/^\d+\)\s*/, '')}</div>
          ${actionBtn}
        </div>
      `;
    }).join('');
  }

  // Research Topics
  const researchContainer = document.getElementById('scholar-research-topics');
  if (researchContainer) {
    const topics = data.research_topics || [];
    if (topics.length === 0) {
      researchContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No recent research. Run Scholar to discover topics.</div>';
    } else {
      researchContainer.innerHTML = topics.map(t => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border);">
          <span style="font-size: 12px;">📖 ${t.name}</span>
          <span style="font-size: 10px; color: var(--text-muted);">${t.days_ago}d ago</span>
        </div>
      `).join('');
    }
  }

  // Identified Gaps
  const gapsContainer = document.getElementById('scholar-gaps');
  if (gapsContainer) {
    const gaps = data.gaps || [];
    if (gaps.length === 0) {
      gapsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No gaps identified. System looks healthy! 🎉</div>';
    } else {
      gapsContainer.innerHTML = gaps.map(g => `
        <div style="padding: 4px 0; border-bottom: 1px solid var(--border);">
          <span style="font-size: 12px; color: var(--warning);">• ${g.text}</span>
        </div>
      `).join('');
    }
  }

  // Improvement Candidates
  const improvementsContainer = document.getElementById('scholar-improvements');
  if (improvementsContainer) {
    const improvements = data.improvements || [];
    if (improvements.length === 0) {
      improvementsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No improvement candidates. Run Scholar to analyze modules.</div>';
    } else {
      improvementsContainer.innerHTML = improvements.map(imp => `
        <div style="display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--border);">
          <span style="font-size: 10px; padding: 2px 6px; background: rgba(136, 46, 224, 0.15); color: #a855f7; border-radius: 4px;">${imp.module}</span>
          <span style="font-size: 12px; flex: 1;">${imp.text}</span>
        </div>
      `).join('');
    }
  }

  // Latest run
  const latestRunContainer = document.getElementById('scholar-latest-run');
  if (data.latest_run && data.latest_run.content) {
    latestRunContainer.textContent = data.latest_run.content;
  } else {
    latestRunContainer.textContent = 'No recent run data available.';
  }
}

// Scholar run handling
let currentRunId = null;
let runStatusInterval = null;
let lastRunLogSize = null;
let lastRunLogChangeAt = null;

const SCHOLAR_RUN_STORAGE_KEY = 'scholar_active_run_id';

function saveScholarRunId(runId) {
  if (runId) {
    sessionStorage.setItem(SCHOLAR_RUN_STORAGE_KEY, runId);
  } else {
    sessionStorage.removeItem(SCHOLAR_RUN_STORAGE_KEY);
  }
}

function restoreScholarRunId() {
  return sessionStorage.getItem(SCHOLAR_RUN_STORAGE_KEY);
}

function clearScholarRunState() {
  currentRunId = null;
  sessionStorage.removeItem(SCHOLAR_RUN_STORAGE_KEY);
  if (runStatusInterval) {
    clearInterval(runStatusInterval);
    runStatusInterval = null;
  }
}

const btnRunScholar = document.getElementById('btn-run-scholar');
const scholarRunStatus = document.getElementById('scholar-run-status');
const scholarRunLog = document.getElementById('scholar-run-log');
const scholarRunProgress = document.getElementById('scholar-run-progress');
const scholarRunMeta = document.getElementById('scholar-run-meta');
const scholarRunActions = document.getElementById('scholar-run-actions');
const btnScholarRefresh = document.getElementById('btn-scholar-refresh');
const btnScholarOpenFinal = document.getElementById('btn-scholar-open-final');
const btnScholarCancel = document.getElementById('btn-scholar-cancel');

function _fmtSeconds(secs) {
  if (secs == null || Number.isNaN(secs)) return 'unknown';
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function _setRunUiActive(isActive) {
  if (scholarRunProgress) scholarRunProgress.style.display = isActive ? 'block' : 'none';
  if (scholarRunMeta) scholarRunMeta.style.display = isActive ? 'block' : 'none';
  if (scholarRunActions) scholarRunActions.style.display = isActive ? 'flex' : 'none';
}

async function openScholarLatestFinal() {
  if (!scholarRunLog) return;
  scholarRunLog.style.display = 'block';
  scholarRunLog.textContent = 'Loading latest final...';
  try {
    const res = await fetch('/api/scholar/run/latest-final');
    const data = await res.json();
    if (!data.ok) {
      scholarRunLog.textContent = `No latest final available: ${data.message || 'unknown error'}`;
      return;
    }
    scholarRunLog.textContent = `FILE: ${data.file}\nMODIFIED: ${data.modified}\n\n${data.content}`;
  } catch (e) {
    scholarRunLog.textContent = `Failed to load latest final: ${e.message}`;
  }
}

async function cancelScholarRun() {
  if (!currentRunId) {
    alert('No active run_id to cancel.');
    return;
  }
  if (!confirm('Cancel this Scholar run?')) return;
  try {
    const res = await fetch(`/api/scholar/run/cancel/${currentRunId}`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      const msg = (data.message || '').toLowerCase();
      const alreadyStopped = msg.includes('no pid file') || msg.includes('already');
      scholarRunStatus.innerHTML = alreadyStopped
        ? `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Run not running (nothing to cancel)</span>`
        : `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Cancel requested</span>`;
      scholarRunLog.style.display = 'block';
      scholarRunLog.textContent = (scholarRunLog.textContent || '') + `\n\n[dashboard] ${data.message}`;
      setTimeout(() => checkRunStatus(currentRunId), 1000);
    } else {
      alert(data.message || 'Cancel failed');
    }
  } catch (e) {
    alert(`Cancel failed: ${e.message}`);
  }
}

if (btnScholarRefresh) btnScholarRefresh.addEventListener('click', async () => {
  if (currentRunId) await checkRunStatus(currentRunId);
  await loadScholar();
});
if (btnScholarOpenFinal) btnScholarOpenFinal.addEventListener('click', openScholarLatestFinal);
if (btnScholarCancel) btnScholarCancel.addEventListener('click', cancelScholarRun);

if (btnRunScholar && scholarRunStatus && scholarRunLog) btnRunScholar.addEventListener('click', async () => {
  // Check for unanswered questions first
  const questions = document.querySelectorAll('#scholar-questions textarea[id^="answer-"]');
  const unansweredCount = Array.from(questions).filter(ta => !ta.value.trim()).length;
  const totalQuestions = questions.length;

  if (totalQuestions > 0 && unansweredCount > 0) {
    if (!confirm(`${unansweredCount} question(s) unanswered. Start run anyway? (You can answer questions after the run starts)`)) {
      return;
    }
  }

  btnRunScholar.disabled = true;
  btnRunScholar.textContent = 'Starting...';
  scholarRunStatus.textContent = 'Starting Scholar run...';
  scholarRunLog.style.display = 'block';
  scholarRunLog.textContent = 'Initializing...';
  _setRunUiActive(true);
  if (scholarRunMeta) scholarRunMeta.textContent = '';
  lastRunLogSize = null;
  lastRunLogChangeAt = Date.now();

  try {
    const res = await fetch('/api/scholar/run', { method: 'POST' });
    const data = await res.json();

    if (data.ok) {
      currentRunId = data.run_id;
      saveScholarRunId(data.run_id);
      const methodNote = data.method === 'batch_script' ? ' (via batch script)' : '';
      let preservedNote = '';
      if (data.preserved_questions > 0) {
        preservedNote = `\n<i class="fas fa-check"></i> Preserved ${data.preserved_questions} unanswered question(s) from previous run`;
      }

      if (data.requires_manual_execution) {
        // Scholar requires manual execution via Cursor
        scholarRunStatus.innerHTML = `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Manual execution required (ID: ${data.run_id})${preservedNote}</span>`;
        let instructionsMsg = `Scholar run queued. Manual execution via Cursor required.\n\n`;
        instructionsMsg += `HOW TO EXECUTE:\n`;
        if (data.instructions && data.instructions.steps) {
          instructionsMsg += data.instructions.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
        } else {
          instructionsMsg += `1. Open scholar/workflows/orchestrator_run_prompt.md in Cursor\n`;
          instructionsMsg += `2. Use Cursor AI chat to execute the orchestrator workflow\n`;
          instructionsMsg += `3. Or run: scripts\\run_scholar.bat (option 1)\n`;
        }
        if (data.preserved_questions > 0) {
          instructionsMsg += `\n\nNote: ${data.preserved_questions} unanswered question(s) will be preserved automatically.`;
        }
        instructionsMsg += `\n\nRun ID: ${data.run_id}\nLog: ${data.log_file}`;
        scholarRunLog.textContent = instructionsMsg;

        // Don't poll for status since it's manual execution
        // User will need to refresh dashboard after executing Scholar manually
        btnRunScholar.disabled = false;
        btnRunScholar.textContent = 'Execution Queued (Manual Required)';
        _setRunUiActive(false);

        // Show instructions more prominently
        setTimeout(() => {
          alert(`Scholar run queued!\n\nRun ID: ${data.run_id}\n\nTo execute:\n1. Open scholar/workflows/orchestrator_run_prompt.md in Cursor\n2. Use Cursor AI chat to execute it\n3. Refresh this dashboard after completion`);
        }, 500);
      } else {
        // Normal execution (codex available)
        scholarRunStatus.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> Run started${methodNote} (ID: ${data.run_id})${preservedNote}</span>`;
        btnRunScholar.textContent = 'Running...';
        if (data.warning) {
          scholarRunLog.textContent = `WARNING: ${data.warning}\n\nLog file: ${data.log_file}\nFinal file: ${data.final_file}\n\nWaiting for output...`;
        } else {
          scholarRunLog.textContent = `Log file: ${data.log_file}\nFinal file: ${data.final_file}${preservedNote}\n\nWaiting for output...`;
        }

        // Start polling for status
        if (runStatusInterval) clearInterval(runStatusInterval);
        runStatusInterval = setInterval(() => checkRunStatus(currentRunId), 2000);
        checkRunStatus(currentRunId); // Immediate check

        // Reload questions if any were preserved
        if (data.preserved_questions > 0) {
          setTimeout(() => loadScholar(), 500);
        }
      }
    } else {
      scholarRunStatus.innerHTML = `<span style="color: var(--error);">✗ Error: ${data.message}</span>`;
      let errorMsg = `Error: ${data.message}\n\n`;
      if (data.instructions && data.instructions.length > 0) {
        errorMsg += 'HOW TO RUN SCHOLAR:\n';
        errorMsg += data.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
      } else {
        errorMsg += 'SOLUTION:\n';
        errorMsg += '1. Use Cursor IDE to run Scholar (it has codex built-in)\n';
        errorMsg += '2. Or run manually: scripts\\run_scholar.bat\n';
        errorMsg += '3. Or use Cursor\'s AI chat to execute the orchestrator prompt\n';
      }
      if (data.preserved_questions > 0) {
        errorMsg += `\n\nNote: ${data.preserved_questions} unanswered question(s) were preserved and are still available.`;
      }
      scholarRunLog.textContent = errorMsg;
      btnRunScholar.disabled = false;
      btnRunScholar.textContent = 'Start Run';
      _setRunUiActive(false);
    }
  } catch (error) {
    scholarRunStatus.innerHTML = `<span style="color: var(--error);">✗ Network error: ${error.message}</span>`;
    scholarRunLog.textContent = `Network error: ${error.message}`;
    btnRunScholar.disabled = false;
    btnRunScholar.textContent = 'Start Run';
    _setRunUiActive(false);
  }
});

async function checkRunStatus(runId) {
  try {
    const res = await fetch(`/api/scholar/run/status/${runId}`);
    const status = await res.json();

    _setRunUiActive(true);

    // Meta + stalled detection
    const kb = (status.log_size / 1024).toFixed(1);
    const since = status.seconds_since_log_update;
    const stalled = !!status.stalled;
    if (scholarRunMeta) {
      let meta = `Log: ${kb} KB`;
      if (since != null) meta += ` • Last output: ${_fmtSeconds(since)} ago`;
      if (status.pid) meta += ` • PID: ${status.pid}`;
      if (stalled) meta += ' • <i class="fas fa-exclamation-triangle"></i> No new output (may be stuck)';
      scholarRunMeta.textContent = meta;
    }

    if (typeof status.log_size === 'number') {
      if (lastRunLogSize === null || lastRunLogSize === undefined) {
        lastRunLogSize = status.log_size;
        lastRunLogChangeAt = Date.now();
      } else if (status.log_size !== lastRunLogSize) {
        lastRunLogSize = status.log_size;
        lastRunLogChangeAt = Date.now();
      }
    }

    if (status.log_tail) {
      scholarRunLog.textContent = status.log_tail;
      scholarRunLog.scrollTop = scholarRunLog.scrollHeight;
    }

    if (status.completed) {
      clearScholarRunState();
      btnRunScholar.disabled = false;
      btnRunScholar.textContent = 'Start Run';
      _setRunUiActive(false);

      if (status.final_summary) {
        scholarRunStatus.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> Run completed successfully</span>`;
        scholarRunLog.textContent = 'RUN COMPLETED\n\n' + status.final_summary + '\n\n' + (status.log_tail || '');
      } else {
        scholarRunStatus.innerHTML = `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Run completed (check logs)</span>`;
      }

      // Reload Scholar data and stats
      setTimeout(() => {
        loadScholar();
        loadStats();
      }, 1000);
    } else if (status.running) {
      btnRunScholar.textContent = 'Running...';
      scholarRunStatus.innerHTML = `<span style="color: var(--accent);"><i class="fas fa-spinner fa-spin"></i> Running... (${(status.log_size / 1024).toFixed(1)} KB logged)${status.stalled ? ' • <i class="fas fa-exclamation-triangle"></i> No new output' : ''}</span>`;
    } else {
      // Not running and not completed: likely exited unexpectedly or PID became stale.
      clearScholarRunState();
      btnRunScholar.disabled = false;
      btnRunScholar.textContent = 'Start Run';

      const staleNote = (status.pid_stale || status.pid) ? ' (process not detected — may have stopped)' : '';
      scholarRunStatus.innerHTML = `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Run not running${staleNote}. Use Refresh/Open Final or start a new run.</span>`;
      // Keep actions visible so user can Open Latest Final / Refresh
      _setRunUiActive(true);
    }
  } catch (error) {
    console.error('Failed to check run status:', error);
  }
}

// Safe mode toggle
const btnToggleSafeMode = document.getElementById('btn-toggle-safe-mode');
if (btnToggleSafeMode) btnToggleSafeMode.addEventListener('click', async () => {
  const safeModeEl = document.getElementById('scholar-safe-mode');
  const currentMode = safeModeEl && safeModeEl.getAttribute('data-safe-mode') === 'true';
  const newMode = !currentMode;

  btnToggleSafeMode.disabled = true;
  btnToggleSafeMode.textContent = 'Updating...';

  try {
    const res = await fetch('/api/scholar/safe-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ safe_mode: newMode })
    });

    const data = await res.json();

    if (data.ok) {
      // Reload Scholar data to reflect change
      loadScholar();
      btnToggleSafeMode.textContent = '<i class="fas fa-check"></i> Updated';
      setTimeout(() => {
        btnToggleSafeMode.textContent = 'Toggle';
        btnToggleSafeMode.disabled = false;
      }, 1000);
    } else {
      alert(`Error updating safe mode: ${data.message}`);
      btnToggleSafeMode.disabled = false;
      btnToggleSafeMode.textContent = 'Toggle';
    }
  } catch (error) {
    alert(`Network error: ${error.message}`);
    btnToggleSafeMode.disabled = false;
    btnToggleSafeMode.textContent = 'Toggle';
  }
});

function getMultiAgentEnabled() {
  const multiAgentEl = document.getElementById('scholar-multi-agent');
  return multiAgentEl && multiAgentEl.getAttribute('data-multi-agent') === 'true';
}

function getMultiAgentMax() {
  const select = document.getElementById('scholar-multi-agent-max');
  return select ? parseInt(select.value, 10) : 4;
}

async function updateMultiAgentConfig(payload) {
  const btn = document.getElementById('btn-toggle-multi-agent');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';
  }

  try {
    const res = await fetch('/api/scholar/multi-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.ok) {
      loadScholar();
      if (btn) {
        btn.textContent = '<i class="fas fa-check"></i> Updated';
        setTimeout(() => {
          btn.textContent = 'Toggle';
          btn.disabled = false;
        }, 1000);
      }
    } else {
      alert(`Error updating multi-agent: ${data.message}`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Toggle';
      }
    }
  } catch (error) {
    alert(`Network error: ${error.message}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Toggle';
    }
  }
}

// Multi-agent toggle
const btnToggleMultiAgent = document.getElementById('btn-toggle-multi-agent');
if (btnToggleMultiAgent) btnToggleMultiAgent.addEventListener('click', async () => {
  const current = getMultiAgentEnabled();
  const newMode = !current;
  const maxConcurrency = getMultiAgentMax();
  await updateMultiAgentConfig({ enabled: newMode, max_concurrency: maxConcurrency });
});

// Multi-agent max concurrency select
const multiAgentMaxSelect = document.getElementById('scholar-multi-agent-max');
if (multiAgentMaxSelect) multiAgentMaxSelect.addEventListener('change', async () => {
  const enabled = getMultiAgentEnabled();
  const maxConcurrency = getMultiAgentMax();
  await updateMultiAgentConfig({ enabled: enabled, max_concurrency: maxConcurrency });
});

// Weekly Digest generation
const btnGenerateDigest = document.getElementById('btn-generate-digest');
const scholarDigestStatus = document.getElementById('scholar-digest-status');
const scholarDigestContent = document.getElementById('scholar-digest-content');
const scholarDigestText = document.getElementById('scholar-digest-text');

if (btnGenerateDigest) btnGenerateDigest.addEventListener('click', async () => {
  btnGenerateDigest.disabled = true;
  btnGenerateDigest.textContent = '🧠 Analyzing...';
  btnGenerateDigest.style.background = '#6b21a8';
  if (scholarDigestStatus) scholarDigestStatus.innerHTML = '<span style="color: #a855f7;">🔄 AI is analyzing proposals, gaps, and research data... (this may take up to 90s)</span>';
  if (scholarDigestContent) scholarDigestContent.style.display = 'none';

  try {
    // Use AbortController for timeout (2 minutes for Codex)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const res = await fetch('/api/scholar/digest', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.ok) {
      const aiPowered = data.ai_powered ? '🧠 AI Analysis' : '📊 Summary';
      const contextInfo = data.context_summary || '';
      if (scholarDigestStatus) {
        scholarDigestStatus.innerHTML = `<span style="color: #3fb950;"><i class="fas fa-check"></i></span> ${aiPowered} complete • ${contextInfo}`;
      }
      if (scholarDigestContent && scholarDigestText) {
        // Enhanced markdown to HTML conversion for AI responses
        let html = data.digest
          // Headers with proper styling
          .replace(/^### (.+)$/gm, '<h4 style="margin-top: 14px; margin-bottom: 6px; font-size: 14px; font-weight: 600; color: #a855f7;">$1</h4>')
          .replace(/^## (.+)$/gm, '<h3 style="margin-top: 18px; margin-bottom: 8px; font-size: 15px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border); padding-bottom: 4px;">$1</h3>')
          .replace(/^# (.+)$/gm, '<h2 style="margin-top: 0; margin-bottom: 12px; font-size: 18px; color: var(--text-primary);">$1</h2>')
          // Bold text
          .replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--text-primary);">$1</strong>')
          // Italic text
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          // Numbered lists
          .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left: 8px; margin-bottom: 6px;"><span style="color: #a855f7; font-weight: 600;">$1.</span> $2</div>')
          // Bullet points with nested support
          .replace(/^  - (.+)$/gm, '<div style="padding-left: 28px; margin-bottom: 4px; color: var(--text-secondary);">◦ $1</div>')
          .replace(/^- (.+)$/gm, '<div style="padding-left: 12px; margin-bottom: 4px;">• $1</div>')
          // Code blocks
          .replace(/`([^`]+)`/g, '<code style="background: var(--bg-secondary); padding: 1px 4px; border-radius: 3px; font-size: 12px;">$1</code>')
          // Line breaks
          .replace(/\n\n/g, '<div style="margin-bottom: 12px;"></div>');

        // Add AI indicator badge at top
        if (data.ai_powered) {
          html = '<div style="display: inline-block; background: linear-gradient(135deg, #a855f7, #6366f1); color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 16px;">🧠 AI-POWERED ANALYSIS</div>' + html;
        }

        scholarDigestText.innerHTML = html;
        scholarDigestContent.style.display = 'block';
      }
      btnGenerateDigest.textContent = '🔄 Regenerate';
      btnGenerateDigest.style.background = '#a855f7';
    } else {
      if (scholarDigestStatus) {
        scholarDigestStatus.innerHTML = `<span style="color: #f85149;">✗ Error:</span> ${data.message || 'Unknown error'}`;
      }
      btnGenerateDigest.textContent = 'Generate Analysis';
      btnGenerateDigest.style.background = '#a855f7';
    }
  } catch (error) {
    if (scholarDigestStatus) {
      scholarDigestStatus.innerHTML = `<span style="color: #f85149;">✗ Network error:</span> ${error.message}`;
    }
    btnGenerateDigest.textContent = 'Generate Analysis';
    btnGenerateDigest.style.background = '#a855f7';
  }

  btnGenerateDigest.disabled = false;
});

// Save answers handling
const saveAnswersBtn = document.getElementById('btn-save-answers');

// Submit a single answer by question index
async function submitSingleAnswer(questionIndex) {
  const answerTextarea = document.getElementById(`answer-${questionIndex}`);
  const submitBtn = document.getElementById(`btn-submit-answer-${questionIndex}`);
  const statusSpan = document.getElementById(`answer-status-${questionIndex}`);

  if (!answerTextarea) return;

  const answer = answerTextarea.value.trim();
  if (!answer) {
    if (statusSpan) statusSpan.innerHTML = '<span style="color: var(--warning);">Please enter an answer</span>';
    answerTextarea.focus();
    return;
  }

  // Disable UI
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }
  if (statusSpan) statusSpan.innerHTML = '<span style="color: var(--text-muted);">Saving...</span>';

  try {
    const res = await fetch('/api/scholar/questions/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_index: questionIndex, answer: answer })
    });

    const data = await res.json();

    if (data.ok) {
      if (statusSpan) statusSpan.innerHTML = '<span style="color: var(--success);"><i class="fas fa-check"></i> Saved!</span>';
      if (submitBtn) {
        submitBtn.textContent = '<i class="fas fa-check"></i> Saved';
        submitBtn.style.background = 'var(--success)';
      }
      // Animate and remove the answered question card
      const card = answerTextarea.closest('.scholar-question-card');
      if (card) {
        card.style.transition = 'opacity 0.5s, transform 0.5s';
        card.style.opacity = '0.5';
        card.style.transform = 'scale(0.98)';
      }
      // Reload to reflect updated questions (now shows in Answered section)
      setTimeout(() => {
        loadScholar();
      }, 1000);
    } else {
      if (statusSpan) statusSpan.innerHTML = `<span style="color: var(--error);">✗ ${data.message}</span>`;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '<i class="fas fa-check"></i> Submit';
      }
    }
  } catch (error) {
    if (statusSpan) statusSpan.innerHTML = `<span style="color: var(--error);">✗ Network error</span>`;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '<i class="fas fa-check"></i> Submit';
    }
  }
}
window.submitSingleAnswer = submitSingleAnswer;

// Toggle answered questions section visibility
function toggleAnsweredQuestions() {
  const container = document.getElementById('scholar-answered-questions');
  const chevron = document.getElementById('answered-questions-chevron');

  if (!container) return;

  answeredQuestionsExpanded = !answeredQuestionsExpanded;

  if (answeredQuestionsExpanded) {
    container.style.display = 'block';
    if (chevron) chevron.textContent = '▼';
  } else {
    container.style.display = 'none';
    if (chevron) chevron.textContent = '▶';
  }
}
window.toggleAnsweredQuestions = toggleAnsweredQuestions;

if (saveAnswersBtn) saveAnswersBtn.addEventListener('click', async () => {
  const questionsContainer = document.getElementById('scholar-questions');
  if (!questionsContainer) return;
  const textareas = questionsContainer.querySelectorAll('textarea[id^="answer-"]');
  const answers = Array.from(textareas).map(ta => ta.value.trim());

  if (answers.some(a => !a)) {
    if (!confirm('Some questions are unanswered. Save anyway?')) {
      return;
    }
  }

  saveAnswersBtn.disabled = true;
  saveAnswersBtn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/scholar/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers })
    });

    const data = await res.json();

    if (data.ok) {
      saveAnswersBtn.textContent = '<i class="fas fa-check"></i> Saved';
      setTimeout(() => {
        saveAnswersBtn.textContent = 'Save Answers';
        saveAnswersBtn.disabled = false;
        loadScholar(); // Reload to show updated questions
      }, 1500);
    } else {
      alert(`Error saving answers: ${data.message}`);
      saveAnswersBtn.disabled = false;
      saveAnswersBtn.textContent = 'Save Answers';
    }
  } catch (error) {
    alert(`Network error: ${error.message}`);
    saveAnswersBtn.disabled = false;
    saveAnswersBtn.textContent = 'Save Answers';
  }
});

// API Key Management
const btnToggleApiKey = document.getElementById('btn-toggle-api-key');
const apiKeyConfig = document.getElementById('api-key-config');
const apiKeyStatus = document.getElementById('api-key-status');
const apiKeyInput = document.getElementById('api-key-input');
const btnSaveApiKey = document.getElementById('btn-save-api-key');
const btnTestApiKey = document.getElementById('btn-test-api-key');
const apiKeyTestResult = document.getElementById('api-key-test-result');

const apiProviderSelect = document.getElementById('api-provider-select');

async function loadApiKeyStatus() {
  if (!apiKeyStatus) return;
  try {
    const res = await fetch('/api/scholar/api-key');
    const data = await res.json();
    if (data.has_key) {
      const providerName = data.api_provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
      apiKeyStatus.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> API key configured (${providerName}, ${data.model}) - ${data.key_preview}</span>`;
      if (apiProviderSelect) {
        apiProviderSelect.value = data.api_provider || 'openrouter';
      }
    } else {
      apiKeyStatus.innerHTML = '<span style="color: var(--text-muted);">No API key configured. Click "Configure" to add one.</span>';
    }
  } catch (error) {
    apiKeyStatus.innerHTML = '<span style="color: var(--error);">Error loading API key status</span>';
  }
}

if (btnToggleApiKey && apiKeyConfig && apiKeyInput) btnToggleApiKey.addEventListener('click', () => {
  const isVisible = apiKeyConfig.style.display !== 'none';
  apiKeyConfig.style.display = isVisible ? 'none' : 'block';
  btnToggleApiKey.textContent = isVisible ? 'Configure' : 'Cancel';
  if (!isVisible) {
    apiKeyInput.value = '';
  }
});

if (btnSaveApiKey && apiKeyInput && apiKeyStatus) btnSaveApiKey.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }

  const apiProvider = apiProviderSelect ? apiProviderSelect.value : 'openrouter';
  const model = apiProvider === 'openrouter' ? 'openrouter/auto' : 'gpt-4o-mini';

  btnSaveApiKey.disabled = true;
  btnSaveApiKey.textContent = 'Saving...';

  try {
    const res = await fetch('/api/scholar/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        api_provider: apiProvider,
        model: model
      })
    });

    const data = await res.json();
    if (data.ok) {
      const providerName = data.api_provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
      apiKeyStatus.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> API key saved (${providerName}, ${data.model}) - ${data.key_preview}</span>`;
      apiKeyConfig.style.display = 'none';
      btnToggleApiKey.textContent = 'Configure';
      apiKeyInput.value = '';
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    alert(`Network error: ${error.message}`);
  } finally {
    btnSaveApiKey.disabled = false;
    btnSaveApiKey.textContent = 'Save Key';
  }
});

if (btnTestApiKey && apiKeyInput && apiKeyTestResult) btnTestApiKey.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API key first');
    return;
  }

  btnTestApiKey.disabled = true;
  btnTestApiKey.textContent = 'Testing...';
  apiKeyTestResult.innerHTML = 'Testing API key...';

  try {
    const apiProvider = apiProviderSelect ? apiProviderSelect.value : 'openrouter';
    const model = apiProvider === 'openrouter' ? 'openrouter/auto' : 'gpt-4o-mini';

    // Test by generating a simple answer with the provided key (no save)
    const res = await fetch('/api/scholar/questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Test question: What is PEIRRO?',
        context: 'Testing API key connectivity.',
        api_key: apiKey,
        api_provider: apiProvider,
        model: model
      })
    });

    const data = await res.json();
    if (data.ok) {
      apiKeyTestResult.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> API key works! Generated answer preview: ${data.answer.substring(0, 50)}...</span>`;
    } else {
      apiKeyTestResult.innerHTML = `<span style="color: var(--error);">✗ ${data.message}</span>`;
    }
  } catch (error) {
    apiKeyTestResult.innerHTML = `<span style="color: var(--error);">✗ Network error: ${error.message}</span>`;
  } finally {
    btnTestApiKey.disabled = false;
    btnTestApiKey.textContent = 'Test';
  }
});

// Answer generation functions (global scope for onclick handlers)
window.generateAnswer = function (questionIndex) {
  // Backwards-compatible entry point: open chat in generate mode and auto-send the question.
  window.openScholarChat(questionIndex, 'generate', true);
};

window.useGeneratedAnswer = function (questionIndex) {
  const generatedText = document.getElementById(`generated-text-${questionIndex}`);
  const textarea = document.getElementById(`answer-${questionIndex}`);
  if (generatedText && textarea) {
    textarea.value = generatedText.textContent;
    // Scroll to textarea
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    textarea.focus();
  }
};

// Tab switching - must run on DOM ready
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  if (tabButtons.length === 0 || tabPanels.length === 0) {
    console.error('[Tab System] ERROR: Tab buttons or panels not found');
    console.log('[Tab System] Buttons found:', tabButtons.length);
    console.log('[Tab System] Panels found:', tabPanels.length);
    return;
  }

  console.log('[Tab System] Initializing with', tabButtons.length, 'tabs');

  // Function to switch to a specific tab
  function switchToTab(tabName) {
    console.log('[Tab System] Switching to tab:', tabName);

    // Update button states
    tabButtons.forEach(b => {
      const btnTab = b.getAttribute('data-tab');
      if (btnTab === tabName) {
        b.classList.add('active');
        console.log('[Tab System] Activated button:', btnTab);
      } else {
        b.classList.remove('active');
      }
    });

    // Update panel visibility
    let panelFound = false;
    tabPanels.forEach(panel => {
      if (panel.id === `tab-${tabName}`) {
        panel.classList.add('active');
        panel.style.display = 'block';
        panelFound = true;
        console.log('[Tab System] Showing panel:', panel.id);
      } else {
        panel.classList.remove('active');
        panel.style.display = 'none';
      }
    });

    if (!panelFound) {
      console.error('[Tab System] ERROR: Panel not found for tab:', tabName);
    }

    // Update URL hash (for bookmarking)
    window.location.hash = tabName;

    // Lazy load tab content
    if (tabName === 'syllabus' && typeof loadSyllabusDashboard === 'function') {
      console.log('[Tab System] Loading syllabus dashboard');
      loadSyllabusDashboard();
    } else if (tabName === 'scholar' && typeof loadScholar === 'function') {
      console.log('[Tab System] Loading scholar data');
      loadScholar();
    }
  }

  // Add click handlers to tab buttons
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.getAttribute('data-tab');

      if (!tab) {
        console.error('[Tab System] ERROR: Tab button missing data-tab attribute');
        return;
      }

      switchToTab(tab);
    });
  });

  // Check URL hash on load (for bookmarked tabs)
  const hash = window.location.hash.substring(1); // Remove #
  if (hash && Array.from(tabButtons).some(btn => btn.getAttribute('data-tab') === hash)) {
    console.log('[Tab System] Restoring tab from URL hash:', hash);
    switchToTab(hash);
  } else {
    // Default to overview
    console.log('[Tab System] Showing default tab: overview');
    switchToTab('overview');
  }
}

// Calendar state (Globals initialized above)

// Calendar rendering
async function loadCalendar() {
  console.log('[Calendar] loadCalendar() called');
  const courseId = document.getElementById('calendar-filter-course')?.value || '';
  const eventType = document.getElementById('calendar-filter-type')?.value || '';
  const viewRange = document.getElementById('calendar-view-range')?.value || 'month';

  const today = new Date();
  let startDate = new Date(currentCalendarDate);
  startDate.setDate(1);
  startDate.setDate(startDate.getDate() - 7); // Show a week before month start

  let endDate = new Date(currentCalendarDate);
  const monthsToShow = viewRange === 'month' ? 1 : viewRange === '2months' ? 2 : 3;
  endDate.setMonth(endDate.getMonth() + monthsToShow);
  endDate.setDate(0); // Last day of that month

  const params = new URLSearchParams({
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  });
  if (courseId) params.append('course_id', courseId);
  if (eventType) params.append('event_type', eventType);

  try {
    console.log('[Calendar] Fetching calendar data...');
    const res = await fetch(`/api/calendar/data?${params}`);
    const data = await res.json();
    console.log('[Calendar] API response:', data);
    if (data.ok) {
      calendarData = data;
    } else {
      console.warn('[Calendar] API returned ok=false, using empty data');
      // Ensure calendarData has empty arrays so renderCalendar works
      calendarData = { events: [], sessions: [], planned: [], ok: true };
    }
  } catch (error) {
    console.error('[Calendar] Failed to load calendar data:', error);
    // Ensure calendarData has empty arrays so renderCalendar works
    calendarData = { events: [], sessions: [], planned: [], ok: true };
  }

  // Always render calendar grid (even if empty)
  console.log('[Calendar] Rendering calendar with data:', calendarData);
  renderCalendar();
}

// Type icons for syllabus events
const EVENT_TYPE_ICONS = {
  'lecture': '📚',
  'reading': '📖',
  'quiz': '✏️',
  'exam': '📝',
  'assignment': '📋',
  'lab': '🔬',
  'immersion': '🏥',
  'checkoff': '✅',
  'practical': '🩺',
  'async': '💻',
  'other': '📌'
};

/**
 * Parse time and location from raw_text field
 * Expected format: "Time: 3:00 PM | Location: Room 204"
 */
function parseEventDetails(rawText) {
  const result = { time: null, location: null };
  if (!rawText) return result;

  const timeMatch = rawText.match(/Time:\s*([^|]+)/i);
  const locMatch = rawText.match(/Location:\s*([^|]+)/i);

  if (timeMatch) result.time = timeMatch[1].trim();
  if (locMatch) result.location = locMatch[1].trim();

  return result;
}

/**
 * Get icon for event type
 */
function getEventTypeIcon(type) {
  const icons = {
    exam: '📝',
    quiz: '❓',
    assignment: '📋',
    lab: '🔬',
    lecture: '🎓',
    immersion: '🏥',
    checkoff: '✅',
    practical: '🩺',
    async: '💻',
    reading: '📖',
    other: '📌'
  };
  return icons[type] || icons[(type || '').toLowerCase()] || '📌';
}

/**
 * Render week view - 7-day grid layout (like month but one week, bigger boxes)
 */
function renderWeekView() {
  const container = document.getElementById('calendar-grid');
  if (!container) return;

  container.style.display = 'block';
  container.style.gridTemplateColumns = '1fr';
  container.classList.add('single-day-grid');

  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(7, 1fr)';
  container.classList.remove('single-day-grid');

  // Ensure calendarData has required arrays
  if (!calendarData || !calendarData.events) {
    calendarData = { events: [], sessions: [], planned: [] };
  }
  calendarData.events = calendarData.events || [];
  calendarData.sessions = calendarData.sessions || [];

  // Get current week (Sunday to Saturday)
  const today = new Date(currentCalendarDate);
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const nowStr = new Date().toISOString().split('T')[0];

  // Week view uses same grid as month but only 1 row of days
  let html = '';

  // Weekday headers
  days.forEach(day => {
    html += `<div class="calendar-weekday-header">${day}</div>`;
  });

  // Day cells (larger for week view)
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + i);
    const dateStr = currentDay.toISOString().split('T')[0];
    const isToday = dateStr === nowStr;

    // Filter events for this day
    const dayEvents = calendarData.events.filter(e => e.date === dateStr);
    const daySessions = calendarData.sessions.filter(s => s.date === dateStr);

    html += `
      <div class="calendar-day week-view-day ${isToday ? 'is-today' : ''}" data-date="${dateStr}">
        <div class="calendar-day-number">${currentDay.getDate()}</div>
        <div class="calendar-day-events">
    `;

    // Render events (show more detail in week view)
    dayEvents.forEach(event => {
      const details = parseEventDetails(event.raw_text);
      const typeIcon = getEventTypeIcon(event.type || event.event_type);
      const eventType = event.type || event.event_type || 'other';
      html += `
        <div class="calendar-event week-event event-${eventType}" onclick="openEventEditModal('${event.id}')" title="${event.title}">
          <span class="event-icon">${typeIcon}</span>
          <span class="event-title">${event.title}</span>
          ${details.time ? `<div class="event-time">${details.time}</div>` : ''}
        </div>
      `;
    });

    // Render study sessions
    daySessions.forEach(session => {
      html += `
        <div class="calendar-event week-event session-event" title="${session.topic || 'Study Session'}">
          <span class="event-icon">📚</span>
          <span class="event-title">${session.topic || 'Study'}</span>
          <div class="event-time">${session.duration_minutes || 0}m</div>
        </div>
      `;
    });

    if (dayEvents.length === 0 && daySessions.length === 0) {
      html += '<div class="no-events">—</div>';
    }

    html += '</div></div>';
  }

  // Update container style for week view (taller cells)
  container.style.gridTemplateColumns = 'repeat(7, 1fr)';
  container.innerHTML = html;

  // Update header
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const headerEl = document.getElementById('calendar-month-year');
  if (headerEl) {
    headerEl.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  console.log('[Calendar] Week view rendered with', calendarData.events.length, 'events');
}

/**
 * Render day view - single day detailed layout
 */
function renderDayView() {
  const container = document.getElementById('calendar-grid');
  if (!container) return;

  // Ensure calendarData has required arrays
  if (!calendarData || !calendarData.events) {
    calendarData = { events: [], sessions: [], planned: [] };
  }
  calendarData.events = calendarData.events || [];
  calendarData.sessions = calendarData.sessions || [];

  const today = new Date(currentCalendarDate);
  const dateStr = today.toISOString().split('T')[0];
  const nowStr = new Date().toISOString().split('T')[0];
  const isToday = dateStr === nowStr;

  // Filter events for this day
  const dayEvents = calendarData.events.filter(e => e.date === dateStr);
  const daySessions = calendarData.sessions.filter(s => s.date === dateStr);

  // Build course lookup
  const courseById = {};
  allCourses.forEach((c, idx) => {
    courseById[c.id] = { ...c, _idx: idx };
  });

  let html = `
    <div class="day-view-container">
      <div class="day-header ${isToday ? 'is-today' : ''}">
        <h2>${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
        ${isToday ? '<span class="today-badge">Today</span>' : ''}
      </div>
      <div class="day-events-list">
  `;

  if (dayEvents.length === 0 && daySessions.length === 0) {
    html += '<div class="day-empty">No events scheduled for this day</div>';
  } else {
    // Sort events by time if available
    const sortedEvents = [...dayEvents].sort((a, b) => {
      const aTime = parseEventDetails(a.raw_text).time || '23:59';
      const bTime = parseEventDetails(b.raw_text).time || '23:59';
      return aTime.localeCompare(bTime);
    });

    sortedEvents.forEach(event => {
      const details = parseEventDetails(event.raw_text);
      const typeIcon = getEventTypeIcon(event.type || event.event_type);
      const course = courseById[event.course_id] || {};
      const courseName = course.code || course.name || '';

      html += `
        <div class="day-event-card event-type-${event.type || event.event_type}" onclick="openEventEditModal('${event.id}')">
          <div class="day-event-header">
            <span class="day-event-icon">${typeIcon}</span>
            <span class="day-event-type">${event.type || event.event_type || 'event'}</span>
            ${details.time ? `<span class="day-event-time">⏰ ${details.time}</span>` : ''}
          </div>
          <h3 class="day-event-title">${event.title}</h3>
          ${courseName ? `<div class="day-event-course">📚 ${courseName}</div>` : ''}
          ${details.location ? `<div class="day-event-location">📍 ${details.location}</div>` : ''}
          ${event.weight ? `<div class="day-event-weight">⚖️ Weight: ${(event.weight * 100).toFixed(0)}%</div>` : ''}
        </div>
      `;
    });

    // Render study sessions
    daySessions.forEach(session => {
      html += `
        <div class="day-event-card session-card">
          <div class="day-event-header">
            <span class="day-event-icon">📚</span>
            <span class="day-event-type">Study Session</span>
            <span class="day-event-time">${session.duration_minutes || 0} min</span>
          </div>
          <h3 class="day-event-title">${session.topic || 'Study Session'}</h3>
          ${session.mode ? `<div class="day-event-mode">Mode: ${session.mode}</div>` : ''}
        </div>
      `;
    });
  }

  html += '</div></div>';
  container.innerHTML = html;

  // Update header
  const headerEl = document.getElementById('calendar-month-year');
  if (headerEl) {
    headerEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  console.log('[Calendar] Day view rendered with', dayEvents.length, 'events,', daySessions.length, 'sessions');
}

// Default color palette for courses
const COURSE_COLOR_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16",
  "#10B981", "#06B6D4", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899", "#64748B", "#78716C"
];

// Get color for a course (from course data or auto-assign)
function getCourseColor(course, index) {
  if (course && course.color) return course.color;
  return COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length];
}

// Track current proposal being viewed
let currentProposalFile = null;

// View a proposal file in modal
async function viewProposalFile(filename) {
  currentProposalFile = filename;
  const overlay = document.getElementById('proposal-modal-overlay');
  const titleEl = document.getElementById('proposal-modal-title');
  const metaEl = document.getElementById('proposal-modal-meta');
  const contentEl = document.getElementById('proposal-modal-content');

  if (!overlay) return;

  // Show modal
  overlay.style.display = 'flex';
  titleEl.textContent = 'Loading...';
  metaEl.textContent = '';
  contentEl.textContent = 'Fetching proposal content...';

  try {
    const res = await fetch(`/api/scholar/proposal/${encodeURIComponent(filename)}`);
    const data = await res.json();

    if (data.ok) {
      // Parse title from filename
      let title = filename.replace('.md', '').replace(/_/g, ' ');
      if (filename.includes('change_proposal')) {
        title = '📝 ' + title.replace('change proposal ', '').trim();
        metaEl.innerHTML = '<span style="color: #a855f7;">Change Proposal</span>';
      } else if (filename.includes('experiment')) {
        title = '🧪 ' + title.replace('experiment ', '').trim();
        metaEl.innerHTML = '<span style="color: #06b6d4;">Experiment</span>';
      } else {
        metaEl.innerHTML = '<span style="color: #64748b;">Proposal</span>';
      }

      titleEl.textContent = title;
      contentEl.textContent = data.content;
    } else {
      titleEl.textContent = 'Error';
      contentEl.textContent = data.message || 'Failed to load proposal';
    }
  } catch (e) {
    titleEl.textContent = 'Error';
    contentEl.textContent = 'Failed to fetch proposal: ' + e.message;
  }
}

// Close proposal modal
function closeProposalModal() {
  const overlay = document.getElementById('proposal-modal-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  currentProposalFile = null;
}

// Handle proposal approve/reject
async function handleProposalAction(action) {
  if (!currentProposalFile) return;

  const confirmMsg = action === 'approve'
    ? 'Approve this proposal? It will be moved to the approved folder.'
    : 'Reject this proposal? It will be moved to the rejected folder.';

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/scholar/proposal/${encodeURIComponent(currentProposalFile)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();

    if (data.ok) {
      closeProposalModal();
      // Refresh Scholar tab to update proposal list
      loadScholar();
      // Show success message
      alert(`<i class="fas fa-check"></i> ${data.message}`);
    } else {
      alert('Error: ' + (data.message || 'Failed to process proposal'));
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'proposal-modal-overlay') {
    closeProposalModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProposalModal();
  }
});

// Toggle event status (pending <-> completed)
async function toggleEventStatus(eventId, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  try {
    const res = await fetch(`/api/syllabus/event/${eventId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.ok) {
      // Update local state
      const ev = syllabusEvents.find(e => e.id === eventId);
      if (ev) ev.status = newStatus;
      renderSyllabusList();
    } else {
      console.error('Failed to update status:', data.message);
    }
  } catch (error) {
    console.error('Error updating event status:', error);
  }
}

// Schedule M6 reviews for an event
async function scheduleM6Reviews(eventId, eventTitle) {
  if (!confirm(`Schedule M6 spaced reviews for "${eventTitle}"?\n\nThis will create 3 study tasks:\n• Review 1: Tomorrow (10 min)\n• Review 2: In 3 days (15 min)\n• Review 3: In 7 days (20 min)`)) {
    return;
  }
  try {
    const res = await fetch(`/api/syllabus/event/${eventId}/schedule_reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (data.ok) {
      alert(`<i class="fas fa-check"></i> ${data.message}`);
      // Refresh calendar if visible
      if (syllabusViewMode === 'calendar') loadCalendar();
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    console.error('Error scheduling reviews:', error);
    alert('Failed to schedule reviews.');
  }
}

// ===== Event Edit Modal Functions =====
function openEventEditModal(eventId) {
  // Handle string IDs from calendar (e.g., "event_123")
  if (typeof eventId === 'string' && eventId.startsWith('event_')) {
    eventId = eventId.replace('event_', '');
  }

  console.log('[EditModal] Opening for event:', eventId, 'syllabusEvents count:', syllabusEvents.length);
  let ev = syllabusEvents.find(e => String(e.id) === String(eventId));

  if (!ev) {
    // If not found locally, try to fetch from API
    console.log('[EditModal] Event not in local state, fetching from API...');
    fetch(`/api/syllabus/events`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.events) {
          ev = data.events.find(e => String(e.id) === String(eventId));
          if (ev) {
            // Update local state
            syllabusEvents = data.events.map(ev => {
              const course = allCourses.find(c => c.id === ev.course_id) || {};
              return { ...ev, course };
            });
            populateEditModal(ev, eventId);
          } else {
            alert('Event not found. Please refresh the page and try again.');
          }
        } else {
          alert('Failed to load events. Please refresh the page and try again.');
        }
      })
      .catch(error => {
        console.error('[EditModal] Error fetching events:', error);
        alert('Error loading event. Please refresh the page and try again.');
      });
    return;
  }

  populateEditModal(ev, eventId);
}

function populateEditModal(ev, eventId) {
  document.getElementById('edit-event-id').value = eventId;
  const courseSelect = document.getElementById('edit-event-course');
  if (courseSelect) {
    const coursesForModal = getSortedDedupedCourses([ev.course_id]);
    courseSelect.innerHTML = buildCourseOptions(coursesForModal, true, 'Select course');
    courseSelect.value = ev.course_id || '';
  }
  document.getElementById('edit-event-title').value = ev.title || '';
  document.getElementById('edit-event-type').value = ev.type || ev.event_type || 'other';
  document.getElementById('edit-event-status').value = ev.status || 'pending';
  document.getElementById('edit-event-date').value = ev.date || '';
  document.getElementById('edit-event-due-date').value = ev.due_date || '';
  document.getElementById('edit-event-weight').value = ev.weight || '';
  document.getElementById('edit-event-details').value = ev.raw_text || '';
  const recurrenceSelect = document.getElementById('edit-event-repeat');
  const recurrenceUntil = document.getElementById('edit-event-repeat-until');
  if (recurrenceSelect) recurrenceSelect.value = 'none';
  if (recurrenceUntil) recurrenceUntil.value = '';

  const modal = document.getElementById('event-edit-modal');
  modal.style.display = 'flex';
  // Small delay to allow display change to render before adding active class for transition
  setTimeout(() => modal.classList.add('active'), 10);
}

function closeEventEditModal() {
  const modal = document.getElementById('event-edit-modal');
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
    document.getElementById('event-edit-status').textContent = '';
  }, 200); // Wait for transition
}

async function deleteEvent() {
  const eventId = document.getElementById('edit-event-id').value;
  if (!eventId) return;

  if (!confirm('Are you sure you want to delete this event?')) return;

  const statusEl = document.getElementById('event-edit-status');
  statusEl.textContent = 'Deleting...';

  try {
    const res = await fetch(`/api/syllabus/event/${eventId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.ok) {
      // Remove from local state
      syllabusEvents = syllabusEvents.filter(e => String(e.id) !== String(eventId));

      closeEventEditModal();
      renderSyllabusList();
      if (typeof loadCalendar === 'function') loadCalendar();
    } else {
      statusEl.textContent = `Error: ${data.message}`;
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    statusEl.textContent = 'Failed to delete event';
    statusEl.style.color = 'var(--error)';
  }
}

async function saveEventEdit(e) {
  if (e) e.preventDefault();

  const eventId = document.getElementById('edit-event-id').value;
  const statusEl = document.getElementById('event-edit-status');

  const payload = {
    title: document.getElementById('edit-event-title').value.trim(),
    event_type: document.getElementById('edit-event-type').value,
    status: document.getElementById('edit-event-status').value,
    date: document.getElementById('edit-event-date').value || null,
    due_date: document.getElementById('edit-event-due-date').value || null,
    weight: parseFloat(document.getElementById('edit-event-weight').value) || null,
    raw_text: document.getElementById('edit-event-details').value.trim()
  };

  const selectedCourse = document.getElementById('edit-event-course')?.value;
  if (selectedCourse) payload.course_id = parseInt(selectedCourse, 10) || null;

  const recurrencePattern = document.getElementById('edit-event-repeat')?.value || 'none';
  const recurrenceUntil = document.getElementById('edit-event-repeat-until')?.value || '';
  if (recurrencePattern !== 'none' || recurrenceUntil) {
    payload.recurrence_plan = {
      pattern: recurrencePattern,
      until: recurrenceUntil || null
    };
  }

  // Remove null/empty fields
  Object.keys(payload).forEach(k => {
    if (payload[k] === null || payload[k] === '') delete payload[k];
  });

  try {
    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'var(--text-muted)';

    const res = await fetch(`/api/syllabus/event/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.ok) {
      statusEl.textContent = '<i class="fas fa-check"></i> Event updated successfully';
      statusEl.style.color = 'var(--success)';

      // Update local state
      const ev = syllabusEvents.find(e => e.id === parseInt(eventId));
      if (ev) {
        if (payload.title) ev.title = payload.title;
        if (payload.event_type) ev.type = payload.event_type;
        if (payload.status) ev.status = payload.status;
        if (payload.date) ev.date = payload.date;
        if (payload.due_date) ev.due_date = payload.due_date;
        if (payload.weight) ev.weight = payload.weight;
        if (payload.raw_text) ev.raw_text = payload.raw_text;
        if (payload.course_id) ev.course_id = payload.course_id;
      }

      // Close modal and refresh list after brief delay
      setTimeout(() => {
        closeEventEditModal();
        renderSyllabusList();
        if (syllabusViewMode === 'calendar') loadCalendar();
      }, 500);
    } else {
      statusEl.textContent = `Error: ${data.message}`;
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    console.error('Error saving event:', error);
    statusEl.textContent = 'Failed to save event';
    statusEl.style.color = 'var(--error)';
  }
}

// Export event edit modal functions and syllabus helper functions to window scope for inline onclick handlers
window.openEventEditModal = openEventEditModal;
window.closeEventEditModal = closeEventEditModal;
window.saveEventEdit = saveEventEdit;
window.deleteEvent = deleteEvent;
window.toggleEventStatus = toggleEventStatus;
window.scheduleM6Reviews = scheduleM6Reviews;
window.toggleWeekSection = toggleWeekSection;

// Attach form submit handler for event edit form
document.addEventListener('DOMContentLoaded', () => {
  const editForm = document.getElementById('event-edit-form');
  if (editForm) {
    editForm.addEventListener('submit', saveEventEdit);
  }
});

/**
 * Get semester week number (Week 1 = Jan 5, 2025)
 */
function getSemesterWeekNumber(dateStr) {
  if (!dateStr) return 0;
  const date = new Date(dateStr + 'T00:00:00');
  const diffMs = date - SEMESTER_START;
  const diffDays = Math.floor(diffMs / 86400000);
  const weekNum = Math.floor(diffDays / 7) + 1;
  return weekNum;
}

/**
 * Get week start date for a given semester week number
 */
function getWeekStartDate(weekNum) {
  const date = new Date(SEMESTER_START);
  date.setDate(date.getDate() + (weekNum - 1) * 7);
  return date;
}

/**
 * Populate the start week dropdown (Week 1 - Week 20)
 */
function populateWeekSelector() {
  const startWeekSelect = document.getElementById('list-start-week');
  if (!startWeekSelect) return;

  let html = '';
  for (let w = 1; w <= 20; w++) {
    const weekStart = getWeekStartDate(w);
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    html += `<option value="${w}">Week ${w} (${label})</option>`;
  }
  startWeekSelect.innerHTML = html;
  startWeekSelect.value = listStartWeek;
}

/**
 * Update the week range label display
 */
function updateWeekRangeLabel() {
  const label = document.getElementById('list-week-range-label');
  if (!label) return;

  if (listWeekCount === 'all') {
    label.textContent = 'All Weeks';
  } else if (listWeekCount === 1) {
    label.textContent = `Week ${listStartWeek}`;
  } else {
    const endWeek = listStartWeek + listWeekCount - 1;
    label.textContent = `Week ${listStartWeek} - ${endWeek}`;
  }
}

/**
 * Get week number and date range for a given date
 */
function getWeekInfo(dateStr) {
  if (!dateStr) return { weekNum: 0, weekLabel: 'No Date', weekStart: null };

  const date = new Date(dateStr + 'T00:00:00');
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date - startOfYear) / 86400000);
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);

  // Get week start (Sunday) and end (Saturday)
  const dayOfWeek = date.getDay();
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekLabel = `Week ${weekNum}: ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return { weekNum, weekLabel, weekStart, weekEnd, year: date.getFullYear() };
}

function renderSyllabusList() {
  if (!syllabusListBody || !syllabusListEmpty) return;

  const courseId = syllabusListCourse ? syllabusListCourse.value : '';
  const eventType = syllabusListType ? syllabusListType.value : '';
  const search = syllabusListSearch ? syllabusListSearch.value.toLowerCase() : '';

  // Update week range label
  updateWeekRangeLabel();

  const filtered = syllabusEvents.filter(ev => {
    const matchesCourse = !courseId || String(ev.course_id) === String(courseId);
    const matchesType = !eventType || (ev.type || '').toLowerCase() === eventType;
    const haystack = `${ev.title || ''} ${ev.raw_text || ''}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);

    // Week filter
    let matchesWeek = true;
    if (listWeekCount !== 'all') {
      const dateStr = ev.date || ev.due_date || '';
      const eventWeek = getSemesterWeekNumber(dateStr);
      matchesWeek = eventWeek >= listStartWeek && eventWeek < listStartWeek + listWeekCount;
    }

    return matchesCourse && matchesType && matchesSearch && matchesWeek;
  }).sort((a, b) => {
    const ad = a.date || a.due_date || '';
    const bd = b.date || b.due_date || '';
    return ad.localeCompare(bd);
  });

  // Build course index for colors
  const courseById = {};
  allCourses.forEach((c, idx) => {
    courseById[c.id] = { ...c, _idx: idx };
  });

  // Group events by week
  const weekGroups = {};
  filtered.forEach(ev => {
    const dateStr = ev.date || ev.due_date || '';
    const weekInfo = getWeekInfo(dateStr);
    const weekKey = dateStr ? `${weekInfo.year}-W${String(weekInfo.weekNum).padStart(2, '0')}` : 'no-date';

    if (!weekGroups[weekKey]) {
      weekGroups[weekKey] = {
        label: weekInfo.weekLabel,
        events: [],
        weekNum: weekInfo.weekNum,
        year: weekInfo.year
      };
    }
    weekGroups[weekKey].events.push(ev);
  });

  // Sort week keys
  const sortedWeekKeys = Object.keys(weekGroups).sort();

  // Render grouped by week with collapsible sections
  let html = '';
  sortedWeekKeys.forEach((weekKey, idx) => {
    const group = weekGroups[weekKey];
    const isExpanded = idx < 3; // First 3 weeks expanded by default

    html += `
      <tr class="week-header-row" onclick="toggleWeekSection(this)" style="cursor: pointer; background: var(--surface-2);">
        <td colspan="8" style="padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 2px solid var(--primary);">
          <span class="week-chevron" style="display: inline-block; transition: transform 0.2s; margin-right: 8px;">${isExpanded ? '▼' : '▶'}</span>
          ${group.label}
          <span style="font-weight: 400; color: var(--text-muted); margin-left: 12px;">(${group.events.length} events)</span>
        </td>
      </tr>
    `;

    group.events.forEach(ev => {
      const dateDisplay = ev.date || ev.due_date || '';
      const weightDisplay = ev.weight ? `${(ev.weight * 100).toFixed(0)}%` : '—';
      const course = courseById[ev.course_id] || ev.course || {};
      const courseName = course.code || course.name || '—';
      const courseColor = getCourseColor(course, course._idx || 0);
      const typeIcon = EVENT_TYPE_ICONS[(ev.type || '').toLowerCase()] || '📌';
      const isCompleted = (ev.status || '').toLowerCase() === 'completed';
      const rowClass = isCompleted ? 'style="opacity: 0.6;"' : '';
      const titleStyle = isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : '';
      const displayStyle = isExpanded ? '' : 'display: none;';

      html += `
        <tr class="week-event-row" data-week="${weekKey}" ${rowClass} style="${displayStyle}">
          <td style="text-align: center;">
            <input type="checkbox" 
                   ${isCompleted ? 'checked' : ''} 
                   onchange="toggleEventStatus(${ev.id}, '${ev.status || 'pending'}')"
                   title="${isCompleted ? 'Mark as pending' : 'Mark as completed'}"
                   style="width: 18px; height: 18px; cursor: pointer;">
          </td>
          <td>${dateDisplay || '—'}</td>
          <td>
            <span class="course-badge" style="background: ${courseColor}20; color: ${courseColor}; border: 1px solid ${courseColor}40; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
              ${courseName}
            </span>
          </td>
          <td><span title="${ev.type || 'other'}">${typeIcon}</span> ${ev.type || ''}</td>
          <td style="${titleStyle}">${ev.title || ''}</td>
          <td style="text-align: center;">${weightDisplay}</td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(ev.raw_text || '').replace(/"/g, '&quot;')}">${ev.raw_text || ''}</td>
          <td style="white-space: nowrap;">
            <button class="btn" style="font-size: 11px; padding: 4px 8px; margin-right: 4px;" 
                    onclick="openEventEditModal(${ev.id})"
                    title="Edit event">
              ✏️
            </button>
            <button class="btn" style="font-size: 11px; padding: 4px 8px;" 
                    onclick="scheduleM6Reviews(${ev.id}, '${(ev.title || '').replace(/'/g, "\\'")}')">
              📅 M6
            </button>
          </td>
        </tr>
      `;
    });
  });

  syllabusListBody.innerHTML = html;
  syllabusListEmpty.style.display = filtered.length ? 'none' : 'block';
}

/**
 * Toggle week section collapse/expand
 */
function toggleWeekSection(headerRow) {
  const chevron = headerRow.querySelector('.week-chevron');
  const nextRows = [];
  let sibling = headerRow.nextElementSibling;

  while (sibling && !sibling.classList.contains('week-header-row')) {
    if (sibling.classList.contains('week-event-row')) {
      nextRows.push(sibling);
    }
    sibling = sibling.nextElementSibling;
  }

  const isExpanded = chevron.textContent === '▼';
  chevron.textContent = isExpanded ? '▶' : '▼';

  nextRows.forEach(row => {
    row.style.display = isExpanded ? 'none' : '';
  });
}

function collapseAllWeekSections() {
  document.querySelectorAll('.week-header-row').forEach(header => {
    const chevron = header.querySelector('.week-chevron');
    if (chevron) chevron.textContent = '▶';
    let sibling = header.nextElementSibling;
    while (sibling && !sibling.classList.contains('week-header-row')) {
      if (sibling.classList.contains('week-event-row')) sibling.style.display = 'none';
      sibling = sibling.nextElementSibling;
    }
  });
}

function expandAllWeekSections() {
  document.querySelectorAll('.week-header-row').forEach(header => {
    const chevron = header.querySelector('.week-chevron');
    if (chevron) chevron.textContent = '▼';
    let sibling = header.nextElementSibling;
    while (sibling && !sibling.classList.contains('week-header-row')) {
      if (sibling.classList.contains('week-event-row')) sibling.style.display = '';
      sibling = sibling.nextElementSibling;
    }
  });
}

function setSyllabusView(mode) {
  syllabusViewMode = mode;
  const calendarBox = document.getElementById('syllabus-calendar-container');
  const listBox = document.getElementById('syllabus-list-container');
  if (calendarBox && listBox) {
    calendarBox.style.display = mode === 'calendar' ? 'block' : 'none';
    listBox.style.display = mode === 'list' ? 'block' : 'none';
  }
  if (btnViewCalendar && btnViewList) {
    const calendarActive = mode === 'calendar';
    btnViewCalendar.classList.toggle('arcade-btn-primary', calendarActive);
    btnViewCalendar.classList.toggle('active', calendarActive);
    btnViewCalendar.setAttribute('aria-pressed', calendarActive ? 'true' : 'false');
    btnViewList.classList.toggle('arcade-btn-primary', !calendarActive);
    btnViewList.classList.toggle('active', !calendarActive);
    btnViewList.setAttribute('aria-pressed', calendarActive ? 'false' : 'true');
  }
  if (mode === 'calendar') {
    loadCalendar();
  } else {
    renderSyllabusList();
  }
}

function renderCalendar() {
  console.log('[Calendar] renderCalendar() called');
  const grid = document.getElementById('calendar-grid');
  if (!grid) {
    console.warn('[Calendar] calendar-grid element not found');
    return;
  }

  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.classList.remove('single-day-grid');

  // Check view type and route to appropriate renderer
  const viewRange = document.getElementById('calendar-view-range')?.value || 'month';

  if (viewRange === 'week') {
    renderWeekView();
    return;
  } else if (viewRange === 'day') {
    renderDayView();
    return;
  }

  // Continue with month view logic...
  // Ensure calendarData has required arrays
  if (!calendarData || !calendarData.events) {
    console.warn('[Calendar] calendarData missing, initializing empty');
    calendarData = { events: [], sessions: [], planned: [] };
  }
  calendarData.events = calendarData.events || [];
  calendarData.sessions = calendarData.sessions || [];
  calendarData.planned = calendarData.planned || [];

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const today = new Date();
  console.log('[Calendar] Rendering for', year, month + 1);

  // Update month/year header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthYearEl = document.getElementById('calendar-month-year');
  if (monthYearEl) {
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
  }

  // First day of month and how many days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  grid.innerHTML = weekdays.map(w => `<div class="calendar-weekday">${w}</div>`).join('');

  // Build course lookup for colors
  const courseById = {};
  allCourses.forEach((c, idx) => {
    courseById[c.id] = { ...c, _idx: idx };
  });
  // Also index by code for calendar events
  const courseByCode = {};
  allCourses.forEach((c, idx) => {
    if (c.code) courseByCode[c.code] = { ...c, _idx: idx };
  });

  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    grid.innerHTML += '<div class="calendar-day other-month"></div>';
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month, day);
    const isToday = dateObj.toDateString() === today.toDateString();

    // Find events/sessions/planned for this date
    const dayEvents = calendarData.events.filter(e => e.date === dateStr);
    const daySessions = calendarData.sessions.filter(s => s.date === dateStr);
    const dayPlanned = calendarData.planned.filter(p => p.date === dateStr);

    let html = `<div class="calendar-day ${isToday ? 'today' : ''}">`;
    html += `<div class="calendar-day-header"><span class="calendar-day-number">${day}</span></div>`;

    // Render events with course colors
    dayEvents.forEach(ev => {
      const isExamQuiz = ['exam', 'quiz'].includes((ev.event_type || '').toLowerCase());
      // Find course by code or id
      let course = courseByCode[ev.course_code] || null;
      const color = course ? getCourseColor(course, course._idx) : '#3B82F6';
      const bgColor = isExamQuiz ? 'rgba(248, 81, 73, 0.3)' : `${color}30`;
      const borderColor = isExamQuiz ? 'var(--error)' : color;
      const typeIcon = EVENT_TYPE_ICONS[(ev.event_type || '').toLowerCase()] || '';

      html += `<div class="calendar-event" style="background: ${bgColor}; border-left: 3px solid ${borderColor}; cursor: pointer;" onclick="openEventEditModal('${ev.id}')" title="${ev.course_code || ''}: ${ev.title}">${typeIcon} ${ev.title}</div>`;
    });

    // Render study sessions
    daySessions.forEach(sess => {
      html += `<div class="calendar-event study-session" title="${sess.topic}">${sess.topic || 'Session'}</div>`;
    });

    // Render planned sessions with course colors
    dayPlanned.forEach(plan => {
      const course = courseByCode[plan.course_code] || null;
      const color = course ? getCourseColor(course, course._idx) : '#8B5CF6';
      html += `<div class="calendar-event planned" style="background: ${color}20; border-left: 3px solid ${color};" title="Planned: ${plan.notes || 'Review'}">📅 ${plan.planned_minutes || ''}m</div>`;
    });

    html += '</div>';
    grid.innerHTML += html;
  }

  // Fill remaining cells to complete grid (up to 6 weeks)
  const totalCells = startingDayOfWeek + daysInMonth;
  const remainingCells = 42 - totalCells; // 6 weeks * 7 days
  for (let i = 0; i < remainingCells; i++) {
    grid.innerHTML += '<div class="calendar-day other-month"></div>';
  }

  console.log('[Calendar] Calendar rendered successfully with', calendarData.events.length, 'events,', calendarData.sessions.length, 'sessions,', calendarData.planned.length, 'planned');
}

// ========================================
// Study Tasks (Readings & Topics)
// ========================================

async function loadStudyTasks() {
  const listEl = document.getElementById('study-tasks-list');
  const filterEl = document.getElementById('study-tasks-filter');
  if (!listEl) return;

  const filter = filterEl ? filterEl.value : 'active';

  try {
    const res = await fetch(`/api/syllabus/study-tasks?filter=${filter}`);
    const data = await res.json();

    if (!data.ok) {
      listEl.innerHTML = `<div style="color: var(--error); padding: 20px;">Error: ${data.message}</div>`;
      return;
    }

    // Update stats
    const stats = data.stats || {};
    const pendingEl = document.getElementById('tasks-pending-count');
    const inProgressEl = document.getElementById('tasks-in-progress-count');
    const completedEl = document.getElementById('tasks-completed-count');
    const progressBar = document.getElementById('tasks-progress-bar');
    const progressPct = document.getElementById('tasks-progress-pct');

    if (pendingEl) pendingEl.textContent = stats.pending || 0;
    if (inProgressEl) inProgressEl.textContent = stats.in_progress || 0;
    if (completedEl) completedEl.textContent = stats.completed || 0;
    if (progressBar) progressBar.style.width = `${stats.progress_pct || 0}%`;
    if (progressPct) progressPct.textContent = `${stats.progress_pct || 0}%`;

    // Render tasks
    const tasks = data.tasks || [];
    if (tasks.length === 0) {
      listEl.innerHTML = `<div style="color: var(--text-muted); padding: 20px; text-align: center;">
        No study tasks found. Add readings or topics via the syllabus form.
      </div>`;
      return;
    }

    let html = '';
    tasks.forEach(task => {
      const isCompleted = task.status === 'completed';
      const courseColor = task.course_color || '#6366F1';

      // Status styling
      let statusBadge = '';
      let rowStyle = '';
      if (task.is_overdue) {
        statusBadge = '<span style="font-size: 10px; padding: 2px 6px; background: var(--error); color: white; border-radius: 4px; margin-left: 8px;">OVERDUE</span>';
        rowStyle = 'border-left: 3px solid var(--error);';
      } else if (task.is_current) {
        statusBadge = '<span style="font-size: 10px; padding: 2px 6px; background: var(--accent); color: white; border-radius: 4px; margin-left: 8px;">CURRENT</span>';
        rowStyle = 'border-left: 3px solid var(--accent);';
      } else if (isCompleted) {
        rowStyle = 'border-left: 3px solid var(--success); opacity: 0.7;';
      }

      // Date range display
      let dateDisplay = '';
      if (task.start_date && task.end_date) {
        dateDisplay = `${task.start_date} → ${task.end_date}`;
      } else if (task.end_date) {
        dateDisplay = `Due: ${task.end_date}`;
      } else if (task.start_date) {
        dateDisplay = `From: ${task.start_date}`;
      }

      // Days remaining
      let daysDisplay = '';
      if (!isCompleted && task.days_remaining !== null) {
        if (task.days_remaining < 0) {
          daysDisplay = `<span style="color: var(--error); font-weight: 600;">${Math.abs(task.days_remaining)}d overdue</span>`;
        } else if (task.days_remaining === 0) {
          daysDisplay = '<span style="color: var(--warning); font-weight: 600;">Due today</span>';
        } else if (task.days_remaining <= 3) {
          daysDisplay = `<span style="color: var(--warning);">${task.days_remaining}d left</span>`;
        } else {
          daysDisplay = `<span style="color: var(--text-muted);">${task.days_remaining}d left</span>`;
        }
      }

      html += `
        <div class="study-task-item" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; ${rowStyle}">
          <input type="checkbox" 
            id="task-check-${task.id}" 
            ${isCompleted ? 'checked' : ''} 
            onchange="toggleStudyTask(${task.id}, this.checked)"
            style="width: 20px; height: 20px; margin-top: 2px; accent-color: var(--success); cursor: pointer;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${courseColor};"></span>
              <span style="font-size: 11px; color: var(--text-muted);">${task.course_name}</span>
              <span style="font-size: 10px; padding: 1px 6px; background: var(--bg-secondary); border-radius: 4px; text-transform: uppercase;">${task.type}</span>
              ${statusBadge}
            </div>
            <div style="font-size: 14px; font-weight: 500; margin-top: 4px; ${isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
              ${task.title}
            </div>
            ${task.raw_text ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${task.raw_text.substring(0, 100)}${task.raw_text.length > 100 ? '...' : ''}</div>` : ''}
            <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 11px;">
              ${dateDisplay ? `<span style="color: var(--text-muted);">📅 ${dateDisplay}</span>` : ''}
              ${daysDisplay}
            </div>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;

  } catch (error) {
    console.error('Failed to load study tasks:', error);
    listEl.innerHTML = `<div style="color: var(--error); padding: 20px;">Failed to load study tasks: ${error.message}</div>`;
  }
}

async function toggleStudyTask(taskId, completed) {
  const newStatus = completed ? 'completed' : 'pending';
  try {
    const res = await fetch(`/api/syllabus/event/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.ok) {
      // Refresh the task list
      loadStudyTasks();
    } else {
      alert('Failed to update task: ' + (data.message || 'Unknown error'));
      // Revert checkbox
      const checkbox = document.getElementById(`task-check-${taskId}`);
      if (checkbox) checkbox.checked = !completed;
    }
  } catch (error) {
    console.error('Failed to toggle task:', error);
    alert('Failed to update task');
    const checkbox = document.getElementById(`task-check-${taskId}`);
    if (checkbox) checkbox.checked = !completed;
  }
}

// Study tasks filter and refresh
const studyTasksFilter = document.getElementById('study-tasks-filter');
const btnRefreshStudyTasks = document.getElementById('btn-refresh-study-tasks');

if (studyTasksFilter) studyTasksFilter.addEventListener('change', loadStudyTasks);
if (btnRefreshStudyTasks) btnRefreshStudyTasks.addEventListener('click', loadStudyTasks);

// Calendar navigation
const btnPrev = document.getElementById('btn-calendar-prev');
const btnNext = document.getElementById('btn-calendar-next');
const btnRefresh = document.getElementById('btn-refresh-calendar');
const filterCourse = document.getElementById('calendar-filter-course');
const filterType = document.getElementById('calendar-filter-type');
const viewRange = document.getElementById('calendar-view-range');

if (btnPrev) btnPrev.addEventListener('click', () => {
  const viewRange = document.getElementById('calendar-view-range')?.value || 'month';
  if (viewRange === 'week') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
  } else if (viewRange === 'day') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() - 1);
  } else {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  }
  loadCalendar();
});

if (btnNext) btnNext.addEventListener('click', () => {
  const viewRange = document.getElementById('calendar-view-range')?.value || 'month';
  if (viewRange === 'week') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
  } else if (viewRange === 'day') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
  } else {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  }
  loadCalendar();
});

if (btnRefresh) btnRefresh.addEventListener('click', () => {
  loadCalendar();
});

if (filterCourse) filterCourse.addEventListener('change', () => {
  loadCalendar();
});

if (filterType) filterType.addEventListener('change', () => {
  loadCalendar();
});

if (viewRange) viewRange.addEventListener('change', () => {
  loadCalendar();
});

// Syllabus view toggle
if (btnViewCalendar) btnViewCalendar.addEventListener('click', () => setSyllabusView('calendar'));
if (btnViewList) btnViewList.addEventListener('click', () => setSyllabusView('list'));

// Syllabus list filters
if (btnRefreshSyllabusList) btnRefreshSyllabusList.addEventListener('click', renderSyllabusList);
if (syllabusListCourse) syllabusListCourse.addEventListener('change', renderSyllabusList);
if (syllabusListType) syllabusListType.addEventListener('change', renderSyllabusList);
if (syllabusListSearch) syllabusListSearch.addEventListener('input', () => {
  // Debounce lightly
  clearTimeout(window._syllabusSearchTimer);
  window._syllabusSearchTimer = setTimeout(renderSyllabusList, 150);
});
if (btnListCollapse) btnListCollapse.addEventListener('click', collapseAllWeekSections);
if (btnListExpand) btnListExpand.addEventListener('click', expandAllWeekSections);

// Week selector controls
const listStartWeekSelect = document.getElementById('list-start-week');
const listWeekCountSelect = document.getElementById('list-week-count');
const btnListPrevWeek = document.getElementById('btn-list-prev-week');
const btnListNextWeek = document.getElementById('btn-list-next-week');

if (listStartWeekSelect) {
  listStartWeekSelect.addEventListener('change', () => {
    listStartWeek = parseInt(listStartWeekSelect.value, 10);
    renderSyllabusList();
  });
}

if (listWeekCountSelect) {
  listWeekCountSelect.addEventListener('change', () => {
    const val = listWeekCountSelect.value;
    listWeekCount = val === 'all' ? 'all' : parseInt(val, 10);
    renderSyllabusList();
  });
}

if (btnListPrevWeek) {
  btnListPrevWeek.addEventListener('click', () => {
    if (listStartWeek > 1) {
      listStartWeek--;
      if (listStartWeekSelect) listStartWeekSelect.value = listStartWeek;
      renderSyllabusList();
    }
  });
}

if (btnListNextWeek) {
  btnListNextWeek.addEventListener('click', () => {
    if (listStartWeek < 20) {
      listStartWeek++;
      if (listStartWeekSelect) listStartWeekSelect.value = listStartWeek;
      renderSyllabusList();
    }
  });
}

// Course sorting/deduping controls
if (courseSortMode) {
  courseSortMode.addEventListener('change', () => {
    refreshCourseSelectors();
    renderSyllabusList();
    if (syllabusViewMode === 'calendar') loadCalendar();
  });
}

if (courseDedupToggle) {
  courseDedupToggle.addEventListener('change', () => {
    refreshCourseSelectors();
    renderSyllabusList();
    if (syllabusViewMode === 'calendar') loadCalendar();
  });
}

// Initialize week selector when switching to list view
const origSetSyllabusView = typeof setSyllabusView === 'function' ? setSyllabusView : null;
if (origSetSyllabusView) {
  // Populate week selector on page load
  populateWeekSelector();
}

function getSortedDedupedCourses(forceIds = []) {
  let courses = Array.isArray(allCourses) ? [...allCourses] : [];
  const dedupe = courseDedupToggle?.checked;
  if (dedupe) {
    const seen = new Set();
    courses = courses.filter(c => {
      const key = `${(c.code || '').toLowerCase()}|${(c.term || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Ensure forced ids remain even if deduped away
  forceIds.forEach(fid => {
    if (!courses.find(c => c.id === fid)) {
      const found = allCourses.find(c => c.id === fid);
      if (found) courses.push(found);
    }
  });

  const mode = courseSortMode?.value || 'term';
  if (mode === 'name') {
    courses.sort((a, b) => {
      const nameCmp = (a.name || '').localeCompare(b.name || '');
      if (nameCmp !== 0) return nameCmp;
      return (a.code || '').localeCompare(b.code || '');
    });
  } else {
    courses.sort((a, b) => {
      const termCmp = (b.term || '').localeCompare(a.term || '');
      if (termCmp !== 0) return termCmp;
      return (a.name || '').localeCompare(b.name || '');
    });
  }
  return courses;
}

function buildCourseOptions(courses, includeEmpty = true, emptyLabel = 'All Courses') {
  let html = includeEmpty ? `<option value="">${emptyLabel}</option>` : '';
  html += courses.map((c, idx) => {
    const color = getCourseColor(c, idx);
    return `<option value="${c.id}" style="border-left: 4px solid ${color};">● ${c.code || c.name}${c.term ? ' (' + c.term + ')' : ''}</option>`;
  }).join('');
  return html;
}

function refreshCourseSelectors(forceIds = []) {
  const visible = getSortedDedupedCourses(forceIds);

  const calendarSelect = document.getElementById('calendar-filter-course');
  if (calendarSelect) {
    const prev = calendarSelect.value;
    calendarSelect.innerHTML = buildCourseOptions(visible, true, 'All Courses');
    if (prev) calendarSelect.value = prev;
  }

  const planCourseSelect = document.getElementById('plan-session-course');
  if (planCourseSelect) {
    const prev = planCourseSelect.value;
    planCourseSelect.innerHTML = buildCourseOptions(visible, true, 'Optional');
    if (prev) planCourseSelect.value = prev;
  }

  if (syllabusListCourse) {
    const prev = syllabusListCourse.value;
    syllabusListCourse.innerHTML = buildCourseOptions(visible, true, 'All Courses');
    if (prev) syllabusListCourse.value = prev;
  }

  const editCourseSelect = document.getElementById('edit-event-course');
  if (editCourseSelect) {
    const prev = editCourseSelect.value;
    editCourseSelect.innerHTML = buildCourseOptions(visible, true, 'Select course');
    if (prev) editCourseSelect.value = prev;
  }

  renderCourseColorManager();
}

// Load courses for filters with colors
async function loadCoursesForCalendar() {
  try {
    const res = await fetch('/api/syllabus/courses');
    const data = await res.json();
    if (data.courses) {
      allCourses = data.courses;
      refreshCourseSelectors();
    }
  } catch (error) {
    console.error('Failed to load courses:', error);
  }
}

// Update course color
async function updateCourseColor(courseId, newColor) {
  try {
    const res = await fetch(`/api/syllabus/course/${courseId}/color`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: newColor })
    });
    const data = await res.json();
    if (data.ok) {
      // Update local state
      const course = allCourses.find(c => c.id === courseId);
      if (course) course.color = newColor;
      // Re-render affected components
      renderCourseColorManager();
      renderSyllabusList();
      if (syllabusViewMode === 'calendar') loadCalendar();
    }
  } catch (error) {
    console.error('Failed to update course color:', error);
  }
}

// Render course color manager
function renderCourseColorManager() {
  const container = document.getElementById('course-color-manager');
  if (!container || !allCourses || allCourses.length === 0) return;

  const visibleCourses = getSortedDedupedCourses();

  container.innerHTML = visibleCourses.map((c, idx) => {
    const color = getCourseColor(c, idx);
    return `
      <div class="course-color-item" style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          <div class="color-swatch" 
               style="width: 24px; height: 24px; border-radius: 6px; background: ${color}; cursor: pointer; border: 2px solid rgba(255,255,255,0.2);"
               onclick="showColorPicker(${c.id}, '${color}')"
               title="Click to change color">
          </div>
          <span style="font-weight: 500;">${c.code || c.name}</span>
          <span style="color: var(--text-muted); font-size: 12px;">${c.name !== c.code ? c.name : ''}</span>
        </div>
        <div style="display: flex; gap: 4px;">
          ${COURSE_COLOR_PALETTE.map(pc => `
            <div class="color-option" 
                 style="width: 16px; height: 16px; border-radius: 4px; background: ${pc}; cursor: pointer; border: ${pc === color ? '2px solid white' : '1px solid rgba(255,255,255,0.1)'};"
                 onclick="updateCourseColor(${c.id}, '${pc}')"
                 title="${pc}">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Show color picker modal (for custom colors)
function showColorPicker(courseId, currentColor) {
  const color = prompt(`Enter hex color for this course (current: ${currentColor}):`, currentColor);
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
    updateCourseColor(courseId, color);
  } else if (color !== null) {
    alert('Invalid color format. Use #RRGGBB (e.g., #3B82F6)');
  }
}

// Add planned session
const btnAddPlanned = document.getElementById('btn-add-planned-session');
if (btnAddPlanned) {
  btnAddPlanned.addEventListener('click', async () => {
    const dateInput = document.getElementById('plan-session-date');
    const minutesInput = document.getElementById('plan-session-minutes');
    const courseSelect = document.getElementById('plan-session-course');
    const statusDiv = document.getElementById('plan-session-status');

    if (!dateInput || !dateInput.value) {
      if (statusDiv) statusDiv.innerHTML = '<div class="upload-status error">Please select a date.</div>';
      return;
    }

    try {
      const res = await fetch('/api/calendar/plan_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: dateInput.value,
          planned_minutes: parseInt(minutesInput?.value) || 60,
          course_id: courseSelect?.value ? parseInt(courseSelect.value) : null,
        })
      });
      const data = await res.json();
      if (data.ok) {
        if (statusDiv) statusDiv.innerHTML = '<div class="upload-status success">[OK] Planned session added!</div>';
        if (dateInput) dateInput.value = '';
        if (minutesInput) minutesInput.value = '60';
        if (courseSelect) courseSelect.value = '';
        loadCalendar();
      } else {
        if (statusDiv) statusDiv.innerHTML = `<div class="upload-status error">[ERROR] ${data.message}</div>`;
      }
    } catch (error) {
      if (statusDiv) statusDiv.innerHTML = `<div class="upload-status error">[ERROR] ${error.message}</div>`;
    }
  });
}

// Set today's date as default for plan session date input
const planDateInput = document.getElementById('plan-session-date');
if (planDateInput) {
  planDateInput.value = new Date().toISOString().split('T')[0];
}

// Initialize immediately
async function initDashboard() {
  console.log('[Dashboard] Initializing data...');

  // Restore Scholar run state from sessionStorage
  const storedRunId = restoreScholarRunId();
  if (storedRunId) {
    console.log('[Dashboard] Restoring Scholar run:', storedRunId);
    currentRunId = storedRunId;
    // Start polling immediately; checkRunStatus will clear if stale
    if (!runStatusInterval) {
      runStatusInterval = setInterval(() => checkRunStatus(currentRunId), 2000);
      checkRunStatus(currentRunId);
    }
  }

  // Load Data
  loadStats();
  loadTrends();
  loadScholar();
  loadScholarInsights();  // Load Scholar insights for Overview tab
  if (typeof loadApiKeyStatus === 'function') loadApiKeyStatus();

  // Load courses first, then calendar (courses needed for color rendering)
  await loadCoursesForCalendar();
  loadCalendar();

  // Check Hash for initial tab
  const hash = window.location.hash.substring(1);
  if (hash) {
    openTab(null, hash);
  } else {
    // Default to overview if no hash
    // (The HTML already has 'active' class on Overview button and panel, so strictly not needed, 
    // but safe to ensure sync)
    openTab(null, 'overview');
  }

  // Force all sections collapsed after initial data load
  // This ensures any panels opened by data loading are closed
  setTimeout(() => {
    document.querySelectorAll('details.section-panel').forEach(d => d.removeAttribute('open'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 100);
}


// Chat System for Scholar
window.openScholarChat = function (index, mode = 'clarify', autoSend = false) {
  const panel = document.getElementById(`chat-panel-${index}`);
  const inputEl = document.getElementById(`chat-input-${index}`);
  if (!panel || !inputEl) return;

  chatModes[index] = mode;
  updateChatModeUI(index, mode);
  renderChatHistory(index, mode);

  const history = getChatHistory(index, mode);
  const lastReply = [...history].reverse().find(m => m.role === 'assistant');
  const generatedDiv = document.getElementById(`generated-answer-${index}`);
  const generatedText = document.getElementById(`generated-text-${index}`);
  if (generatedDiv && generatedText) {
    if (lastReply && lastReply.content) {
      generatedText.textContent = lastReply.content;
      generatedDiv.style.display = 'block';
    } else {
      generatedDiv.style.display = 'none';
    }
  }

  panel.style.display = 'block';
  inputEl.focus();

  if (autoSend) {
    const history = getChatHistory(index, mode);
    const scholarQuestion = (currentScholarQuestions[index] || '').trim();
    if (history.length === 0 && scholarQuestion) {
      inputEl.value = scholarQuestion;
      window.sendChatMessage(index);
    }
  }
};

window.toggleChat = function (index) {
  const panel = document.getElementById(`chat-panel-${index}`);
  if (!panel) return;
  if (panel.style.display === 'none' || panel.style.display === '') {
    window.openScholarChat(index, chatModes[index] || 'clarify', false);
  } else {
    panel.style.display = 'none';
  }
};

window.setChatMode = function (index, mode) {
  chatModes[index] = mode;
  updateChatModeUI(index, mode);
  renderChatHistory(index, mode);
  const inputEl = document.getElementById(`chat-input-${index}`);
  if (inputEl) inputEl.focus();
};

// Store chat history with localStorage persistence
const chatHistories = {}; // index -> { clarify: [{role, content}], generate: [{role, content}] }
const chatModes = {}; // index -> 'clarify' | 'generate'
// Simplified chat history per question (unified, no modes)
const scholarChatHistories = {}; // index -> [{role, content}]

// Simplified Scholar question chat function
window.askScholarQuestion = async function (index) {
  const inputEl = document.getElementById(`chat-input-${index}`);
  const responseEl = document.getElementById(`chat-response-${index}`);
  const askBtn = document.getElementById(`btn-ask-${index}`);
  if (!inputEl || !responseEl) return;

  const userMessage = inputEl.value.trim();
  if (!userMessage) return;

  const scholarQuestion = (currentScholarQuestions[index] || '').trim();

  // Initialize history for this question if needed
  if (!scholarChatHistories[index]) {
    scholarChatHistories[index] = [];
  }
  const history = scholarChatHistories[index];

  // Clear placeholder if this is first message
  if (history.length === 0) {
    responseEl.innerHTML = '';
  }

  // Add user message to UI and history
  history.push({ role: 'user', content: userMessage });
  const userDiv = document.createElement('div');
  userDiv.style.cssText = "align-self: flex-end; background: var(--accent); color: #fff; padding: 8px 12px; border-radius: 12px 12px 4px 12px; max-width: 85%; font-size: 13px;";
  userDiv.textContent = userMessage;
  responseEl.appendChild(userDiv);

  // Clear input and disable while loading
  inputEl.value = '';
  inputEl.disabled = true;
  if (askBtn) askBtn.disabled = true;

  // Show loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = "align-self: flex-start; color: var(--text-muted); font-size: 12px; padding: 8px;";
  loadingDiv.textContent = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
  responseEl.appendChild(loadingDiv);
  responseEl.scrollTop = responseEl.scrollHeight;

  try {
    const res = await fetch('/api/scholar/questions/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scholar_question: scholarQuestion,
        clarifying_question: userMessage,
        messages: history
      })
    });
    const data = await res.json();

    // Remove loading indicator
    responseEl.removeChild(loadingDiv);

    if (data.ok) {
      const answer = data.clarification || data.answer || 'No response received.';
      history.push({ role: 'assistant', content: answer });

      const aiDiv = document.createElement('div');
      aiDiv.style.cssText = "align-self: flex-start; background: var(--bg-alt, #1e293b); border: 1px solid var(--border); padding: 8px 12px; border-radius: 12px 12px 12px 4px; max-width: 85%; font-size: 13px; white-space: pre-wrap;";
      aiDiv.textContent = answer;
      responseEl.appendChild(aiDiv);
    } else {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = "align-self: flex-start; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 8px 12px; border-radius: 8px; max-width: 85%; font-size: 12px;";
      errorDiv.textContent = '❌ ' + (data.message || 'Failed to get response');
      responseEl.appendChild(errorDiv);
    }
  } catch (error) {
    responseEl.removeChild(loadingDiv);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = "align-self: flex-start; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 8px 12px; border-radius: 8px; max-width: 85%; font-size: 12px;";
    errorDiv.textContent = '❌ Network error: ' + error.message;
    responseEl.appendChild(errorDiv);
  }

  // Re-enable input
  inputEl.disabled = false;
  if (askBtn) askBtn.disabled = false;
  inputEl.focus();
  responseEl.scrollTop = responseEl.scrollHeight;
};

function saveScholarChatHistory(questionIndex, mode, messages) {
  try {
    localStorage.setItem(`scholar_chat_${questionIndex}_${mode}`, JSON.stringify(messages));
  } catch (e) {
    console.warn('Failed to save chat history:', e);
  }
}

function loadScholarChatHistory(questionIndex, mode) {
  try {
    const saved = localStorage.getItem(`scholar_chat_${questionIndex}_${mode}`);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to load chat history:', e);
    return [];
  }
}

function clearScholarChatHistory(questionIndex, mode) {
  try {
    localStorage.removeItem(`scholar_chat_${questionIndex}_${mode}`);
  } catch (e) {
    console.warn('Failed to clear chat history:', e);
  }
}

window.clearChatAndReset = function (index) {
  const mode = chatModes[index] || 'clarify';
  clearScholarChatHistory(index, mode);
  if (chatHistories[index] && chatHistories[index][mode]) {
    chatHistories[index][mode] = [];
  }
  renderChatHistory(index, mode);
  const generatedDiv = document.getElementById(`generated-answer-${index}`);
  if (generatedDiv) {
    generatedDiv.style.display = 'none';
  }
};

function getChatHistory(index, mode) {
  if (!chatHistories[index]) {
    chatHistories[index] = { clarify: [], generate: [] };
  }
  if (!chatHistories[index][mode]) {
    chatHistories[index][mode] = [];
  }
  // Load from localStorage on first access if empty
  if (chatHistories[index][mode].length === 0) {
    const saved = loadScholarChatHistory(index, mode);
    if (saved.length > 0) {
      chatHistories[index][mode] = saved;
    }
  }
  return chatHistories[index][mode];
}

function updateChatModeUI(index, mode) {
  const clarifyBtn = document.getElementById(`chat-mode-clarify-${index}`);
  const generateBtn = document.getElementById(`chat-mode-generate-${index}`);
  if (!clarifyBtn || !generateBtn) return;

  const setActive = (btn) => {
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--accent)';
  };
  const setInactive = (btn) => {
    btn.style.background = 'var(--card-bg)';
    btn.style.color = 'var(--text-secondary)';
    btn.style.borderColor = 'var(--border)';
  };

  if (mode === 'generate') {
    setActive(generateBtn);
    setInactive(clarifyBtn);
  } else {
    setActive(clarifyBtn);
    setInactive(generateBtn);
  }
}

function renderChatHistory(index, mode) {
  const historyEl = document.getElementById(`chat-history-${index}`);
  if (!historyEl) return;

  historyEl.innerHTML = '';
  const history = getChatHistory(index, mode);
  history.forEach((msg) => {
    const div = document.createElement('div');
    if (msg.role === 'user') {
      div.style.cssText = "align-self: flex-end; background: var(--accent-light); color: var(--accent); padding: 6px 10px; border-radius: 12px 12px 0 12px; max-width: 85%;";
    } else {
      div.style.cssText = "align-self: flex-start; background: var(--bg); border: 1px solid var(--border); padding: 6px 10px; border-radius: 12px 12px 12px 0; max-width: 85%;";
    }
    div.textContent = msg.content;
    historyEl.appendChild(div);
  });
  historyEl.scrollTop = historyEl.scrollHeight;
}

window.sendChatMessage = async function (index) {
  const inputEl = document.getElementById(`chat-input-${index}`);
  const historyEl = document.getElementById(`chat-history-${index}`);
  if (!inputEl || !historyEl) return;
  const msg = inputEl.value.trim();

  if (!msg) return;

  const mode = chatModes[index] || 'clarify';
  const history = getChatHistory(index, mode);
  const scholarQuestion = (currentScholarQuestions[index] || '').trim();

  // Add User Message
  history.push({ role: 'user', content: msg });
  saveScholarChatHistory(index, mode, history);

  // Render user message
  const userDiv = document.createElement('div');
  userDiv.style.cssText = "align-self: flex-end; background: var(--accent-light); color: var(--accent); padding: 6px 10px; border-radius: 12px 12px 0 12px; max-width: 85%;";
  userDiv.textContent = msg;
  historyEl.appendChild(userDiv);

  inputEl.value = '';
  inputEl.disabled = true;

  // Show loading
  const loadingDiv = document.createElement('div');
  loadingDiv.textContent = '...';
  loadingDiv.style.cssText = "align-self: flex-start; color: var(--text-muted); font-size: 10px; margin-left: 4px;";
  historyEl.appendChild(loadingDiv);
  historyEl.scrollTop = historyEl.scrollHeight;

  try {
    const endpoint = mode === 'generate'
      ? '/api/scholar/questions/generate'
      : '/api/scholar/questions/clarify';
    const payload = mode === 'generate'
      ? {
        question: msg,
        context: scholarQuestion ? `Primary Scholar Question: ${scholarQuestion}` : '',
        messages: history
      }
      : {
        scholar_question: scholarQuestion,
        clarifying_question: msg, // Legacy
        messages: history
      };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    historyEl.removeChild(loadingDiv); // Remove loading

    if (data.ok) {
      const answer = data.answer || data.clarification || '';
      history.push({ role: 'assistant', content: answer });
      saveScholarChatHistory(index, mode, history);

      const aiDiv = document.createElement('div');
      aiDiv.style.cssText = "align-self: flex-start; background: var(--bg); border: 1px solid var(--border); padding: 6px 10px; border-radius: 12px 12px 12px 0; max-width: 85%;";
      aiDiv.textContent = answer;
      historyEl.appendChild(aiDiv);

      const generatedDiv = document.getElementById(`generated-answer-${index}`);
      const generatedText = document.getElementById(`generated-text-${index}`);
      if (generatedDiv && generatedText && answer) {
        generatedText.textContent = answer;
        generatedDiv.style.display = 'block';
      }
    } else {
      alert('Error: ' + data.message);
    }
  } catch (e) {
    historyEl.removeChild(loadingDiv);
    alert('Network error: ' + e.message);
  } finally {
    inputEl.disabled = false;
    inputEl.focus();
    historyEl.scrollTop = historyEl.scrollHeight;
  }
};

// ============================================
// BRAIN TAB FUNCTIONS
// ============================================

async function loadBrainStatus() {
  try {
    const resp = await fetch('/api/brain/status');
    const data = await resp.json();
    if (data.ok) {
      document.getElementById('brain-session-count').textContent = data.stats.sessions;
      document.getElementById('brain-event-count').textContent = data.stats.events;
      document.getElementById('brain-rag-count').textContent = data.stats.rag_documents;
      document.getElementById('brain-pending-cards').textContent = data.stats.pending_cards;
      document.getElementById('brain-db-size').textContent = data.stats.db_size_mb;
    }
  } catch (err) {
    console.error('Error loading brain status:', err);
  }
}

async function loadBrainMastery() {
  try {
    const resp = await fetch('/api/mastery');
    const data = await resp.json();
    const container = document.getElementById('brain-mastery-list');
    if (data.mastery && data.mastery.length > 0) {
      container.innerHTML = data.mastery.map(m =>
        `<div class="mastery-item" style="padding: 8px 0; border-bottom: 1px solid var(--border);">
          <strong style="color: var(--text-primary);">${m.topic}</strong>: 
          <span style="color: ${m.level === 'Strong' ? 'var(--success)' : m.level === 'Weak' ? 'var(--error)' : 'var(--text-secondary)'};">${m.level}</span> 
          <span style="color: var(--text-muted);">(${m.sessions} sessions)</span>
        </div>`
      ).join('');
    } else {
      container.innerHTML = '<p style="color: var(--text-muted);">No mastery data yet. Complete study sessions to build mastery.</p>';
    }
  } catch (err) {
    document.getElementById('brain-mastery-list').innerHTML = '<p style="color: var(--error);">Error loading mastery data.</p>';
  }
}

function loadBrain() {
  loadBrainStatus();
  loadBrainMastery();
  loadAnkiPendingCount();
}

// ============================================
// ANKI CARD MANAGEMENT FUNCTIONS
// ============================================

// Track Anki connection status
let ankiConnected = false;

/**
 * Check if Anki is connected via AnkiConnect and update status indicator.
 */
async function loadAnkiStatus() {
  const statusEl = document.getElementById('anki-status');
  const statusText = document.getElementById('anki-status-text');
  const syncBtn = document.getElementById('anki-sync-btn');

  if (!statusEl) return;

  try {
    // Try to check if anki sync endpoint is reachable
    const resp = await fetch('/api/cards/drafts/pending');
    const data = await resp.json();

    if (data.ok) {
      ankiConnected = true;
      statusEl.className = 'status-indicator connected';
      if (statusText) statusText.textContent = 'Ready';
      if (syncBtn) syncBtn.disabled = false;
    } else {
      ankiConnected = false;
      statusEl.className = 'status-indicator disconnected';
      if (statusText) statusText.textContent = 'Error';
      if (syncBtn) syncBtn.disabled = true;
    }
  } catch (err) {
    ankiConnected = false;
    statusEl.className = 'status-indicator disconnected';
    if (statusText) statusText.textContent = 'Disconnected';
    if (syncBtn) syncBtn.disabled = true;
    console.warn('Anki status check failed:', err);
  }
}

/**
 * Load pending card count and update badge.
 */
async function loadAnkiPendingCount() {
  const badge = document.getElementById('anki-pending-count');
  if (!badge) return;

  try {
    const resp = await fetch('/api/cards/drafts/pending');
    const data = await resp.json();

    if (data.ok) {
      const count = data.pending_count || 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.warn('Failed to load pending count:', err);
    badge.style.display = 'none';
  }
}

/**
 * Fetch card drafts from API and render in table.
 */
async function loadAnkiDrafts(statusFilter = '') {
  const tbody = document.getElementById('anki-drafts-body');
  const emptyMsg = document.getElementById('anki-drafts-empty');
  const statusEl = document.getElementById('anki-drafts-status');

  if (!tbody) return;

  // Show loading state
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Loading drafts...</td></tr>';
  if (emptyMsg) emptyMsg.style.display = 'none';

  try {
    let url = '/api/cards/drafts?limit=100';
    if (statusFilter) {
      url += `&status=${encodeURIComponent(statusFilter)}`;
    }

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.ok) {
      throw new Error(data.message || 'Failed to load drafts');
    }

    const drafts = data.drafts || [];

    if (drafts.length === 0) {
      tbody.innerHTML = '';
      if (emptyMsg) {
        emptyMsg.style.display = 'block';
        emptyMsg.textContent = statusFilter
          ? `No ${statusFilter} cards found.`
          : 'No card drafts yet. Create cards from Tutor sessions or use the form below.';
      }
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    tbody.innerHTML = drafts.map(draft => {
      const frontPreview = (draft.front || '').substring(0, 60) + ((draft.front || '').length > 60 ? '...' : '');
      const backPreview = (draft.back || '').substring(0, 60) + ((draft.back || '').length > 60 ? '...' : '');

      const statusClass = {
        'pending': 'badge-warning',
        'approved': 'badge-success',
        'rejected': 'badge-error',
        'synced': 'badge-info'
      }[draft.status] || 'badge-default';

      const actionButtons = draft.status === 'pending'
        ? `<button class="btn btn-sm btn-success" onclick="approveCard(${draft.id})" title="Approve"><i class="fas fa-check"></i></button>
           <button class="btn btn-sm btn-error" onclick="rejectCard(${draft.id})" title="Reject">✗</button>`
        : draft.status === 'approved'
          ? `<button class="btn btn-sm" onclick="rejectCard(${draft.id})" title="Reject">✗</button>`
          : '';

      return `<tr data-card-id="${draft.id}">
        <td style="max-width: 200px;" title="${(draft.front || '').replace(/"/g, '&quot;')}">${frontPreview}</td>
        <td style="max-width: 200px;" title="${(draft.back || '').replace(/"/g, '&quot;')}">${backPreview}</td>
        <td><span class="badge ${statusClass}">${draft.status}</span></td>
        <td>${draft.deck_name || 'Default'}</td>
        <td class="actions-cell">${actionButtons}</td>
      </tr>`;
    }).join('');

    // Update status
    if (statusEl) {
      statusEl.textContent = `Showing ${drafts.length} drafts`;
    }

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--error);">Error: ${err.message}</td></tr>`;
    console.error('Failed to load Anki drafts:', err);
  }
}

/**
 * Approve a card draft (PATCH to update status).
 */
async function approveCard(cardId) {
  try {
    const resp = await fetch(`/api/cards/drafts/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });

    const data = await resp.json();

    if (data.ok) {
      showStatus('anki-drafts-status', 'Card approved!', 'success');
      loadAnkiDrafts();
      loadAnkiPendingCount();
    } else {
      showStatus('anki-drafts-status', `Error: ${data.message}`, 'error');
    }
  } catch (err) {
    showStatus('anki-drafts-status', `Error: ${err.message}`, 'error');
    console.error('Failed to approve card:', err);
  }
}

/**
 * Reject a card draft (PATCH to update status).
 */
async function rejectCard(cardId) {
  if (!confirm('Reject this card draft? It will not be synced to Anki.')) {
    return;
  }

  try {
    const resp = await fetch(`/api/cards/drafts/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' })
    });

    const data = await resp.json();

    if (data.ok) {
      showStatus('anki-drafts-status', 'Card rejected.', 'warning');
      loadAnkiDrafts();
      loadAnkiPendingCount();
    } else {
      showStatus('anki-drafts-status', `Error: ${data.message}`, 'error');
    }
  } catch (err) {
    showStatus('anki-drafts-status', `Error: ${err.message}`, 'error');
    console.error('Failed to reject card:', err);
  }
}

/**
 * Sync approved cards to Anki via AnkiConnect.
 */
async function syncToAnki(dryRun = false) {
  const syncBtn = document.getElementById('anki-sync-btn');
  const statusEl = document.getElementById('anki-sync-status');

  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.textContent = dryRun ? 'Previewing...' : 'Syncing...';
  }

  showStatus('anki-sync-status', dryRun ? 'Checking cards...' : 'Syncing to Anki...', 'info');

  try {
    const resp = await fetch('/api/cards/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: dryRun })
    });

    const data = await resp.json();

    if (data.ok) {
      const syncedCount = data.synced_count || 0;
      const errors = data.errors || [];

      if (dryRun) {
        showStatus('anki-sync-status', `Preview: ${syncedCount} cards ready to sync`, 'info');
      } else if (syncedCount > 0) {
        showStatus('anki-sync-status', `<i class="fas fa-check"></i> Synced ${syncedCount} cards to Anki!`, 'success');
        loadAnkiDrafts();
        loadAnkiPendingCount();
        loadBrainStatus();
      } else if (errors.length > 0) {
        showStatus('anki-sync-status', `<i class="fas fa-exclamation-triangle"></i> Sync completed with errors: ${errors.join(', ')}`, 'warning');
      } else {
        showStatus('anki-sync-status', 'No approved cards to sync.', 'info');
      }
    } else {
      showStatus('anki-sync-status', `Error: ${data.message}`, 'error');
    }
  } catch (err) {
    showStatus('anki-sync-status', `Error: ${err.message}`, 'error');
    console.error('Failed to sync to Anki:', err);
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.textContent = 'Sync to Anki';
    }
  }
}

/**
 * Handle new card draft form submission.
 */
async function createCardDraft(event) {
  if (event) event.preventDefault();

  const form = document.getElementById('anki-create-form');
  if (!form) return;

  const frontEl = document.getElementById('anki-card-front');
  const backEl = document.getElementById('anki-card-back');
  const typeEl = document.getElementById('anki-card-type');
  const deckEl = document.getElementById('anki-card-deck');
  const courseEl = document.getElementById('anki-card-course');
  const tagsEl = document.getElementById('anki-card-tags');

  const front = (frontEl?.value || '').trim();
  const back = (backEl?.value || '').trim();
  const cardType = typeEl?.value || 'basic';
  const deckName = (deckEl?.value || '').trim() || 'PT Study::Default';
  const courseId = courseEl?.value ? parseInt(courseEl.value) : null;
  const tags = (tagsEl?.value || '').trim();

  if (!front || !back) {
    showStatus('anki-create-status', 'Front and Back are required.', 'error');
    return;
  }

  showStatus('anki-create-status', 'Creating card draft...', 'info');

  try {
    const payload = {
      front,
      back,
      card_type: cardType,
      deck_name: deckName,
      tags
    };
    if (courseId) payload.course_id = courseId;

    const resp = await fetch('/api/cards/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (data.ok) {
      showStatus('anki-create-status', `<i class="fas fa-check"></i> Card draft created (ID: ${data.card_id})`, 'success');
      // Clear form
      if (frontEl) frontEl.value = '';
      if (backEl) backEl.value = '';
      if (tagsEl) tagsEl.value = '';
      // Refresh lists
      loadAnkiDrafts();
      loadAnkiPendingCount();
    } else {
      showStatus('anki-create-status', `Error: ${data.message}`, 'error');
    }
  } catch (err) {
    showStatus('anki-create-status', `Error: ${err.message}`, 'error');
    console.error('Failed to create card draft:', err);
  }
}

/**
 * Filter drafts by status using dropdown.
 */
function filterAnkiDrafts() {
  const filterEl = document.getElementById('anki-filter-status');
  const status = filterEl?.value || '';
  loadAnkiDrafts(status);
}

/**
 * Initialize Anki section event listeners.
 */
function initAnkiSection() {
  // Form submission
  const form = document.getElementById('anki-create-form');
  if (form) {
    form.addEventListener('submit', createCardDraft);
  }

  // Sync button
  const syncBtn = document.getElementById('anki-sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => syncToAnki(false));
  }

  // Preview sync button
  const previewBtn = document.getElementById('anki-preview-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => syncToAnki(true));
  }

  // Filter dropdown
  const filterEl = document.getElementById('anki-filter-status');
  if (filterEl) {
    filterEl.addEventListener('change', filterAnkiDrafts);
  }

  // Refresh button
  const refreshBtn = document.getElementById('anki-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAnkiStatus();
      loadAnkiDrafts();
      loadAnkiPendingCount();
    });
  }

  // Observe when Anki section becomes visible (for lazy loading)
  const ankiSection = document.getElementById('anki-cards-section');
  if (ankiSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadAnkiStatus();
          loadAnkiDrafts();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(ankiSection);
  }
}

// Initialize Anki section on DOM ready
document.addEventListener('DOMContentLoaded', initAnkiSection);

// ============================================
// SCHOLAR DIGEST SAVE FUNCTION
// ============================================

async function saveStrategicDigest() {
  const digestEl = document.getElementById('scholar-digest-text');
  if (!digestEl) {
    alert('No digest content found. Please generate a digest first.');
    return;
  }
  const content = digestEl.innerText || digestEl.textContent;
  if (!content.trim()) {
    alert('Digest is empty. Please generate a digest first.');
    return;
  }

  try {
    const resp = await fetch('/api/scholar/digest/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digest: content })
    });
    const data = await resp.json();
    if (data.ok) {
      alert('Digest saved to: ' + data.file);
      // Refresh the saved digests list
      if (typeof loadSavedDigests === 'function') {
        loadSavedDigests();
      }
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Error saving digest: ' + err.message);
  }
}

// ============================================
// SAVED DIGESTS FUNCTIONS
// ============================================

async function loadSavedDigests() {
  const listContainer = document.getElementById('saved-digests-list');
  const countEl = document.getElementById('saved-digests-count');

  if (!listContainer) return;

  listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading saved digests...</div>';

  try {
    const res = await fetch('/api/scholar/digests');
    const data = await res.json();

    if (!data.ok) {
      listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Failed to load digests.</div>';
      return;
    }

    const digests = data.digests || [];
    if (countEl) {
      countEl.textContent = `(${digests.length})`;
    }

    if (digests.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No saved digests yet. Generate and save a digest to see it here.</div>';
      return;
    }

    // Render digests as a table
    listContainer.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left;">
            <th style="padding: 8px 12px; color: var(--text-muted); font-weight: 600;">Title</th>
            <th style="padding: 8px 12px; color: var(--text-muted); font-weight: 600; width: 100px;">Type</th>
            <th style="padding: 8px 12px; color: var(--text-muted); font-weight: 600; width: 140px;">Date</th>
            <th style="padding: 8px 12px; color: var(--text-muted); font-weight: 600; width: 100px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${digests.map(d => {
      const date = d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
      const typeLabel = d.digest_type === 'strategic' ? '🧠 Strategic' : d.digest_type || 'Other';
      return `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 10px 12px;">
                  <div style="color: var(--text-primary); font-weight: 500; cursor: pointer;" onclick="viewDigest(${d.id})">${escapeHtml(d.title || 'Untitled')}</div>
                  <div style="color: var(--text-muted); font-size: 11px; font-family: monospace;">${escapeHtml(d.filename || '')}</div>
                </td>
                <td style="padding: 10px 12px; color: var(--text-secondary);">${typeLabel}</td>
                <td style="padding: 10px 12px; color: var(--text-secondary);">${date}</td>
                <td style="padding: 10px 12px;">
                  <div style="display: flex; gap: 4px;">
                    <button class="btn" style="font-size: 11px; padding: 4px 8px;" onclick="viewDigest(${d.id})">View</button>
                    <button class="btn" style="font-size: 11px; padding: 4px 8px; color: #ef4444;" onclick="deleteDigest(${d.id}, '${escapeHtml(d.title || 'this digest')}')">Delete</button>
                  </div>
                </td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Failed to load saved digests:', err);
    listContainer.innerHTML = '<div style="color: #ef4444; font-size: 13px;">Error loading digests.</div>';
  }
}

async function viewDigest(digestId) {
  const modal = document.getElementById('digest-viewer-modal');
  const titleEl = document.getElementById('digest-viewer-title');
  const contentEl = document.getElementById('digest-viewer-content');

  if (!modal || !titleEl || !contentEl) {
    alert('Digest viewer not available');
    return;
  }

  // Show modal with loading state
  modal.style.display = 'flex';
  titleEl.textContent = 'Loading...';
  contentEl.textContent = 'Loading digest content...';

  try {
    const res = await fetch(`/api/scholar/digests/${digestId}`);
    const data = await res.json();

    if (!data.ok) {
      titleEl.textContent = 'Error';
      contentEl.textContent = data.message || 'Failed to load digest.';
      return;
    }

    const digest = data.digest;
    titleEl.textContent = digest.title || 'Untitled Digest';
    contentEl.textContent = digest.content || '(No content)';
  } catch (err) {
    console.error('Failed to view digest:', err);
    titleEl.textContent = 'Error';
    contentEl.textContent = 'Failed to load digest: ' + err.message;
  }
}

function closeDigestViewer() {
  const modal = document.getElementById('digest-viewer-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function deleteDigest(digestId, title) {
  if (!confirm(`Are you sure you want to delete "${title}"? This will remove the file from disk.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/scholar/digests/${digestId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.ok) {
      // Refresh the list
      loadSavedDigests();
    } else {
      alert('Failed to delete: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Failed to delete digest:', err);
    alert('Failed to delete digest: ' + err.message);
  }
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
  const modal = document.getElementById('digest-viewer-modal');
  if (modal && e.target === modal) {
    closeDigestViewer();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeDigestViewer();
  }
});

// Missing Function: loadSyllabusDashboard
window.loadSyllabusDashboard = async function () {
  console.log("Loading Syllabus Dashboard...");
  try {
    // Load Study Tasks first (most visible section)
    if (typeof loadStudyTasks === 'function') {
      loadStudyTasks();
    }

    // Courses
    const resCourses = await fetch('/api/syllabus/courses');
    const coursesData = await resCourses.json();
    if (coursesData.courses) {
      allCourses = coursesData.courses;
      refreshCourseSelectors();
    }

    // Events for list view
    const resEvents = await fetch('/api/syllabus/events');
    const eventsData = await resEvents.json();
    if (eventsData.ok) {
      syllabusEvents = (eventsData.events || []).map(ev => {
        const course = allCourses.find(c => c.id === ev.course_id) || {};
        return { ...ev, course };
      });
      renderSyllabusList();
    }

    // Ensure calendar data is loaded
    loadCalendar();
  } catch (e) {
    console.error("Failed to load syllabus dashboard:", e);
  }
};

// Run immediately
console.log("%c Dashboard JS v2.1 LOADED ", "background: #22c55e; color: #ffffff; font-size: 20px; font-weight: bold;");
initDashboard();

document.addEventListener('DOMContentLoaded', () => {
  // 1. Progress Ring Helper
  const circle = document.getElementById('progress-circle');
  // Circumference = 2 * PI * r (r=26)  163.36
  const circumference = 163.36;

  function setScore(percent) {
    if (!circle) return;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    const label = document.getElementById('avg-score');
    if (label) label.textContent = `${percent}%`;
  }

  // Test Init (remove if you load real data immediately)
  setScore(0);

  // 2. Chart.js Init - Store globally for updates from API
  const ctx = document.getElementById('modeChart');
  if (ctx) {
    modeChartInstance = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Loading...'],
        datasets: [{
          data: [100],
          backgroundColor: ['#2D3340'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }

  // 3. Upload Click Trigger
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
  }

  // 4. Load sync status on page load
  loadSyncStatus();
});

/* ===== Sync/Ingestion Management ===== */
async function loadSyncStatus() {
  try {
    const resp = await fetch('/api/sync/status');
    if (!resp.ok) {
      console.warn('Sync status endpoint not available');
      return;
    }
    const data = await resp.json();
    const filesEl = document.getElementById('sync-files-count');
    const sessionsEl = document.getElementById('sync-sessions-count');
    const timeEl = document.getElementById('sync-last-time');

    if (filesEl) filesEl.textContent = data.files_tracked || 0;
    if (sessionsEl) sessionsEl.textContent = data.valid_sessions || 0;
    if (timeEl) timeEl.textContent = data.last_sync || 'Never';
  } catch (e) {
    console.warn('Failed to load sync status:', e);
  }
}

async function runSync(force = false) {
  const msgEl = document.getElementById('sync-message');
  if (!msgEl) return;

  msgEl.textContent = force ? 'Force re-syncing all files...' : 'Syncing...';
  msgEl.style.color = 'var(--text-muted)';

  try {
    const resp = await fetch('/api/sync/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: force })
    });
    const data = await resp.json();

    if (data.ok) {
      msgEl.textContent = `<i class="fas fa-check"></i> Done: ${data.ingested || 0} ingested, ${data.skipped || 0} skipped`;
      msgEl.style.color = 'var(--success)';
      // Refresh status and stats
      loadSyncStatus();
      if (typeof loadStats === 'function') loadStats();
      if (typeof loadOverviewData === 'function') loadOverviewData();
      if (typeof loadBrainStatus === 'function') loadBrainStatus();
    } else {
      msgEl.textContent = '✗ Error: ' + (data.error || 'Unknown error');
      msgEl.style.color = 'var(--error)';
    }
  } catch (e) {
    msgEl.textContent = '✗ Network error: ' + e.message;
    msgEl.style.color = 'var(--error)';
  }
}

async function clearSyncTracking() {
  if (!confirm('Clear all ingestion tracking? This will cause all files to be re-processed on next sync.')) {
    return;
  }

  try {
    const resp = await fetch('/api/sync/clear-tracking', { method: 'POST' });
    const data = await resp.json();
    if (data.ok) {
      alert('Tracking cleared. Run sync to re-ingest all files.');
      loadSyncStatus();
    } else {
      alert('Error: ' + (data.error || 'Unknown'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}


// ============================================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================================

/**
 * Check Google Calendar authentication status
 */
async function checkGCalStatus() {
  try {
    const response = await fetch('/api/gcal/status');
    const data = await response.json();

    const badge = document.getElementById('gcal-status-badge');
    const authSection = document.getElementById('gcal-auth-section');
    const syncSection = document.getElementById('gcal-sync-section');

    if (!badge || !authSection || !syncSection) return;

    if (data.connected) {
      badge.textContent = 'Connected';
      badge.style.background = 'var(--success)';
      badge.style.color = 'white';
      authSection.style.display = 'none';
      syncSection.style.display = 'block';
      document.getElementById('gcal-user-email').textContent = data.email || data.id;
    } else {
      badge.textContent = 'Not Connected';
      badge.style.background = 'var(--surface-3)';
      badge.style.color = 'var(--text-secondary)';
      authSection.style.display = 'block';
      syncSection.style.display = 'none';
    }
  } catch (error) {
    console.error('GCal status check failed:', error);
  }
}

/**
 * Start Google Calendar OAuth flow
 */
async function connectGoogleCalendar() {
  try {
    const response = await fetch('/api/gcal/auth/start');
    const data = await response.json();

    if (data.error) {
      alert('Error: ' + data.error);
      return;
    }

    // Open OAuth popup
    const popup = window.open(
      data.auth_url,
      'gcal-auth',
      'width=500,height=600,menubar=no,toolbar=no'
    );

    // Listen for auth completion
    window.addEventListener('message', function handler(event) {
      if (event.data?.type === 'gcal-auth-success') {
        window.removeEventListener('message', handler);
        checkGCalStatus();
        if (typeof loadCalendar === 'function') loadCalendar(); // Refresh calendar
      }
    });
  } catch (error) {
    console.error('GCal connect failed:', error);
    alert('Failed to start Google Calendar connection');
  }
}

/**
 * Manually sync Google Calendar events
 */
async function syncGoogleCalendar() {
  const statusEl = document.getElementById('gcal-sync-status');
  const btn = document.getElementById('btn-gcal-sync');

  if (!btn || !statusEl) return;

  btn.disabled = true;
  btn.textContent = 'Syncing...';
  statusEl.textContent = '';

  try {
    const response = await fetch('/api/gcal/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();

    if (data.success) {
      statusEl.textContent = `<i class="fas fa-check"></i> Imported ${data.imported} events, skipped ${data.skipped} duplicates`;
      statusEl.style.color = 'var(--success)';
      if (typeof loadCalendar === 'function') loadCalendar(); // Refresh calendar
    } else {
      statusEl.textContent = '✗ ' + (data.error || 'Sync failed');
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    statusEl.textContent = '✗ Sync failed: ' + error.message;
    statusEl.style.color = 'var(--error)';
  } finally {
    btn.disabled = false;
    btn.textContent = '📅 Sync Calendar';
  }
}

/**
 * Disconnect Google Calendar
 */
async function disconnectGoogleCalendar() {
  if (!confirm('Disconnect Google Calendar? Synced events will remain in the database.')) {
    return;
  }

  try {
    await fetch('/api/gcal/revoke', { method: 'POST' });
    checkGCalStatus();
  } catch (error) {
    console.error('GCal disconnect failed:', error);
  }
}

/**
 * Manually sync Google Tasks
 */
async function syncGoogleTasks() {
  const statusEl = document.getElementById('gcal-sync-status');
  const btn = document.getElementById('btn-gtasks-sync');

  btn.disabled = true;
  btn.textContent = 'Syncing Tasks...';
  statusEl.textContent = '';

  try {
    const response = await fetch('/api/gtasks/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();

    if (data.success) {
      statusEl.textContent = `<i class="fas fa-check"></i> Imported ${data.imported} tasks, skipped ${data.skipped} duplicates`;
      statusEl.style.color = 'var(--success)';
      loadCalendar(); // Refresh calendar
    } else {
      statusEl.textContent = '✗ ' + (data.error || 'Tasks sync failed');
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    statusEl.textContent = '✗ Tasks sync failed: ' + error.message;
    statusEl.style.color = 'var(--error)';
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Sync Tasks';
  }
}

// Initialize GCal UI on page load
document.addEventListener('DOMContentLoaded', function () {
  // Check GCal status
  checkGCalStatus();

  // Attach event listeners for main GCal panel
  document.getElementById('btn-gcal-connect')?.addEventListener('click', connectGoogleCalendar);
  document.getElementById('btn-gcal-sync')?.addEventListener('click', syncGoogleCalendar);
  document.getElementById('btn-gtasks-sync')?.addEventListener('click', syncGoogleTasks);
  document.getElementById('btn-gcal-disconnect')?.addEventListener('click', disconnectGoogleCalendar);
});

async function runBlackboardScraper() {
  const btn = document.getElementById('btn-run-scraper');
  if (!btn) return;

  if (!confirm('Run the Blackboard scraper now? This may take 1-2 minutes to complete.')) return;

  const originalText = btn.textContent;
  btn.textContent = 'Starting...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/scraper/run', { method: 'POST' });
    const data = await res.json();

    if (data.ok) {
      btn.textContent = 'Running...';
      showStatus('sync-count-badge', 'Scraper started', 'success'); // Hack reuse badge or just alert
      alert('Scraper started in background. The Sync Inbox will update automatically when items arrive.');

      // Timeout to restore button
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = originalText;
      }, 5000);

    } else {
      alert('Error: ' + data.message);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  } catch (e) {
    alert('Network error: ' + e.message);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============================================
// SYNC INBOX LOGIC (Restored)
// ============================================

// Sync Inbox Polling
document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateSyncCount === 'function') {
    updateSyncCount();
    setInterval(updateSyncCount, 60000); // Check every minute
  }
});

async function loadSyncPending() {
  const tbody = document.getElementById('sync-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading pending items...</td></tr>';

  try {
    const res = await fetch('/api/sync/pending');
    const data = await res.json();

    if (data.ok && data.items.length > 0) {
      renderSyncItems(data.items);
      updateSyncCount(data.items.length);
    } else {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6">
            <div class="empty-state">
              <span class="empty-state-icon">📥</span>
              <h3 class="empty-state-title">Your inbox is empty</h3>
              <p class="empty-state-hint">New scraped items will appear here for verification.</p>
            </div>
          </td>
        </tr>`;
      updateSyncCount(0);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--error);">Error loading inbox: ${e.message}</td></tr>`;
  }
}

function renderSyncItems(items) {
  const tbody = document.getElementById('sync-tbody');
  tbody.innerHTML = items.map(item => {
    let typeClass = 'badge-neutral';
    if (item.type === 'assignment' || item.type === 'quiz') typeClass = 'badge-drill';
    if (item.type === 'material') typeClass = 'badge-core';
    if (item.type === 'announcement') typeClass = 'badge-sprint';

    return `
      <tr id="sync-row-${item.id}">
        <td><span class="badge ${typeClass}">${item.type}</span></td>
        <td><span style="font-weight:600;">${item.course_name}</span></td>
        <td>${item.title}</td>
        <td style="font-size:12px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.raw_text || ''}">
          ${item.raw_text || (item.source_url ? `<a href="${item.source_url}" target="_blank">View File</a>` : 'No details')}
        </td>
        <td style="font-size:12px;">
          ${item.date ? `<div>On: ${item.date}</div>` : ''}
          ${item.due_date ? `<div style="color:var(--error);">Due: ${item.due_date}</div>` : ''}
          <div style="font-size:10px; color:var(--text-muted);">Scraped: ${new Date(item.scraped_at).toLocaleDateString()}</div>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" onclick="resolveSyncItem(${item.id}, 'approve')" style="font-size:11px; padding:4px 8px;">Approve</button>
            <button class="btn" onclick="resolveSyncItem(${item.id}, 'ignore')" style="font-size:11px; padding:4px 8px;">Ignore</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function resolveSyncItem(id, action) {
  const row = document.getElementById(`sync-row-${id}`);
  if (row) row.style.opacity = '0.5';

  try {
    const res = await fetch('/api/sync/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    });
    const data = await res.json();
    if (data.ok) {
      if (row) row.remove();
      const tbody = document.getElementById('sync-tbody');
      if (tbody && tbody.children.length === 0) {
        loadSyncPending();
      } else {
        updateSyncCount();
      }
    } else {
      alert('Error: ' + data.message);
      if (row) row.style.opacity = '1';
    }
  } catch (e) {
    alert('Network error: ' + e.message);
    if (row) row.style.opacity = '1';
  }
}

async function updateSyncCount(countOverride = null) {
  const badge = document.getElementById('sync-count-badge');
  if (!badge) return;

  let count = countOverride;
  if (count === null) {
    try {
      const res = await fetch('/api/sync/pending');
      const data = await res.json();
      count = data.items ? data.items.length : 0;
    } catch (e) {
      return;
    }
  }

  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}
