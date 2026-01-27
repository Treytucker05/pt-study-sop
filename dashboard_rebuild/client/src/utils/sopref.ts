/**
 * SOPRef Link Parser and Navigator
 * 
 * Handles parsing and navigation for SOP reference links in Scholar content.
 * Format: SOPRef[path/to/file.md] or SOPRef[path/to/file.md#section]
 */

export interface SOPRefLink {
  raw: string;
  path: string;
  section?: string;
  displayText: string;
}

export function parseSOPRefs(content: string): SOPRefLink[] {
  const pattern = /SOPRef\[([\w\-\/\.#]+)\]/g;
  const matches: SOPRefLink[] = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const fullPath = match[1];
    const [path, section] = fullPath.split("#");
    
    matches.push({
      raw: match[0],
      path,
      section,
      displayText: path.split("/").pop() || path,
    });
  }

  return matches;
}

export function renderSOPRefLinks(content: string, onNavigate: (path: string, section?: string) => void): string {
  const refs = parseSOPRefs(content);
  let rendered = content;

  refs.forEach((ref) => {
    const linkId = `sopref-${ref.path.replace(/[\/\.]/g, "-")}${ref.section ? `-${ref.section}` : ""}`;
    const linkHtml = `<a 
      id="${linkId}" 
      href="#" 
      class="sopref-link text-primary hover:text-primary/80 underline font-terminal text-xs"
      data-path="${ref.path}"
      ${ref.section ? `data-section="${ref.section}"` : ""}
      title="Open ${ref.path}${ref.section ? ` (section: ${ref.section})` : ""}"
    >
      ${ref.displayText}${ref.section ? ` §${ref.section}` : ""}
    </a>`;
    
    rendered = rendered.replace(ref.raw, linkHtml);
  });

  return rendered;
}

export function setupSOPRefNavigation(containerElement: HTMLElement, onNavigate: (path: string, section?: string) => void) {
  const links = containerElement.querySelectorAll(".sopref-link");
  
  links.forEach((link) => {
    const htmlLink = link as HTMLAnchorElement;
    const path = htmlLink.dataset.path;
    const section = htmlLink.dataset.section;
    
    htmlLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (path) {
        onNavigate(path, section);
      }
    });
  });
}

export function navigateToSOPFile(path: string, section?: string) {
  const baseUrl = "/tutor";
  const fullPath = `${baseUrl}?file=${encodeURIComponent(path)}`;
  const finalUrl = section ? `${fullPath}#${section}` : fullPath;
  
  window.location.href = finalUrl;
}

export function highlightSOPSection(sectionId: string) {
  setTimeout(() => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("highlight-section");
      setTimeout(() => {
        element.classList.remove("highlight-section");
      }, 2000);
    }
  }, 500);
}
