#!/usr/bin/env python3
"""Regenerate the animated terminal SVGs (terminal_about.svg / terminal_skills.svg).

Reverse-engineered from the committed SVGs so output is byte-format identical:
  char cell 8.4px, x0=18, line y0=54, line pitch 20, height = last_y + 24,
  width = ceil(8.4*maxlen) + 55, prompt types at 14 cps, body at 24 cps,
  0.12s pause between lines, block cursor tracks the caret and blinks at the end.
"""
import math, html

CW, X0, Y0, PITCH = 8.4, 18.0, 54, 20
PROMPT_STEP, BODY_STEP, LINE_PAUSE = 1 / 14, 1 / 24, 0.12

GREEN, BLUE, GREY, WHITE = "#56d364", "#79c0ff", "#c9d1d9", "#ffffff"
MAGENTA, CYAN = "#e040fb", "#00e5ff"


def prompt(cmd):
    return [("/ divyam ", MAGENTA), ("$ ", CYAN), (cmd, WHITE)]


def kv(key, value, pad, sep=": ", indent="  "):
    """A `key<pad> : value` line — key green, separator grey, value blue."""
    return [(f"{indent}{key}".ljust(pad), GREEN), (sep, GREY), (value, BLUE)]


def render(lines, path):
    maxlen = max(sum(len(t) for t, _ in ln) for ln in lines)
    width = math.ceil(CW * maxlen) + 55
    height = Y0 + PITCH * (len(lines) - 1) + 24

    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">',
        '  <defs><style>text{font-family:Fira Code, Cascadia Code, Consolas, '
        'monospace;font-size:13px;}</style></defs>',
        f'  <rect width="{width}" height="{height}" rx="10" fill="#0d1117"/>',
        f'  <rect x="1" y="1" width="{width - 2}" height="{height - 2}" rx="9" '
        'fill="none" stroke="#e040fb" stroke-width="1.5"/>',
        '  <circle cx="18" cy="16" r="5" fill="#ff5f57"/>',
        '  <circle cx="34" cy="16" r="5" fill="#febc2e"/>',
        '  <circle cx="50" cy="16" r="5" fill="#28c840"/>',
        f'  <line x1="0" y1="28" x2="{width}" y2="28" stroke="#e040fb" '
        'stroke-width="0.5" opacity="0.35"/>',
    ]

    chars, cursors, t = [], [], 0.5
    for i, segs in enumerate(lines):
        y = Y0 + PITCH * i
        step = PROMPT_STEP if i == 0 else BODY_STEP
        n, col = 0, t
        for text, fill in segs:
            for ch in text:
                chars.append(
                    f'  <text x="{X0 + CW * n:.1f}" y="{y}" fill="{fill}" opacity="0">'
                    f'{html.escape(ch)}<animate attributeName="opacity" values="0;1" '
                    f'dur="0.01s" begin="{col:.3f}s" fill="freeze"/></text>'
                )
                n, col = n + 1, col + step
        dur = n * step + LINE_PAUSE
        cx, cy = X0 + CW * n, y - 14
        if i == len(lines) - 1:
            cursors.append(
                f'  <rect x="{cx:.1f}" y="{cy}" width="7" height="14" fill="#e040fb" '
                f'opacity="0"><animate attributeName="opacity" values="0;1" dur="0.01s" '
                f'begin="{t + dur:.3f}s" fill="freeze"/><animate attributeName="opacity" '
                f'values="1;0;0;1" dur="0.9s" begin="{t + dur + 0.1:.3f}s" '
                'repeatCount="indefinite"/></rect>'
            )
        else:
            cursors.append(
                f'  <rect x="{cx:.1f}" y="{cy}" width="7" height="14" fill="#e040fb" '
                f'opacity="0"><animate attributeName="opacity" values="0;1;1;0" '
                f'keyTimes="0;0.01;0.99;1" dur="{dur:.3f}s" begin="{t:.3f}s" '
                'fill="freeze"/></rect>'
            )
        t += dur

    out += chars + cursors + ["</svg>"]
    open(path, "w").write("\n".join(out) + "\n")
    print(f"{path}  {width}x{height}  {len(lines)} lines  {t:.1f}s")


# ── about.json ────────────────────────────────────────────────────────────
P = len('  "experience" ')
about = [
    prompt("cat about.json"),
    [("{", GREY)],
    kv('"name"', '"Divyam Kataria",', P),
    kv('"handle"', '"katsdivi",', P),
    kv('"school"', '"Ira A. Fulton Schools of Engineering @ ASU",', P),
    kv('"degree"', '"BS Computer Science  |  Minor: Mathematics  |  GPA: 3.97",', P),
    kv('"graduating"', '"May 2027",', P),
    [('  "experience" ', GREEN), (": [", GREY)],
    [("    ", GREY), ('"Engineering Tutor @ ASU Fulton  (Mar 2026 - Present)",', BLUE)],
    [("    ", GREY), ('"Subject Area Tutor @ ASU  (Jan 2025 - Present)",', BLUE)],
    [("    ", GREY), ('"Summer Intern @ EY  (Jun - Aug 2025)",', BLUE)],
    [("    ", GREY), ('"Co-Founder @ Adewin  (Jul - Sep 2025)",', BLUE)],
    [("    ", GREY), ('"CTO @ Gun Devils / Combat Ready Robotics  (Aug 2024 - May 2025)"', BLUE)],
    [("  ],", GREY)],
    kv('"building"', '"point-in-time alternative-data panels for equity research",', P),
    kv('"focus"', '["Quantitative Research", "Distributed Systems", "Applied AI"],', P),
    kv('"contact"', '{ "email": "divyam1211@yahoo.com", "web": "divyamkataria.me" }', P),
    [("}", GREY)],
]

# ── skills.py ─────────────────────────────────────────────────────────────
Q = len("    validation ")
skills = [
    prompt("cat skills.py"),
    [("class ", GREEN), ("Divyam:", WHITE)],
    kv("languages", '["Python", "TypeScript", "Swift", "Java", "C++", "SQL", "R", "Bash"]', Q, "= ", "    "),
    kv("quant", '["point-in-time data", "panel data", "entity resolution", "backtesting"]', Q, "= ", "    "),
    kv("validation", '["ablation studies", "block-permutation tests", "bias controls"]', Q, "= ", "    "),
    kv("ai_ml", '["LangChain", "LangSmith", "multi-agent", "RAG", "vector search"]', Q, "= ", "    "),
    kv("data", '["pandas", "NumPy", "scikit-learn", "XGBoost", "Parquet"]', Q, "= ", "    "),
    kv("backend", '["FastAPI", "WebSockets", "PostgreSQL", "Docker", "Linux", "Git"]', Q, "= ", "    "),
    kv("frontend", '["React", "React Native", "SwiftUI"]', Q, "= ", "    "),
    kv("building", '"NeuraMesh - P2P protocol for distributed LLM inference on Apple devices"', Q, "= ", "    "),
]

if __name__ == "__main__":
    import sys
    d = sys.argv[1].rstrip("/")
    render(about, f"{d}/terminal_about.svg")
    render(skills, f"{d}/terminal_skills.svg")
