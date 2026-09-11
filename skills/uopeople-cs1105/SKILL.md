---
name: uopeople-cs1105
description: Use for any UoPeople CS 1105 (Digital Electronics & Computer Architecture / "Digital EC & ARCH") work - Learning Journals, Discussion Forum posts, peer replies, or general "help me finish this unit's coursework" requests for this course. Triggers on "CS1105"/"CS 1105", "Digital EC & ARCH", any Unit 1-9 mention, or the course's subject matter - Boolean algebra, truth tables, Karnaugh maps, logic gates, combinational/sequential circuits, flip-flops, ALU, computer arithmetic, adders, memory, CPU/computer architecture, assembler, Logisim, TECS, Ndjountche textbook - regardless of whether the words "assignment," "discussion," or "journal" appear. Also triggers when the user wants a draft reply to classmates' posts for this course, wants their own writing for this course checked for sounding AI-generated/"like ChatGPT," or wants it rewritten to sound human. Pulls the real syllabus and past submissions from disk to ground answers and match the student's voice. Not for other named courses or general digital-logic/AI-detection questions with no tie-in to this specific course.
---

# UoPeople CS 1105 coursework

This skill exists because two things have to both be true for this course: the content has to be
right (grounded in the actual assigned readings, not invented), and the prose has to sound like one
specific person wrote it under time pressure, not like a language model produced it. Skip either
half and the grade suffers - a wrong Boolean simplification loses rubric points just as fast as a
paragraph full of em dashes and "in conclusion" reads as generated.

## Step 1: Find out what unit this is and load what's on disk

Course root: `/home/festo/Documents/University of People/Study Course Units/Digital EC & ARCH/`
(a fallback path may exist at `/home/festo/Documents/University of People/Digital IT/` for the same
course - check both, they've been used interchangeably).

- Read `CS 1105 Syllabus_2604.pdf` once per session if you haven't already - it has the 9-unit
  schedule, the CLOs, and the grading weights. This tells you which unit's rubric criteria map to
  which learning outcome, which is worth restating in your own words in the post since Q "connection
  to course materials" is graded separately from raw correctness.
- Look for a `Unit<N>/` folder matching the unit in question. If earlier units exist, skim the
  previous unit's submitted `.docx` or discussion text (not just the current one) - it is the single
  best source for this student's actual vocabulary, sentence rhythm, and citation habits. Matching
  that voice matters more than matching some generic "academic tone."
- The weekly Learning Guide (readings list, video links, discussion prompt, rubric table) usually is
  not a file on disk - UoPeople delivers it inside Brightspace, so the user pastes it into the
  conversation. Treat pasted unit content as the primary source of truth for that unit's readings and
  grading criteria, above anything you might recall about the course from training.

If you can't find a rubric or reading list anywhere (neither on disk nor pasted), ask for it before
drafting rather than guessing at what's being graded - the rubric weights change what deserves the
most words.

## Step 2: Ground the technical content before writing a word of prose

Every factual or technical claim in the draft needs to trace back to something real:

- The assigned textbook is Ndjountche, T. (2016). *Digital electronics 1: Combinational logic
  circuits*. Wiley. It's behind the UoPeople library paywall, so you cannot fetch its actual text.
  Cite it by the chapter and section numbers the reading list already gives you (e.g. "Section 3.2:
  Multiplexer") and describe concepts at the level of generality the reading list's own summary
  describes - never invent a page number, a direct quote, or a specific claim you can't source from
  what's in front of you.
- For anything with a public URL - Logisim/Logisim-evolution documentation, a YouTube video's own
  description or transcript, a vendor datasheet - actually fetch it (WebFetch/WebSearch) and use what
  it really says instead of paraphrasing from memory. If a page won't load or a transcript isn't
  available, say so and cite what you can verify instead of filling the gap with a plausible-sounding
  guess.
- If the assignment wants a Logisim circuit, work out the actual logic (truth table, Boolean
  simplification, gate selection) yourself first, the same way you would for any digital-design
  problem - see whether a `.circ` file already exists for this unit before building one from scratch.
- Do not add a citation to something you didn't actually check. An uncited but correct explanation
  beats a citation propping up a claim you made up.

## Step 3: Write it like the student actually wrote it

This is the part that most needs explaining rather than just listing rules, because the goal isn't
"trick a detector" - it's that AI writing and human writing really do have different statistical
shapes, and a student handing in prose with the AI shape gets flagged whether or not it's original
thought. The fix is to write the way people actually write, not to obfuscate afterward.

**Read `references/human-voice.md` before drafting anything longer than a couple of sentences.** It
has the concrete patterns to avoid and, more importantly, what to do instead - it's short enough to
read in full rather than skim.

The short version: real student writing has uneven sentence length, commits to a claim instead of
hedging every sentence, uses plain connective words instead of essay-transition phrases, and sounds
like it was thought through once rather than polished into symmetry. Read your own draft back after
writing it and ask whether every sentence is doing the same job at the same length as its neighbors -
if so, break that up before moving on.

## Step 4: Match the actual submission format

Check the pasted Submission Instructions for the specific unit - they vary slightly, but the two
recurring shapes are:

- **Assignment Activity** (Learning Journal, etc.): a Word document, double-spaced, Times New Roman,
  12pt, 1" margins, with APA references and (per the syllabus) a Logisim circuit depiction where
  applicable. Use the `docx` skill to produce this properly rather than hand-rolling XML. Follow the
  exact section structure the assignment instructions lay out - these rubrics grade section by
  section, so an assignment that skips or merges a required section loses points regardless of prose
  quality.
- **Discussion Forum post**: plain text ready to paste into Brightspace, 500-750 words with the word
  count stated at the end, APA references with clickable links, and - per this course's rubric -
  ending on one open question for classmates. Don't build a Word doc for this; the user is pasting it
  directly into a textbox.

For peer replies: the rubric wants 3-4 substantive sentences (75+ words) that actually engage with
what a specific classmate wrote. You don't have access to classmates' posts unless the user pastes
them in, so ask for the peer's post text rather than inventing a generic-sounding reply to reply to.

## Step 5: Before handing it back

- Re-read for the AI-writing tells one more time, out loud in your head - it's easy to reintroduce
  them while fixing something else.
- Check word count against the stated range.
- Check every citation has a matching, correctly formatted entry in the reference list and vice
  versa.
- If it's a Discussion post, confirm it actually ends with one question, not a summary sentence
  dressed up as one.
