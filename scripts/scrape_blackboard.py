
import os
import sys
import time
import sqlite3
import json
from datetime import datetime
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Import canonical DB path from brain/config.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "brain"))
from config import DB_PATH

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def init_driver():
    """Initialize Chrome driver."""
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless") # Keep visible for login
    options.add_argument("--start-maximized")
    options.add_argument("--log-level=3")
    
    # Optional: Persist user data to avoid logging in every time
    # user_data_dir = os.path.join(os.path.dirname(__file__), "chrome_data")
    # options.add_argument(f"user-data-dir={user_data_dir}")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def login_and_wait(driver, start_url):
    """
    Navigates to the start URL.
    - Tries to automate login if BB_USERNAME/BB_PASSWORD are in env.
    - Waits for the user to complete login (MFA/SSO) if automation fails or finishes.
    """
    print(f"Navigating to {start_url}...")
    driver.get(start_url)
    
    username = os.getenv("BB_USERNAME")
    password = os.getenv("BB_PASSWORD")
    
    if username and password:
        print("Credentials found. Attempting auto-fill...")
        try:
            # Wait for any input field
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "input"))
            )
            time.sleep(2) # Stabilize
            
            # Helper to find and fill
            def try_fill(selector, value, name="field"):
                try:
                    el = driver.find_element(By.CSS_SELECTOR, selector)
                    if el.is_displayed():
                        el.clear()
                        el.send_keys(value)
                        print(f"Filled {name}.")
                        return el
                except:
                    return None
            
            # 1. Username
            # Common Microsoft/SSO IDs: type="email", name="loginfmt", id="username", name="j_username"
            user_el = try_fill("input[type='email']", username, "username (email)")
            if not user_el:
                user_el = try_fill("input[name='loginfmt']", username, "username (loginfmt)")
            if not user_el:
                user_el = try_fill("input[name='j_username']", username, "username (j_username)")
            if not user_el:
                user_el = try_fill("#username", username, "username (#username)")

            # If automated flow requires "Next" (like Microsoft), click it
            if user_el:
                try:
                    next_btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit'][value='Next'], button#idSIButton9")
                    if next_btn.is_displayed():
                        next_btn.click()
                        print("Clicked Next.")
                        time.sleep(2)
                except: pass

            # 2. Password
            # Might be on same page or next page
            pass_el = try_fill("input[type='password']", password, "password")
            
            # Submit
            if pass_el or user_el:
                try:
                    # Look for likely submit buttons
                    search = ["input[type='submit']", "button[type='submit']", "#idSIButton9", "button[name='_eventId_proceed']"]
                    for s in search:
                        try:
                            btn = driver.find_element(By.CSS_SELECTOR, s)
                            if btn.is_displayed() and btn.is_enabled():
                                btn.click()
                                print(f"Clicked Submit ({s}).")
                                break
                        except: continue
                except Exception as e:
                    print(f"Error clicking submit: {e}")
                    # Try enter key on password
                    if pass_el: pass_el.submit()

        except Exception as e:
            print(f"Auto-login attempt failed (might be already logged in or selector mismatch): {e}")

    print("\n" + "="*50)
    print("PLEASE COMPLETE LOGIN IN THE BROWSER (MFA/SSO).")
    print("The script will wait until it detects the 'Courses' page.")
    print("="*50 + "\n")
    
    max_wait = 600 # 10 minutes
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        # Check current URL
        if "ultra/course" in driver.current_url or "ultra/stream" in driver.current_url:
            print("Detected Dashboard/Courses URL! Login successful.")
            return True
            
        # Check for element
        try:
            if driver.find_elements(By.XPATH, "//span[contains(text(), 'Courses')]"):
                print("Detected 'Courses' link! Login successful.")
                return True
            # Also check for Activity Stream link
            if driver.find_elements(By.XPATH, "//span[contains(text(), 'Activity Stream')]"):
                 print("Detected 'Activity Stream' link! Login successful.")
                 return True
        except:
            pass
            
        time.sleep(2)
            
    print("Timeout waiting for login.")
    return False

def scrape_favorites(driver):
    """
    Scrapes courses. Attempts to identify 'Starred' courses but falls back to ALL.
    """
    print("Navigating to Courses...")
    if "ultra/course" not in driver.current_url:
        driver.get("https://utmb.blackboard.com/ultra/course")
    
    time.sleep(5)
    
    try:
        view_all_btns = driver.find_elements(By.XPATH, "//*[contains(text(), 'View All') or contains(text(), 'View all courses')]")
        for btn in view_all_btns:
            if btn.is_displayed():
                btn.click()
                print("Clicked 'View All' button.")
                time.sleep(3)
    except Exception: pass

    favorites = []
    
    try:
        # Wait for any course card
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "article.course-element-card"))
        )
        
        all_cards = driver.find_elements(By.CSS_SELECTOR, "article.course-element-card")
        print(f"Found {len(all_cards)} course cards.")
        
        for card in all_cards:
            try:
                # 1. Title (H4 or H3)
                title = "Unknown Course"
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, "h3, h4, span.course-title")
                    title = title_el.text.strip()
                except: pass
                
                # 2. Link / ID
                # The browser agent found: <article id="course-list-course-_20800_1" ... >
                # and <a href="javascript:void(0)">
                # So we MUST rely on the ID or data-course-id attribute.
                
                cid_part = ""
                box_id = card.get_attribute("id") # e.g. "course-list-course-_20800_1"
                data_id = card.get_attribute("data-course-id") # e.g. "_20800_1"
                
                # print(f"Card ID info: id={box_id}, data-id={data_id}") # DEBUG
                
                if data_id:
                    cid_part = data_id
                elif box_id and "course-" in box_id:
                    # extract _XXXX_1 from string
                    # simple regex or split
                    # "course-list-course-_20800_1" -> split by '-' -> last part?
                    # Be careful if valid ID contains dashes.
                    # Usually "course-list-course-" is prefix
                    cid_part = box_id.replace("course-list-course-", "")
                
                # print(f"  -> cid_part found: {cid_part}") # DEBUG

                # Fallback: Extract ID from any link inside the card
                if not cid_part or not cid_part.startswith("_"):
                    try:
                        links = card.find_elements(By.TAG_NAME, "a")
                        for link in links:
                            href = link.get_attribute("href")
                            # Look for /courses/_12345_1/
                            if href and "/courses/_" in href:
                                # extract between /courses/ and /
                                parts = href.split("/courses/")
                                if len(parts) > 1:
                                    potential_id = parts[1].split("/")[0]
                                    if potential_id.startswith("_"):
                                        cid_part = potential_id
                                        break
                    except: pass
                
                # print(f"  -> Final cid_part: {cid_part}") # DEBUG

                # Construct URL manually if we have ID
                if cid_part and cid_part.startswith("_"):
                    href = f"https://utmb.blackboard.com/ultra/courses/{cid_part}/cl/outline"
                else:
                    # Skip if we can't find ID
                    print(f"SKIPPING: Could not find valid ID for card. id={box_id}, data-id={data_id}")
                    continue
                
                # 3. Check Favorite (Starred)
                # Browser agent: <button class="super-clear favorite" title="Remove from your favorites">
                is_fav = False
                try:
                    # Check for star button that indicates it IS a favorite (often has 'favorite' class)
                    # Agent showed: class="super-clear favorite"
                    # But verify if "unstar" or "remove" is in title/aria-label
                    fav_btn = card.find_element(By.CSS_SELECTOR, "button.favorite")
                    btn_title = fav_btn.get_attribute("title") or fav_btn.get_attribute("aria-label") or ""
                    
                    if "remove" in btn_title.lower():
                        is_fav = True
                except: 
                    # If button.favorite exists, it might be a favorite? 
                    # Or maybe checking parent headers.
                    pass
                
                course_obj = {
                    "name": title,
                    "bb_id": cid_part,
                    "url": href,
                    "is_favorite": is_fav
                }
                
                if is_fav:
                    favorites.append(course_obj)
                    print(f"  Found Favorite: {title}")
                else:
                    # Store for fallback
                    # print(f"  Found Course: {title} (ID: {cid_part})")
                    favorites.append(course_obj)
                    pass
                    
            except Exception as e:
                print(f"Error parsing card: {e}")
                continue

    except Exception as e:
        print(f"Error scraping courses: {e}")

    # Because we are appending non-favorites to `favorites` list above (for fallback simplicity),
    # we should filter them if we actually found favorites.
    
    # 1. check if we have ANY true favorites
    true_favs = [c for c in favorites if c['is_favorite']]
    
    if true_favs:
        print(f"Found {len(true_favs)} starred courses. Ignoring others.")
        return true_favs
    else:
        print("No specific starred courses found. Returning ALL detected courses.")
        return favorites

def scrape_announcements(driver, course):
    """
    Scrapes announcements for a course.
    """
    print(f"  Scraping Announcements for {course['name']}...")
    
    # URL pattern for announcements: /ultra/courses/_123_1/announcements
    ann_url = course['url'].split("/cl/")[0] + "/announcements"
    driver.get(ann_url)
    time.sleep(5)
    
    announcements = []
    
    try:
        # Wait for list items
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "a[id^='list-item-title-']"))
        )
        
        # New strategy: Find titles by ID prefix, then looks for siblings
        title_links = driver.find_elements(By.CSS_SELECTOR, "a[id^='list-item-title-']")
        
        for link in title_links:
            try:
                title = link.text.strip()
                
                # Find container (usually a couple levels up, or look for sibling 'p' tags)
                # The browser agent said title is in a div.announcement-title-detail
                # And body is a <p> with class containing list-item-body
                
                # Try finding the 'body' relative to the link? 
                # It's hard with just one element.
                # Let's try finding the parent row.
                
                # XPath to find the 'p' following this title
                # //a[@id='...']/ancestor::div[contains(@class, 'announcement-item')]//p ... 
                # Simpler: just traverse up to common parent.
                
                body_text = "No content"
                date_str = "Unknown"

                try:
                    # Parent div usually
                    parent = link.find_element(By.XPATH, "./../../..") 
                    # Try to find paragraph
                    p_el = parent.find_element(By.CSS_SELECTOR, "p[class*='list-item-body']")
                    body_text = p_el.text.strip()
                except: pass
                
                # Date logic? 
                try: 
                    # Attempt to find date text in the wrapper
                     date_el = parent.find_element(By.CSS_SELECTOR, "span[class*='posted-date'], div[class*='posted-date']")
                     date_str = date_el.text.strip()
                except: pass

                announcements.append({
                    "title": title,
                    "date": date_str,
                    "body": body_text[:500] 
                })
            except Exception as e:
                # print(f"    Error parsing announcement: {e}")
                continue
                
    except Exception as e:
        # print(f"    Error getting announcements (or none found): {e}")
        pass
        
    return announcements

def scrape_modules(driver, course):
    """
    Scrapes "Course Content" by first expanding ALL folders/modules, 
    then grabbing all visible items.
    """
    print(f"  Scraping Modules for {course['name']}...")
    
    # Ensure we are at course root (outline)
    if "/outline" not in driver.current_url:
        driver.get(course['url']) 
        
    time.sleep(10) # Initial wait for content
    
    # --- BLANK PAGE RECOVERY ---
    # Sometimes Blackboard loads a blank "frame". Try clicking the 'Content' tab to refresh.
    try:
        # Check if we see any modules or links. If 0, try to refresh the Content tab.
        content_items = driver.find_elements(By.CSS_SELECTOR, "article.course-element-card, div.content-list-item, button[id*='title-']")
        if len(content_items) < 2: # Very low count might mean stuck spinner
            print("    Page appears blank or stuck. Attempting to click 'Content' tab to refresh...")
            # Look for tab link containing text "Content"
            content_tab = driver.find_element(By.XPATH, "//a[contains(., 'Content')]")
            driver.execute_script("arguments[0].click();", content_tab)
            time.sleep(10) # Wait for reload
    except: pass

    # --- PHASE 1: EXPAND EVERYTHING ---
    max_passes = 5
    for i in range(max_passes):
        try:
            # Find all buttons that are currently closed
            potential_toggles = driver.find_elements(By.CSS_SELECTOR, "button[aria-expanded='false']")
            
            # Filter for content toggles (Folders or Modules)
            to_click = []
            for t in potential_toggles:
                tid = (t.get_attribute("id") or "").lower()
                t_analytics = (t.get_attribute("data-analytics-id") or "").lower()
                # Detection: ID contains 'title-' or analytics ID contains 'toggle'
                if "title-" in tid or "toggle" in t_analytics:
                    to_click.append(t)
            
            if not to_click:
                break
                
            print(f"    [Pass {i+1}] Expanding {len(to_click)} folders...")
            
            count_clicked = 0
            for t in to_click:
                try:
                    # Scroll into view before clicking
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", t)
                    time.sleep(0.5)
                    driver.execute_script("arguments[0].click();", t)
                    count_clicked += 1
                    time.sleep(1.2) # Patient clicking for UI response
                except: pass
                
            if count_clicked > 0:
                print("    Waiting for nested content to load...")
                time.sleep(6)
            else:
                break
                
        except Exception as e:
            print(f"    Expansion error: {e}")
            break

    # --- PHASE 2: SCRAPE EVERYTHING VISIBLE ---
    items_found = []
    
    try:
        # Broader link matching: match ANY link that looks like course content
        # Blackboard uses 'contentItemTitle' but some items might use different classes
        links = driver.find_elements(By.CSS_SELECTOR, "a[class*='Title'], a[class*='title'], a[href*='/outline/']")
        print(f"    Scanning {len(links)} visible content items...")
        
        for link in links:
            try:
                l_text = link.text.strip()
                l_href = link.get_attribute("href")
                
                if not l_text or not l_href or "javascript:void(0)" in l_href:
                    continue
                
                # Check for duplicates
                if any(x['title'] == l_text for x in items_found):
                    continue
                
                item_type = "material"
                due_date = None
                
                # Check if it's an assignment (usually has /assessment/ or /assessment/ in URL)
                if "/assessment/" in l_href or "/exam/" in l_href or "/assessment/" in l_href:
                    item_type = "assignment"
                
                try:
                    # Look for Due Date in sibling or parent containers (usually up 5 levels)
                    container = link.find_element(By.XPATH, "./../../../../..")
                    date_divs = container.find_elements(By.CSS_SELECTOR, "div[class*='gradeDetail'], [class*='date']")
                    for d in date_divs:
                        txt = d.text
                        if "due" in txt.lower():
                            due_date = txt.split(":")[-1].strip()
                            item_type = "assignment"
                            break
                except: pass
                
                if item_type == "assignment":
                    print(f"    [+] Found Assignment: {l_text} (Due: {due_date})")
                else:
                    print(f"    [+] Found Material: {l_text}")

                items_found.append({
                    "type": item_type,
                    "title": l_text,
                    "url": l_href,
                    "due_date": due_date,
                    "course_id": course['bb_id']
                })
                    
            except: continue
            
    except Exception as e:
        print(f"    Error collecting items: {e}")
        
    return items_found

def scrape_calendar_events(driver, course):
    """
    Scrapes 'Due Dates' from calendar view.
    """
    # ... (Same as before, simplified for this file)
    calendar_url = course['url'].replace("/cl/outline", "/calendar")
    if "/calendar" not in calendar_url:
        calendar_url = course['url'] + "/calendar" # rough fallback
        
    # Standardize
    if "ultra/courses" in course['url']:
        # Construct: https://.../ultra/courses/_ID_/calendar
        parts = course['url'].split("/courses/")
        if len(parts) > 1:
            base_id = parts[1].split("/")[0]
            calendar_url = f"https://utmb.blackboard.com/ultra/courses/{base_id}/calendar"

    print(f"  Scraping Calendar for {course['name']}...")
    driver.get(calendar_url)
    time.sleep(6)
    
    events = []
    try:
        items = driver.find_elements(By.CSS_SELECTOR, "div.deadline-event-item")
        for item in items:
            try:
                title = item.find_element(By.CSS_SELECTOR, "a").text.strip()
                raw_date = item.text.replace(title, "").replace("Due date:", "").strip()
                events.append({"title": title, "due_date": raw_date, "type": "assignment"})
            except: continue
    except: pass
    
    return events

def save_rich_data(course, modules, announcements, events):
    """
    Saves all scrapped data to the staged_events table for verification.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # 1. Ensure Course Exists & Track Last Scraped
    now_iso = datetime.now().isoformat()
    c.execute("SELECT id, name FROM courses WHERE name=?", (course['name'],))
    row = c.fetchone()
    
    if row:
        course_id = row[0]
        c.execute("UPDATE courses SET last_scraped_at=? WHERE id=?", (now_iso, course_id))
    else:
        # Fallback: Try fuzzy match (e.g. if DB has "Exercise Physiology" and BB has "Spring 2026... Exercise Physiology")
        c.execute("SELECT id, name FROM courses")
        all_courses = c.fetchall()
        match = None
        for db_id, db_name in all_courses:
            if db_name.lower() in course['name'].lower():
                match = db_id
                print(f"    [MATCH] Fuzzy matched '{course['name']}' to existing '{db_name}' (ID: {db_id})")
                break
        
        if match:
            course_id = match
            c.execute("UPDATE courses SET last_scraped_at=? WHERE id=?", (now_iso, course_id))
        else:
            c.execute("INSERT INTO courses (name, created_at, last_scraped_at) VALUES (?, ?, ?)", 
                      (course['name'], now_iso, now_iso))
            course_id = c.lastrowid
        
    print(f"Saving data for Course ID {course_id}...")

    # Helper to check if item is ALREADY in calendar or staging
    # RETURNS: True if handled (either skipped as duplicate or linked to existing), False if new
    def process_item(title, item_url, c_id, item_type='material'):
        # DEBUG
        # print(f"Checking: '{title}' (CID: {c_id}) URL: {item_url}")

        # 1. Check main course_events
        c.execute("SELECT id, source_url, type FROM course_events WHERE course_id=? AND title=?", (c_id, title))
        row = c.fetchone()
        
        if row:
            evt_id, existing_url, evt_type = row
            
            if not existing_url and item_url and "javascript" not in item_url:
                # ENRICHMENT: We found a match that needs a link!
                print(f"    [LINK] Linked file to existing '{title}'")
                c.execute("UPDATE course_events SET source_url=?, raw_text=coalesce(raw_text, '') || ? WHERE id=?", 
                          (item_url, f"\n[Scraper] Linked to: {item_url}", evt_id))
                return True # Handled (enriched)
            else:
                # Already has link or we have no link to give -> Skip as duplicate
                print(f"    [SKIP] Match found but not updated: '{title}' (Existing URL: {bool(existing_url)})")
                return True # Handled (skipped)

        # 2. Check staging (scraped_events)
        c.execute("SELECT id FROM scraped_events WHERE course_id=? AND title=?", (c_id, title))
        if c.fetchone(): 
            print(f"    [SKIP] Already in staging: '{title}'")
            return True # Already in inbox, skip
            
        return False # New item!

    # 2. Save Announcements
    for ann in announcements:
        if not process_item(ann['title'], None, course_id, 'announcement'):
            c.execute("""
                INSERT INTO scraped_events (course_id, type, title, raw_text, date, scraped_at, status)
                VALUES (?, 'announcement', ?, ?, ?, ?, 'new')
            """, (course_id, ann['title'], ann['body'], ann['date'], now_iso))
            
    # 3. Save Modules/Materials (as Topics in staging)
    for item in modules:
        if not process_item(item['title'], item['url'], course_id, 'material'):
            c.execute("""
                INSERT INTO scraped_events (course_id, type, title, source_url, scraped_at, status)
                VALUES (?, 'material', ?, ?, ?, 'new')
            """, (course_id, item['title'], item['url'], now_iso))

    # 4. Save Assignments
    for evt in events:
        evt_url = evt.get('url') # Calendar events might not have URLs yet, but future proofing
        if not process_item(evt['title'], evt_url, course_id, evt['type']):
            c.execute("""
                INSERT INTO scraped_events (course_id, type, title, raw_text, date, due_date, scraped_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
            """, (course_id, evt['type'], evt['title'], "Scraped from Calendar", evt['date'], evt['due_date'], now_iso))

    conn.commit()
    conn.close()

def main():
    start_url = "https://utmb.blackboard.com/"
    driver = init_driver()
    
    try:
        if login_and_wait(driver, start_url):
            
            favorites = scrape_favorites(driver)
            
            if not favorites:
                print("No favorite courses found. Exiting.")
            else:
                print(f"Found {len(favorites)} favorite courses to process.")
                
            for course in favorites:
                print(f"\nProcessing: {course['name']}...")
                
                # 1. Announcements
                anns = scrape_announcements(driver, course)
                
                # 2. Modules/Content
                mods = scrape_modules(driver, course)
                
                # 3. Calendar/Assignments
                events = []
                try:
                    events = scrape_calendar_events(driver, course)
                except Exception as e:
                    print(f"  [!] Error scraping calendar (skipping): {e}")
                
                # Save (even if driver died during calendar, we have mods/anns)
                try:
                    save_rich_data(course, mods, anns, events)
                except Exception as e:
                    print(f"  [!] Error saving data: {e}")
                
            print("\nDone! All data saved.")
            
    except Exception as e:
        print(f"Global Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
