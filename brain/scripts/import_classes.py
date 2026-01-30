"""Wipe course_events and reload from extracted class schedule."""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "pt_study.db")

# Map course title prefixes to course names
COURSE_MAP: dict[str, int] = {
    "PHYT 6216": 22,  # Exercise Physiology
    "PHYT 6220": 21,  # Evidence Based Practice
    "PHYT 6313": 20,  # Neuroscience
    "PHYT 6314": 23,  # Movement Science 1
    "PHYT 6442": 24,  # Therapeutic Interventions
    "PHYT 6443": 24,  # Therapeutic Interventions (lab)
}

def extract_course(title: str) -> tuple[str, int]:
    for prefix, cid in COURSE_MAP.items():
        if prefix in title:
            return prefix, cid
    return "", 29  # PT Calendar for academic calendar events

def parse_time(t: str) -> str:
    """Convert '8:00 AM' -> '08:00', '1:00 PM' -> '13:00', empty -> ''."""
    t = t.strip()
    if not t:
        return ""
    try:
        return datetime.strptime(t, "%I:%M %p").strftime("%H:%M")
    except ValueError:
        return t

def parse_date(d: str) -> str:
    """Convert 'MM/DD/YYYY' -> 'YYYY-MM-DD', empty -> ''."""
    d = d.strip()
    if not d:
        return ""
    try:
        return datetime.strptime(d, "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return d

ROWS = [
    # Academic Calendar / Other
    ("class", "Spring Semester Begins", "01/05/2026", "", "", "", "Time: All day"),
    ("class", "MLK Day", "01/19/2026", "", "", "", "Time: All day"),
    ("class", "Travel Day", "02/24/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.1", "02/25/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.1", "02/26/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.1", "02/27/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.1", "02/28/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.1", "03/01/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.1", "03/02/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.1", "03/03/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.1", "03/04/2026", "", "", "", "Time: All day"),
    ("class", "Travel Day", "03/05/2026", "", "", "", "Time: All day"),
    ("class", "Spring Break", "03/16/2026", "", "", "", "Time: All day"),
    ("class", "Spring Break", "03/17/2026", "", "", "", "Time: All day"),
    ("class", "Spring Break", "03/18/2026", "", "", "", "Time: All day"),
    ("class", "Spring Break", "03/19/2026", "", "", "", "Time: All day"),
    ("class", "Spring Break", "03/20/2026", "", "", "", "Time: All day"),
    ("class", "Travel Day", "04/09/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.2", "04/10/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.2", "04/11/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.2", "04/12/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.2", "04/13/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.2", "04/14/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.2", "04/15/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.2", "04/16/2026", "", "", "", "Time: All day"),
    ("class", "Hybrid 2028 Immersion 2.2", "04/17/2026", "", "", "", "Time: All day"),
    ("class", "Study Day", "04/20/2026", "", "", "", "Time: All day"),
    # PHYT 6216 ExPhys
    ("lecture", "PHYT 6216 ExPhys", "01/05/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "01/07/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6216 ExPhys", "01/12/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "01/14/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6216 ExPhys", "01/19/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module | Overlap: MLK Day"),
    ("lecture", "PHYT 6216 ExPhys", "01/21/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6216 ExPhys", "01/26/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "01/28/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("quiz", "PHYT 6216 ExPhys Quiz #1", "01/27/2026", "4:30 PM", "5:00 PM", "", ""),
    ("lecture", "PHYT 6216 ExPhys", "02/02/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "02/04/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6216 ExPhys", "02/09/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "02/11/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6216 ExPhys", "02/16/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "02/18/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("quiz", "PHYT 6216 ExPhys Quiz #2", "02/18/2026", "11:30 AM", "12:00 PM", "", ""),
    ("lecture", "PHYT 6216 ExPhys", "02/23/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "02/25/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6216 ExPhys", "03/02/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module | Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6216 ExPhys", "03/04/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6216 ExPhys", "03/09/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "03/11/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("quiz", "PHYT 6216 ExPhys Quiz #3", "03/11/2026", "11:30 AM", "12:00 PM", "", ""),
    ("lecture", "PHYT 6216 ExPhys", "03/16/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module | Overlap: Spring Break"),
    ("lecture", "PHYT 6216 ExPhys", "03/18/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Spring Break"),
    ("lecture", "PHYT 6216 ExPhys", "03/23/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "03/25/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("exam", "PHYT 6216 ExPhys EXAM #2", "03/27/2026", "10:00 AM", "12:00 PM", "", "Location: Examplify"),
    ("lecture", "PHYT 6216 ExPhys", "03/30/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "04/01/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6216 ExPhys", "04/06/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module"),
    ("lecture", "PHYT 6216 ExPhys", "04/08/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6216 ExPhys", "04/13/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module | Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6216 ExPhys", "04/15/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6216 ExPhys", "04/16/2026", "8:00 AM", "12:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6216 ExPhys", "04/20/2026", "8:00 AM", "10:00 AM", "", "Location: Online Module | Overlap: Study Day"),
    ("lecture", "PHYT 6216 ExPhys", "04/22/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    # PHYT 6220 EBP
    ("lecture", "PHYT 6220 EBP", "01/08/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "01/15/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "01/22/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "01/29/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "02/05/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "02/12/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "02/19/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "02/20/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "02/26/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6220 EBP", "03/05/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous | Overlap: Travel Day, Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6220 EBP", "03/06/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "03/12/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "03/19/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous | Overlap: Spring Break"),
    ("lecture", "PHYT 6220 EBP", "03/26/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "04/02/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "04/07/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6220 EBP", "04/09/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous | Overlap: Travel Day"),
    ("lecture", "PHYT 6220 EBP", "04/16/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6220 EBP", "04/16/2026", "3:00 PM", "5:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6220 EBP", "04/23/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("exam", "PHYT 6220 EBP", "04/23/2026", "2:00 PM", "4:00 PM", "", "Location: Examplify"),
    # PHYT 6313 Neuroscience
    ("lecture", "PHYT 6313 Neuroscience", "01/06/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "01/13/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "01/20/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "01/27/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "02/03/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "02/10/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "02/17/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "02/24/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Travel Day"),
    ("lecture", "PHYT 6313 Neuroscience", "03/03/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6313 Neuroscience", "03/10/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "03/17/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Spring Break"),
    ("lecture", "PHYT 6313 Neuroscience", "03/24/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "03/31/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "04/07/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6313 Neuroscience", "04/14/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6313 Neuroscience", "04/21/2026", "9:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    # PHYT 6314 MS1
    ("lecture", "PHYT 6314 MS1", "01/05/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "01/08/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "01/12/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "01/15/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "01/19/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module | Overlap: MLK Day"),
    ("lecture", "PHYT 6314 MS1", "01/22/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "01/26/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "01/29/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "02/02/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "02/05/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "02/09/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "02/12/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "02/16/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "02/19/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "02/23/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "02/26/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6314 MS1", "03/02/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module | Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6314 MS1", "03/05/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Travel Day, Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6314 MS1", "03/09/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "03/12/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "03/16/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module | Overlap: Spring Break"),
    ("lecture", "PHYT 6314 MS1", "03/19/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Spring Break"),
    ("lecture", "PHYT 6314 MS1", "03/23/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "03/26/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "03/30/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "04/02/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6314 MS1", "04/06/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6314 MS1", "04/09/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Travel Day"),
    ("lecture", "PHYT 6314 MS1", "04/13/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module | Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6314 MS1", "04/16/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6314 MS1", "04/17/2026", "8:00 AM", "12:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6314 MS1", "04/17/2026", "1:00 PM", "5:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6314 MS1", "04/20/2026", "2:00 PM", "4:00 PM", "", "Location: Online Module | Overlap: Study Day"),
    ("lecture", "PHYT 6314 MS1", "04/23/2026", "10:00 AM", "12:00 PM", "", "Location: Virtual Synchronous"),
    # PHYT 6442 HTI
    ("lecture", "PHYT 6442 HTI", "01/09/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "01/16/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "01/23/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("quiz", "PHYT 6442 HTI Quiz #1", "01/23/2026", "9:00 AM", "10:00 AM", "", ""),
    ("lecture", "PHYT 6442 HTI", "01/30/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "02/06/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "02/13/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "02/20/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "02/27/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6442 HTI", "03/06/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "03/13/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "03/20/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous | Overlap: Spring Break"),
    ("lecture", "PHYT 6442 HTI", "03/27/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "04/03/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6442 HTI", "04/10/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6442 HTI", "04/17/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous | Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6442 HTI", "04/24/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    # PHYT 6443 HTI
    ("lecture", "PHYT 6443 HTI", "01/05/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "01/07/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "01/12/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "01/13/2026", "1:00 PM", "4:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6443 HTI", "01/14/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "01/19/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module | Overlap: MLK Day"),
    ("lecture", "PHYT 6443 HTI", "01/20/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6443 HTI", "01/21/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "01/26/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "01/28/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "02/02/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "02/04/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("assessment", "PHYT 6443 HTI Virtual Check Off", "02/06/2026", "9:00 AM", "10:00 AM", "", ""),
    ("assignment", "PHYT 6443 HTI Virtual Check off Due", "02/06/2026", "11:59 PM", "11:59 PM", "02/06/2026", "Due time: 11:59 PM"),
    ("lecture", "PHYT 6443 HTI", "02/09/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "02/10/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6443 HTI", "02/11/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "02/13/2026", "9:00 AM", "10:00 AM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6443 HTI", "02/16/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "02/17/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6443 HTI", "02/18/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("class", "PHYT 6443 HTI", "02/23/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "02/25/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module | Overlap: Hybrid 2028 Immersion 2.1"),
    ("class", "PHYT 6443 HTI", "02/28/2026", "8:00 AM", "12:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.1"),
    ("class", "PHYT 6443 HTI", "02/28/2026", "1:00 PM", "5:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.1"),
    ("class", "PHYT 6443 HTI", "03/01/2026", "8:00 AM", "12:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.1"),
    ("class", "PHYT 6443 HTI", "03/01/2026", "1:00 PM", "5:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.1"),
    ("class", "PHYT 6443 HTI Check Offs", "03/03/2026", "9:00 AM", "2:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.1"),
    ("class", "PHYT 6443 HTI Check Off Retakes", "03/04/2026", "9:00 AM", "12:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.1"),
    ("lecture", "PHYT 6443 HTI", "03/09/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "03/10/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("assessment", "PHYT 6443 HTI Virtual Check Off", "03/13/2026", "", "", "", "Time: All day"),
    ("lecture", "PHYT 6443 HTI", "03/16/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module | Overlap: Spring Break"),
    ("lecture", "PHYT 6443 HTI", "03/18/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module | Overlap: Spring Break"),
    ("lecture", "PHYT 6443 HTI", "03/23/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "03/24/2026", "1:00 PM", "3:00 PM", "", "Location: Virtual Synchronous"),
    ("lecture", "PHYT 6443 HTI", "03/25/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("quiz", "PHYT 6443 HTI Quiz #3", "03/28/2026", "", "", "", "Time: All day"),
    ("lecture", "PHYT 6443 HTI", "03/30/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "04/01/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "04/06/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module"),
    ("lecture", "PHYT 6443 HTI", "04/08/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module"),
    ("assignment", "PHYT 6443 HTI Virtual Checkoff Due", "04/09/2026", "", "", "04/09/2026", "Time: All day | Overlap: Travel Day"),
    ("class", "PHYT 6443 HTI", "04/10/2026", "8:00 AM", "12:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6443 HTI", "04/10/2026", "1:00 PM", "5:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6443 HTI", "04/11/2026", "8:00 AM", "12:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6443 HTI", "04/11/2026", "1:00 PM", "5:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6443 HTI", "04/12/2026", "8:00 AM", "12:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("class", "PHYT 6443 HTI", "04/12/2026", "1:00 PM", "5:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6443 HTI", "04/13/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module | Overlap: Hybrid 2028 Immersion 2.2"),
    ("exam", "PHYT 6443 HTI COMPETENCY EXAM", "04/14/2026", "8:00 AM", "5:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6443 HTI", "04/15/2026", "1:00 PM", "2:30 PM", "", "Location: Online Module | Overlap: Hybrid 2028 Immersion 2.2"),
    ("assessment", "PHYT 6443 HTI Retakes", "04/16/2026", "1:00 PM", "3:00 PM", "", "Overlap: Hybrid 2028 Immersion 2.2"),
    ("lecture", "PHYT 6443 HTI", "04/20/2026", "10:00 AM", "12:00 PM", "", "Location: Online Module | Overlap: Study Day"),
    ("exam", "PHYT 6443 HTI EXAM #3", "04/24/2026", "10:00 AM", "12:00 PM", "", "Location: Examplify"),
]


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Backup count
    c.execute("SELECT COUNT(*) FROM course_events")
    old_count = c.fetchone()[0]
    print(f"Existing course_events rows: {old_count}")

    # Wipe
    c.execute("DELETE FROM course_events")
    # Reset autoincrement
    c.execute("DELETE FROM sqlite_sequence WHERE name='course_events'")

    now = datetime.now().isoformat()
    inserted = 0

    for typ, title, date_str, start, end, due, notes in ROWS:
        date_val = parse_date(date_str)
        time_val = parse_time(start)
        end_val = parse_time(end)
        due_val = parse_date(due)
        course, course_id = extract_course(title)

        location = ""
        if "Location:" in notes:
            loc_part = notes.split("Location:")[1].split("|")[0].strip()
            location = loc_part

        c.execute(
            """INSERT INTO course_events
               (course_id, type, title, date, time, end_time, due_date, notes, course, location, created_at, updated_at, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')""",
            (course_id, typ, title, date_val, time_val, end_val, due_val, notes, course, location, now, now),
        )
        inserted += 1

    conn.commit()

    # Verify
    c.execute("SELECT COUNT(*) FROM course_events")
    new_count = c.fetchone()[0]
    print(f"Inserted: {inserted}")
    print(f"New course_events rows: {new_count}")

    # Summary by course
    c.execute("SELECT course, COUNT(*) FROM course_events GROUP BY course ORDER BY course")
    for row in c.fetchall():
        print(f"  {row[0] or '(calendar)':25s} {row[1]}")

    conn.close()


if __name__ == "__main__":
    main()
