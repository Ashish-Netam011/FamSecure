# -*- coding: utf-8 -*-
"""
Builds the short (7-slide) FarmRescue briefing deck.

Usage:  python presentation/build_deck_short.py
Output: presentation/FarmRescue-Brief-7slides.pptx

Reuses the theme + helpers from build_deck.py so both decks stay visually
identical. Only the slide composition differs.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

import build_deck as T

# theme shorthand
FOREST, DARK, GREEN, EMERALD, MINT, LIGHT = (T.FOREST, T.DARK, T.GREEN,
                                             T.EMERALD, T.MINT, T.LIGHT)
BORDER, SLATE, GRAY, RED, AMBER, WHITE = (T.BORDER, T.SLATE, T.GRAY, T.RED,
                                          T.AMBER, T.WHITE)
PALE = T.PALE
HEAD, BODY = T.HEAD, T.BODY
SW, SH, M = T.SW, T.SH, T.M

OUT = os.path.join(T.HERE, "FarmRescue-Brief-7slides.pptx")


# ---------------------------------------------------------------------------
def slide_cover(prs):
    s = T.slide(prs)
    T.bg_gradient(s, FOREST, RGBColor(0x05, 0x1A, 0x10), 45)
    T.shape(s, 10.5, -1.6, 4.8, 4.8, fill=RGBColor(0x12, 0x4A, 0x2E),
            kind=T.MSO_SHAPE.OVAL)
    T.shape(s, -1.5, 4.3, 4.0, 4.0, fill=RGBColor(0x0F, 0x3D, 0x26),
            kind=T.MSO_SHAPE.OVAL)

    tf = T.text(s, M + 0.2, 0.68, 10.5, 0.4)
    T.par(tf, "OFFICIAL PROJECT BRIEFING  \u00b7  OCTOBER 2026", size=12,
          color=EMERALD, bold=True, first=True, after=0)

    tf = T.text(s, M + 0.2, 1.12, 11.0, 1.3)
    T.par(tf, "\U0001F33E  FarmRescue", size=54, color=WHITE, bold=True,
          font=HEAD, first=True, after=0)

    tf = T.text(s, M + 0.2, 2.36, 11.4, 0.9)
    T.par(tf, "Emergency Agricultural Early-Warning & Response Platform",
          size=22, color=PALE, font=HEAD, first=True, after=4)
    T.par(tf, "\u201cWhat should I do when the farm suddenly goes wrong?\u201d",
          size=15, color=RGBColor(0x9C, 0xD8, 0xB8), italic=True, after=0)

    T.shape(s, M + 0.2, 3.52, 1.0, 0.075, fill=EMERALD)

    tf = T.text(s, M + 0.2, 3.82, 11.4, 1.5)
    T.par(tf, "Farmers get no trustworthy guidance in the hours that decide "
              "whether a crop survives.", size=15, color=WHITE, first=True,
          after=6, line=1.12)
    T.par(tf, "FarmRescue answers that window with a deterministic agronomic "
              "decision engine: raw field evidence becomes a validated, "
              "expert-authored action plan in seconds \u2014 where data and rules "
              "decide, and AI only explains.",
          size=13.5, color=PALE, after=0, line=1.14)

    T.shape(s, 0, SH - 1.0, SW, 1.0, fill=RGBColor(0x04, 0x14, 0x0C))
    tf = T.text(s, M + 0.2, SH - 0.76, 8.4, 0.6)
    T.par(tf, "Next.js 14 (App Router)  \u00b7  TypeScript  \u00b7  Tailwind CSS  "
              "\u00b7  MongoDB  \u00b7  Gemini explanation layer",
          size=11, color=PALE, first=True, after=0)
    tf = T.text(s, SW - 4.8, SH - 0.76, 4.2, 0.6)
    T.par(tf, "7-slide brief  \u00b7  Hackathon product demo",
          size=11, color=EMERALD, bold=True, align=PP_ALIGN.RIGHT, first=True,
          after=0)
    T.notes(s, "One-line pitch: FarmRescue answers the 3 a.m. question \u2014 what do "
               "I do right now? Emphasise that the product is deterministic by "
               "design and that AI never decides.")
    return s


def slide_problem(prs):
    s = T.slide(prs)
    T.bg(s, WHITE)
    T.header(s, "Context", "The Problem")

    tf = T.text(s, M, 1.45, SW - 2 * M, 0.85)
    T.par(tf, "A crop emergency does not wait for the extension officer.",
          size=21, color=DARK, bold=True, font=HEAD, first=True, after=4)
    T.par(tf, "Waterlogging, submergence and heat stress cross critical "
              "thresholds within a single day \u2014 the window to act is measured "
              "in hours, not weeks.",
          size=12, color=GRAY, after=0)

    cards = [
        ("Invisible onset", "Stress crosses damaging thresholds silently "
         "overnight. By the time the damage is visible, the highest-value "
         "intervention window has already closed.", RED),
        ("Generic, sometimes dangerous advice", "Blanket advisory ignores field "
         "state. Telling a farmer to top-dress urea into standing flood water "
         "does not just fail \u2014 it makes the loss worse.", AMBER),
        ("No traceability", "Guidance arrives by word of mouth with no record of "
         "the evidence used, who verified it, or whether the crop recovered. "
         "Nothing is auditable, so nothing improves.", GRAY),
    ]
    w = (SW - 2 * M - 0.3 * 2) / 3
    for i, (t, d, accent) in enumerate(cards):
        x = M + i * (w + 0.3)
        T.card(s, x, 2.62, w, 3.05)
        T.shape(s, x + 0.28, 2.88, 0.5, 0.075, fill=accent)
        tf = T.text(s, x + 0.28, 3.08, w - 0.56, 0.6)
        T.par(tf, t, size=14.5, color=SLATE, bold=True, font=HEAD, first=True,
              after=0)
        tf = T.text(s, x + 0.28, 3.62, w - 0.56, 1.9)
        T.par(tf, d, size=10.5, color=GRAY, first=True, after=0, line=1.12)

    T.card(s, M, 5.95, SW - 2 * M, 0.82, fill=MINT, line=None)
    tf = T.text(s, M + 0.34, 6.08, SW - 2 * M - 0.68, 0.6)
    T.par(tf, "The agronomic knowledge already exists \u2014 ICAR / IRRI protocols "
              "are well documented. The failure is delivery: it does not reach the "
              "farmer at the moment of need, in a form that is actionable and safe.",
          size=11.5, color=RGBColor(0x06, 0x5F, 0x46), bold=True, first=True,
          after=0, line=1.08)
    T.footer(s)
    T.notes(s, "Frame the problem as a delivery and trust failure, not a knowledge "
               "gap. Unsafe advice is worse than no advice.")
    return s


def slide_solution(prs):
    s = T.slide(prs)
    T.bg(s, WHITE)
    T.header(s, "Design Principle", "The Solution in One Rule")

    T.card(s, M, 1.42, SW - 2 * M, 1.28, fill=DARK, line=None)
    T.shape(s, M, 1.42, 0.09, 1.28, fill=EMERALD)
    tf = T.text(s, M + 0.45, 1.56, SW - 2 * M - 0.9, 1.0, anchor=MSO_ANCHOR.MIDDLE)
    T.par(tf, "\u201cData and validated agricultural rules determine risk and "
              "allowed actions. AI explains validated results; AI does not "
              "independently decide what a farmer should do.\u201d",
          size=15.5, color=WHITE, bold=True, font=HEAD, first=True, after=0,
          line=1.1)

    tf = T.text(s, M, 2.80, SW - 2 * M, 0.35)
    T.par(tf, "The decision pipeline", size=12, color=SLATE, bold=True,
          font=HEAD, first=True, after=0)

    stages = [
        ("Inputs", "Live weather (Open-Meteo + calibrated fallback), farmer "
                   "observations, ground measurements."),
        ("Evidence", "Typed evidence carrying source, reliability, strength and "
                     "freshness."),
        ("Risk rules", "Versioned deterministic rules map evidence \u2192 severity, "
                       "with no randomness."),
        ("Safety gate", "Validates every action and injects AVOID interceptions "
                        "for hazards."),
        ("Action library", "Pre-stored expert plans: DO NOW, DO NEXT, AVOID, "
                           "MONITOR, ESCALATE."),
        ("Explain & verify", "AI explains the validated result; a field worker "
                             "verifies; the outcome is logged."),
    ]
    gap = 0.24
    cw = 1.80
    y = 3.15
    h = 2.05
    for i, (t, d) in enumerate(stages):
        x = M + i * (cw + gap)
        T.card(s, x, y, cw, h)
        T.shape(s, x + 0.15, y + 0.15, 0.30, 0.30, fill=GREEN,
                kind=T.MSO_SHAPE.OVAL)
        tfn = T.text(s, x + 0.15, y + 0.215, 0.30, 0.24)
        T.par(tfn, str(i + 1), size=10.5, color=WHITE, bold=True, font=HEAD,
              align=PP_ALIGN.CENTER, first=True, after=0)
        tf = T.text(s, x + 0.15, y + 0.55, cw - 0.30, 0.4)
        T.par(tf, t, size=11, color=SLATE, bold=True, font=HEAD, first=True,
              after=0)
        tf = T.text(s, x + 0.15, y + 0.90, cw - 0.30, 1.05)
        T.par(tf, d, size=8.5, color=GRAY, first=True, after=0, line=1.04)
        if i < len(stages) - 1:
            T.shape(s, x + cw + 0.035, y + 0.30, gap - 0.07, 0.17, fill=EMERALD,
                    kind=T.MSO_SHAPE.RIGHT_ARROW)

    T.card(s, M, 5.42, SW - 2 * M, 0.66, fill=MINT, line=None)
    tf = T.text(s, M + 0.32, 5.54, SW - 2 * M - 0.64, 0.45)
    T.par(tf, "The AI layer runs strictly after these steps. It may explain a "
              "validated result, but it cannot alter severity, change an action "
              "plan, or override a safety interception \u2014 and the product still "
              "works when Gemini is unavailable.",
          size=10.5, color=RGBColor(0x06, 0x5F, 0x46), bold=True, first=True,
          after=0, line=1.06)

    T.card(s, M, 6.22, SW - 2 * M, 0.60, fill=LIGHT, line=None)
    tf = T.text(s, M + 0.32, 6.33, SW - 2 * M - 0.64, 0.42)
    T.par(tf, "Persistence  \u00b7  MongoDB hydrate-on-boot, write-behind "
              "(debounced \u2248800 ms), transparent in-memory fallback  \u00b7  "
              "health at GET /api/system/persistence",
          size=10, color=SLATE, first=True, after=0)
    T.footer(s)
    T.notes(s, "The credibility slide. Explain WHY determinism matters: "
               "agricultural advice is safety-critical, so a stochastic "
               "decision-maker is unacceptable \u2014 and determinism makes the "
               "system testable.")
    return s


def slide_engine(prs):
    s = T.slide(prs)
    T.bg(s, WHITE)
    T.header(s, "Intelligence", "Deterministic Risk Engine & Content Library")

    LW = 5.85
    tf = T.text(s, M, 1.40, LW, 0.35)
    T.par(tf, "Paddy waterlogging severity ladder (as implemented)",
          size=11.5, color=SLATE, bold=True, font=HEAD, first=True, after=0)

    rows = [
        ("CRITICAL", "rainfall \u2265 100 mm, or \u2265 75 mm with \u2265 36 h standing "
                     "water (poor drainage)", RED),
        ("HIGH", "rainfall \u2265 60 mm, or \u2265 24 h standing water, or \u2265 15 cm "
                 "depth", RGBColor(0xC2, 0x41, 0x0C)),
        ("MODERATE", "rainfall \u2265 30 mm, or standing water \u2265 8 h", AMBER),
        ("LOW", "rainfall \u2265 15 mm, or any standing water > 0 h",
         RGBColor(0x94, 0xA3, 0xB8)),
        ("NORMAL", "otherwise", RGBColor(0x64, 0x74, 0x8B)),
    ]
    y = 1.76
    for name, cond, accent in rows:
        T.card(s, M, y, LW, 0.52, fill=LIGHT, line=None, radius=0.14)
        T.shape(s, M + 0.12, y + 0.10, 1.05, 0.32, fill=accent,
                kind=T.MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.3)
        tfn = T.text(s, M + 0.12, y + 0.16, 1.05, 0.24)
        T.par(tfn, name, size=8.5, color=WHITE, bold=True, font=HEAD,
              align=PP_ALIGN.CENTER, first=True, after=0)
        tf = T.text(s, M + 1.30, y + 0.075, LW - 1.42, 0.4,
                    anchor=MSO_ANCHOR.MIDDLE)
        T.par(tf, cond, size=9.5, color=SLATE, first=True, after=0, line=1.02)
        y += 0.58

    rx = M + LW + 0.32
    rw = SW - M - rx

    T.card(s, rx, 1.64, rw, 1.62, fill=LIGHT, line=None)
    tf = T.text(s, rx + 0.28, 1.78, rw - 0.56, 0.35)
    T.par(tf, "12 pre-stored expert action plans", size=12.5, color=SLATE,
          bold=True, font=HEAD, first=True, after=0)
    tf = T.text(s, rx + 0.28, 2.18, rw - 0.56, 1.0)
    T.bullets(tf, [
        "Waterlogging \u2014 5 severities; heat stress and pest / disease cover "
        "every severity the engine emits.",
        "Keyed by ruleFamily::riskLevel \u2014 plans appear instantly, with no "
        "generation step, identical on every recurrence.",
    ], size=9.5, color=SLATE, first=True, after=6)

    T.card(s, rx, 3.40, rw, 1.62, fill=DARK, line=None)
    tf = T.text(s, rx + 0.28, 3.54, rw - 0.56, 0.35)
    T.par(tf, "Safety gate", size=12.5, color=WHITE, bold=True, font=HEAD,
          first=True, after=0)
    tf = T.text(s, rx + 0.28, 3.94, rw - 0.56, 1.05)
    T.bullets(tf, [
        "Validates every plan before display; blocks hazardous actions and "
        "escalates to a human when evidence is thin.",
        "The engine never recommends a pesticide \u2014 verified diagnosis first.",
    ], size=9.5, color=PALE, first=True, after=6)

    T.card(s, rx, 5.16, rw, 0.62, fill=WHITE, line=BORDER)
    T.shape(s, rx, 5.16, rw, 0.055, fill=RED)
    tf = T.text(s, rx + 0.24, 5.32, rw - 0.48, 0.42)
    T.par(tf, "AVOID:  \u201cDo not apply granular urea into standing flood water "
              "\u2014 it is lost and worsens the anaerobic condition.\u201d",
          size=9, color=SLATE, italic=True, first=True, after=0, line=1.04)

    T.card(s, M, 5.42, LW, 1.02, fill=MINT, line=None)
    tf = T.text(s, M + 0.28, 5.53, LW - 0.56, 0.85)
    T.par(tf, "Rule priority:  an explicitly reported type always routes to its "
              "dedicated rule; ambient signals only auto-route \u2018Something else\u2019.",
          size=9.5, color=RGBColor(0x06, 0x5F, 0x46), first=True, after=4,
          line=1.05)
    T.par(tf, "Review cadence:  CRITICAL 3 h / HIGH 6 h / otherwise 12 h.  "
              "HIGH and CRITICAL auto-escalate to the field-worker queue.",
          size=9.5, color=RGBColor(0x06, 0x5F, 0x46), bold=True, after=0,
          line=1.05)
    T.footer(s)
    T.notes(s, "Heat stress adds CRITICAL at \u226540 \u00b0C during flowering or "
               "panicle initiation. Pest / disease deliberately never recommends "
               "a pesticide.")
    return s


def slide_product(prs):
    s = T.slide(prs)
    T.bg(s, WHITE)
    T.header(s, "Product Tour", "The Product in Action")

    tf = T.text(s, M, 1.40, 5.0, 0.4)
    T.par(tf, "Assessed in seconds. Validated before it is ever shown.",
          size=13, color=SLATE, bold=True, font=HEAD, first=True, after=0)

    tf = T.text(s, M, 1.88, 5.0, 4.6)
    T.bullets(tf, [
        ("DO NOW", True),
        "Immediate physical interventions \u2014 e.g. cut the drainage breach at "
        "the lowest bund corner.",
        ("AVOID (safety interceptions)", True),
        "Harmful actions the Safety Gate blocks, such as urea into standing "
        "water or contact pesticide sprays.",
        ("MONITOR", True),
        "Symptoms and submergence thresholds to watch, with a review deadline.",
        ("WHY THIS RECOMMENDATION?", True),
        "Plain-language explanation generated strictly from the validated "
        "result.",
        ("Evidence view", True),
        "Source, reliability and freshness \u2014 \U0001F7E2 Fresh  \U0001F7E1 Aging  "
        "\U0001F534 Stale.",
        ("Reassess and resolve", True),
        "New ground measurements recalculate live; the outcome is recorded.",
    ], size=10.5, color=SLATE, first=True, after=6)

    ix = M + 5.0 + 0.35
    iw = SW - M - ix
    T.img_fit(s, os.path.join(T.SHOTS, "actions.png"), ix, 1.72, iw, 4.0)
    tf = T.text(s, ix, 5.82, iw, 0.6)
    T.par(tf, "Emergency Action Screen \u2014 /incidents/:id", size=10.5,
          color=SLATE, bold=True, font=HEAD, align=PP_ALIGN.CENTER, first=True,
          after=2)
    T.par(tf, "DO NOW, AVOID and MONITOR for a live high-risk paddy incident.",
          size=9.5, color=GRAY, align=PP_ALIGN.CENTER, after=0, line=1.04)

    T.card(s, M, 6.02, 5.0, 0.72, fill=LIGHT, line=None)
    tf = T.text(s, M + 0.28, 6.14, 4.44, 0.5)
    T.par(tf, "Also shipped: the farmer dashboard with live weather, a 3-step "
              "reporting wizard, the field-worker verification queue, auditable "
              "history, and a scenario simulator.",
          size=9, color=SLATE, first=True, after=0, line=1.04)
    T.footer(s)
    T.notes(s, "If time allows, demo only two things live: the AVOID interception "
               "and the simulator escalating to CRITICAL.")
    return s


def slide_scope(prs):
    s = T.slide(prs)
    T.bg(s, WHITE)
    T.header(s, "Forward Look", "Scope: Shipped, Parked and Next")

    cols = [
        ("Shipped today", GREEN, [
            "Dashboard, 3-step reporting wizard, emergency action screen.",
            "Field-worker verification queue and auditable, non-destructive "
            "history.",
            "12-plan expert library with safety-gate interceptions.",
            "Scenario simulator with instant reassessment everywhere.",
            "Optional MongoDB persistence \u2014 hydrate-on-boot, in-memory fallback.",
            "31 automated tests passing; 19 documented API routes.",
        ]),
        ("Parked for the demo", AMBER, [
            "Field Map (/field) and Plot Registry (/plots) are disabled \u2014 404, "
            "not linked in the navigation.",
            "The registry could only find plots registered inside FarmRescue; "
            "there is no government land-records verification.",
            "Two concurrent dev servers overwrote each other in the shared "
            "database, so the feature looked broken in front of evaluators.",
            "Implementation is preserved, not deleted \u2014 a one-step restore when "
            "a Bhulekh / ULPIN-style API and a single-writer data policy exist.",
        ]),
        ("Next", RGBColor(0x0E, 0x74, 0x90), [
            "P1 \u00b7 Hardening \u2014 rule-boundary tests, a real scheduled "
            "reassessment loop, live weather evidence on incident creation, "
            "basic role authentication.",
            "P2 \u00b7 Breadth \u2014 multi-crop action plans, photo evidence "
            "capture \u2192 storage \u2192 verification, more agro-climatic regions.",
            "P3 \u00b7 Depth \u2014 offline-first PWA, sensor / IoT intake, outcome "
            "learning loop, FPO multi-tenancy, land-records integration.",
        ]),
    ]
    w = 3.90
    for i, (title, accent, items) in enumerate(cols):
        x = M + i * (w + 0.20)
        T.card(s, x, 1.42, w, 2.42)
        T.shape(s, x, 1.42, w, 0.07, fill=accent)
        tf = T.text(s, x + 0.24, 1.62, w - 0.48, 0.35)
        T.par(tf, title, size=12.5, color=SLATE, bold=True, font=HEAD,
              first=True, after=0)
        tf = T.text(s, x + 0.24, 2.02, w - 0.48, 1.72)
        for j, it in enumerate(items):
            T.par(tf, "\u2022  " + it, size=8.5, color=GRAY, after=5,
                  first=(j == 0), line=1.03)

    shots = [("dashboard.png", "Farmer Dashboard \u2014 /"),
             ("wizard.png", "Reporting Wizard \u2014 /incidents/new"),
             ("fieldworker.png", "Field Worker Queue \u2014 /field-worker")]
    for i, (fn, cap) in enumerate(shots):
        x = M + i * (w + 0.20)
        T.img_fit(s, os.path.join(T.SHOTS, fn), x, 4.02, w, 1.82)
        tf = T.text(s, x, 5.92, w, 0.4)
        T.par(tf, cap, size=9.5, color=SLATE, bold=True, font=HEAD,
              align=PP_ALIGN.CENTER, first=True, after=0)

    T.card(s, M, 6.35, SW - 2 * M, 0.6, fill=MINT, line=None)
    tf = T.text(s, M + 0.3, 6.47, SW - 2 * M - 0.6, 0.4)
    T.par(tf, "Known gaps, stated plainly:  no authentication yet; the "
              "waterlogging library is paddy-centric; incident creation seeds a "
              "fixed 65 mm rainfall reading; \u201cnext reassessment scheduled\u201d is "
              "display-only; no real SMS / WhatsApp delivery.",
          size=9.5, color=RGBColor(0x06, 0x5F, 0x46), bold=True, first=True,
          after=0)
    T.footer(s)
    T.notes(s, "Volunteer the parked scope and the gaps unprompted \u2014 it buys "
               "credibility for everything else. Do not run two dev servers "
               "against the same data during the demo.")
    return s


def slide_close(prs):
    s = T.slide(prs)
    T.bg_gradient(s, FOREST, RGBColor(0x05, 0x1A, 0x10), 45)
    T.shape(s, 9.9, -1.6, 5.0, 5.0, fill=RGBColor(0x12, 0x4A, 0x2E),
            kind=T.MSO_SHAPE.OVAL)

    tf = T.text(s, M + 0.2, 0.72, 11.6, 0.4)
    T.par(tf, "CLOSING", size=12, color=EMERALD, bold=True, first=True, after=0)

    tf = T.text(s, M + 0.2, 1.18, 11.6, 1.9)
    T.par(tf, "When the farm goes wrong at 3 a.m.,", size=29, color=WHITE,
          bold=True, font=HEAD, first=True, after=2)
    T.par(tf, "FarmRescue already knows what to do.", size=29, color=EMERALD,
          bold=True, font=HEAD, after=0)

    T.shape(s, M + 0.2, 3.30, 1.0, 0.075, fill=EMERALD)

    tf = T.text(s, M + 0.2, 3.58, 11.6, 1.0)
    T.par(tf, "A deterministic agronomic decision engine, an expert-authored "
              "response library, a safety gate that blocks harmful advice, and a "
              "human verification loop \u2014 with AI strictly in the role of "
              "explainer.",
          size=13, color=PALE, first=True, after=0, line=1.14)

    T.stat_strip(s, 4.72, [
        ("31", "automated tests passing (zero-dependency Node runner)"),
        ("12", "expert-authored action plans (ICAR / IRRI-aligned)"),
        ("19", "documented REST API routes"),
        ("0", "decisions authored by the AI layer"),
    ])

    tf = T.text(s, M + 0.2, 6.30, 11.6, 0.8)
    T.par(tf, "Thank you  \u00b7  Questions welcome", size=19, color=WHITE,
          bold=True, font=HEAD, first=True, after=3)
    T.par(tf, "FarmRescue \u2014 Emergency Agricultural Early-Warning & Response "
              "Platform \u00b7 October 2026", size=10.5,
          color=RGBColor(0x9C, 0xD8, 0xB8), after=0)
    T.notes(s, "Close on determinism, then invite questions \u2014 they will be about "
               "safety and trust, which is exactly the ground the system is built "
               "to defend.")
    return s


def main():
    prs = Presentation()
    prs.slide_width = Inches(SW)
    prs.slide_height = Inches(SH)
    prs.core_properties.title = ("FarmRescue \u2014 7-slide project brief")
    prs.core_properties.author = "FarmRescue Project"
    prs.core_properties.subject = "Short official project briefing"

    slide_cover(prs)
    slide_problem(prs)
    slide_solution(prs)
    slide_engine(prs)
    slide_product(prs)
    slide_scope(prs)
    slide_close(prs)

    prs.save(OUT)
    print("Wrote %s" % OUT)
    print("Slides: %d" % len(prs.slides._sldIdLst))


if __name__ == "__main__":
    main()
