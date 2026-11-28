---
name: technical-writing
description: Write or review technical documents, READMEs, design notes, PR descriptions and commit messages in English or Chinese, choosing the document mode first and then applying sentence and typography rules. User-invoked.
disable-model-invocation: true
---

# Technical writing

Write so a tired engineer understands on the first read. Use the real name of each symbol, file,
flag and command. Use the words developers say aloud, and explain a named pattern the first time
it appears. When a rule makes a sentence worse, fix the sentence another way.

## Pick the mode first

Give each document one mode, following Diátaxis. When content belongs to another mode, split it
out and link to it.

- **Tutorial:** learning by doing. Say what the learner builds; every step produces a visible
  result, and the text says what the learner should see. Explanation gets one clause and a link.
- **How-to guide:** steps to a goal for a competent reader. Actions only, forks allowed, titled by
  the task.
- **Reference:** facts to look up. Describe only, completely and with certainty, mirroring the
  structure of the thing described.
- **Explanation:** understanding and reasons for one bounded topic: decisions, history,
  constraints and alternatives. Opinion belongs here and nowhere else.

## Apply the core prose rules

- Start with the content and end with a specific fact or plan.
- Use a period or a comma where a dash would go. A colon only introduces a list or an example.
- Use at most one hedge: "may" in English, "可能" in Chinese.
- Name the mechanism, number or source instead of a general claim.
- Give each thing one name and keep it.
- Bold only what a reader must find while scanning.

For a full pass over finished text, use [unslop](../unslop/SKILL.md).

## Write English sentences

- Address the reader as "you", in the present tense, and name who does what. Use the passive only
  when the actor is unknown or irrelevant.
- Write instructions as commands. Put the condition or warning before the step it guards, and the
  common case first.
- Give one instruction per sentence and one thought per sentence elsewhere. Split instructions
  longer than about 20 words and other sentences longer than about 25.
- Keep articles and the small words that show structure, such as "that". Give each word one
  meaning and each action one word.
- Keep "only" and "not" next to the word they modify. Break up long noun strings. Make every "it",
  "they" and "this" point at one obvious thing.
- Use sentence-case headings that carry the point, one top-level heading per page and no skipped
  levels.
- Number sequences and bullet everything else. Introduce a list with a complete sentence and keep
  items parallel.
- Link with words that say where the link goes. Put code in code font and UI labels in bold. Use
  serial commas, straight quotes and no "etc.".
- Avoid idioms, Latin abbreviations, slashes, "(s)" and "please". Avoid "simply", "easy" and
  "quickly" in procedures. Use periods rather than semicolons. Make text in parentheses a full
  grammatical unit, and let "this" or "which" point at a noun, not at a whole clause.

## Write Chinese sentences

These rules follow the Chinese copywriting guidelines (中文文案排版指北) and Ruan Yifeng's
Chinese technical document style guide (中文技术文档写作规范).

- **Spacing.** Put a half-width space between Chinese and English text and between Chinese and
  numbers, and between a number and an untranslated unit: "16 GB". Put no space around full-width
  punctuation: "他的电脑是 MacBook Air。".
- **Punctuation.** Use full-width punctuation in Chinese sentences and half-width punctuation
  inside a complete English sentence. Use the enumeration comma (、) between listed items, also
  for English items: "Google、Facebook 和腾讯". Quote with “” and nest with ‘’. Write an ellipsis
  as ⋯⋯, not "。。。" or "...", and do not pair it with "等". Repeat no punctuation mark. Keep
  clause-ending marks out of heading ends.
- **Characters.** Use half-width digits. Write proper nouns in their official case, such as
  GitHub and iOS, and avoid nonstandard abbreviations.
- **Sentences.** Keep a clause to about 20 characters; split one past about 40. Prefer simple and
  coordinate sentences to nested ones. Use the active voice and the affirmative form, and avoid
  double negatives.

## Write PR descriptions and commit messages

Every rule above except the document modes applies. A PR description is a briefing a reviewer
reads in under a minute: what changed, why, how it was verified and what remains. Link logs, SHA
lists and metric tables instead of pasting them. Follow the project's language and format policy
for commits and PRs. Make every count or file-tree claim true at the commit that lands it, and
give the command that regenerates it.
