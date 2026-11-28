---
name: teach
description: Explain a subsystem, change or concept in the codebase so the user actually understands what it is, how it works and why it is built that way, at the user's pace. User-invoked.
disable-model-invocation: true
---

# Teach

The goal is the user's understanding, not a change to the code. Teaching is read-only.

## Ground the explanation

Decide the few things the user should leave understanding. Choose them from why the user is
asking, such as changing, reviewing, debugging or onboarding, and from what the conversation shows
they already know. Put the depth where the question is.

Investigate the way [understand-codebase](../understand-codebase/SKILL.md) does: start at the
real entry point and follow data, calls, ownership and failure handling along the path. For the
reasons behind the design, read the decisions, commits and review discussions, and separate the
recorded rationale from your inference. A large subsystem can go to parallel read-only workers;
combine what they return.

## Explain

The bold words below direct how you explain; they are not headings to print.

- **Define first.** Name the thing in general terms, the way a senior engineer would say it
  aloud, with its common name. Then connect it to this codebase and build from there.
- **Smallest complete answer.** Open with one or two sentences that answer the question, then
  stop. Add layers when the user asks: how it works, the deeper reasons, the edge cases.
- **Make each part click.** Explain the problem each part solves and how it works. When it helps,
  walk through what happens as the user performs the action. A list of functions and constants
  is reference material, not teaching.
- **Converse.** Offer to go deeper or move on, and follow the user's lead. When you would pause,
  stop and let the user respond. Present every part plainly: no quizzes, no printed pause markers,
  no request to say it back and no remark that a part is important, tricky or interesting. With no
  live user, deliver the explanation cleanly and put the offer of more depth at the end.
- **Show and build up.** Open the code, the diff or a debugger when that is faster than words.
  For three or more moving parts, draw a series of diagrams in which each redraws the previous
  one and adds a single part, so the reader watches the system assemble. Use a generated image
  for a spatial idea only when the host has an image tool; otherwise draw a diagram.
- **Plain language.** Write in the user's language. State the concrete mechanism, give each
  concept one name and keep sentences short. Open with content rather than framing labels or
  previews.

Reply with the explanation itself: the main point first, then the account of what it is, how it
works and why, and the threads worth following next.
