---
name: technical-writing
description: Write or review technical documents, READMEs, design notes, PR descriptions and commit messages in English or Chinese, first choosing the document's mode and then applying sentence and typography rules. Use it for documentation work.
disable-model-invocation: true
---

# Technical writing

Aim for text that a tired engineer understands in one reading. Use the real names of symbols, files,
flags, and commands. Prefer the words developers use in conversation, and explain a named pattern
where it first appears. Where the project has its own style guide, that guide takes precedence over
these rules. When following a rule would hurt a sentence, improve the sentence by other means.

## Choose the mode

Give each document one mode, as Diátaxis defines them. Move content that belongs to another mode into
its own document, and link to it.

- **Tutorial.** The reader learns by doing. State what they will build. Each step produces something
  visible, and the text says what to expect. Keep explanation to a clause with a link.
- **How-to guide.** Steps toward a goal, for a reader who knows the basics. It contains only actions,
  may branch, and is titled with the task.
- **Reference.** Facts to look up. It only describes, completely and with certainty, and follows the
  structure of what it describes.
- **Explanation.** Understanding and reasons for one bounded topic, such as decisions, history,
  constraints, and alternatives. Opinion belongs here and in no other mode.

## Core prose rules

- Begin with the content, and end on a specific fact or next step.
- Use a period or a comma where a dash would go. Use a colon only to introduce a list or an example.
- Give each claim at most one hedge, "may" in English or "可能" in Chinese.
- Give the mechanism, the number, or the source instead of a general claim.
- Give each thing one name, and keep using it.
- Bold only what a scanning reader must find.

For a full pass over finished text, use [unslop](../unslop/SKILL.md).

## English sentences

- Address the reader as "you", write in the present tense, and say who does what. Use the passive
  only when the actor is unknown or does not matter.
- Write instructions as commands. Place a condition or warning before the step it applies to, and put
  the common case first.
- Write one instruction per sentence, and one thought per sentence elsewhere. Split an instruction
  longer than about 20 words and any other sentence longer than about 25.
- Keep articles and structural words such as "that". Give each word one meaning, and each action one
  word.
- Place "only" and "not" next to the word they modify. Break up long chains of nouns. Make each "it",
  "they", and "this" refer to one obvious thing.
- Write sentence-case headings that state the point, with one top-level heading per page and no
  skipped levels.
- Use a numbered list for an ordered sequence and bullets otherwise. Lead into each list with a full
  sentence, and keep its items parallel.
- Write link text that says where the link leads. Put code in code font and UI labels in bold. Use
  serial commas and straight quotes, and leave out "etc.".
- Avoid idioms, Latin abbreviations, slashes, "(s)", and "please". Keep "simply", "easy", and
  "quickly" out of procedures. End sentences with periods, not semicolons. Make any text in
  parentheses a complete grammatical unit, and point "this" or "which" at a noun, never at a whole
  clause.

## Chinese sentences

These rules draw on the Chinese copywriting guidelines (中文文案排版指北) and Ruan Yifeng's Chinese
technical writing style guide (中文技术文档写作规范). The quote style is this package's choice, and
the ellipsis follows the national punctuation standard GB/T 15834.

- **Spacing.** Put a half-width space between Chinese and English text, and between Chinese text and
  a number. Put a space between a number and a unit written in English, as in "16 GB". Put none
  before % or the degree sign of an angle, as in "15%" and "90°". Put no space next to full-width
  punctuation, as in "他的电脑是 MacBook Air。".
- **Punctuation.** Use full-width punctuation in Chinese sentences, and half-width punctuation inside
  a complete English sentence. Separate listed items with the enumeration comma (、), English items
  included, as in "Google、Facebook 和腾讯". Quote with “” and nest with ‘’. Write an ellipsis as six
  dots across two characters, ……, never as "。。。" or "...", and do not combine it with "等". Never
  repeat a punctuation mark. End no heading with a period, comma, enumeration comma, semicolon, or
  colon.
- **Characters.** Use half-width digits. Spell proper nouns as their owners do, such as GitHub and
  iOS, and avoid unofficial abbreviations.
- **Sentences.** Keep a clause to about 20 characters and never past 40, and keep a sentence joined
  by commas under about 100. Prefer simple and coordinate sentences to nested ones. Use the active
  voice and the positive form, and avoid double negatives.

## PR descriptions and commit messages

All the rules above apply except the document modes. A PR description is a briefing a reviewer can
read in under a minute. It says what changed, why, how it was checked, and what is left. Take the
reason from the commits, the issue, or the user, and say so when none is recorded. Link logs,
SHA lists, and metric tables instead of pasting them. Follow the project's language and format rules
for commits and PRs. Each count or file-tree claim must hold at the commit that introduces it.
Include the command that regenerates it.
