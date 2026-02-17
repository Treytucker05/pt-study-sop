
import re
from pathlib import Path
path = Path('exports/research_packet.md')
lines = path.read_text().splitlines()
req_method_fields = [
    \ method_id\,
    \ current_name\,
    \ stage\,
