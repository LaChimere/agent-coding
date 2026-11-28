---
name: unslop
description: Edit English or Chinese text to remove AI writing patterns while keeping its meaning and intended tone. User-invoked for replies, documents, PR descriptions, commit messages and comments.
disable-model-invocation: true
---

# Unslop

Edit the text so it reads as written by a careful engineer. Keep the meaning, facts and intended
tone. Scan the text against the rules for its language, rewrite every hit, then reread once to
confirm nothing changed in meaning. Return the edited text; when the user asks, list the changes
by rule.

## Rules for both languages

- **Dashes.** Use a period or a comma where a dash would go. Parentheses do not stand in for a
  dash either. "The cache — which is shared — expires hourly" becomes "The cache is shared. It
  expires hourly."
- **Colons.** A colon introduces a list or an example. Inside a sentence, state the point
  directly: "The reason is simple: the cache expired" becomes "The cache expired."
- **One hedge.** Use at most one hedge, "may" in English and "可能" in Chinese.
- **Arrows and shorthand.** Write whole sentences with their verbs and small words. "A → B"
  becomes "A calls B".
- **Concrete nouns.** Name the actual thing instead of an abstract metaphor such as substrate,
  wedge, vector, nexus, primitive, surface, scaffolding, paradigm, ratchet, north star or
  flywheel. An established term of the domain or project stays, for example "harness" for a
  verification or evaluation harness.
- **Openers and closers.** Start with the content. End with a specific fact or plan, not a
  summary of what was said, an offer of more help or a wish that it helps.
- **Emphasis.** Bold only what a reader must find while scanning. Use plain text for names and
  acronyms. A bold label that only restates its line goes. Use no decorative emojis.
- **One name per thing.** Repeat the same name for the same thing; a synonym suggests a second
  thing.
- **Concrete claims.** Name the mechanism, number or source. Replace "experts believe" with the
  source or delete it. Cut a sentence that could appear unchanged in another project's text.
- **Lists of three.** Give as many items as the content has, instead of padding or trimming to
  three.

## English

- Quotes are straight: "cache", not “cache”.
- Headings use sentence case: "Skill loading evidence".
- Cut AI vocabulary: additionally, crucial, delve, enhance, foster, landscape, pivotal, showcase,
  testament, underscore, vibrant.
- Write "is" or "has" instead of "serves as", "stands as", "boasts" or "features".
- State the point instead of "not just X, but Y".
- Cut trailing "-ing" phrases that add no fact, such as ", ensuring reliability".
- Use "from X to Y" only for a real range.
- Cut filler: "in order to" becomes "to"; "it is important to note that" goes.
- Use the plain word: "use", not "utilize" or "leverage".
- Prefer the active voice and name the actor, unless the actor is unknown or irrelevant.
- Replace an adverb with a stronger verb or a number.
- Use the literal phrase instead of a metaphor, aphorism or personified code.
- Keep one idea per sentence, and split a sentence the reader has to reread.

## Chinese

- **Quotes.** Chinese text keeps full-width “” quotes, with ‘’ for a quote inside a quote.
- **Contrast frames.** State the claim directly instead of "不是 X，而是 Y" or
  "不仅……而且……".
- **"一个".** Write "一个" only when the count matters: "这是一个问题" becomes "这是问题" or names
  the problem.
- **Intensifiers.** Replace "真正", "确实", "关键", "核心", "非常" and "彻底" with the fact that
  makes the point.
- **Jargon.** Use the concrete verb instead of 赋能、抓手、闭环、落地、对齐、沉淀、打通、颗粒度 or
  链路.
- **Nominalized verbs.** "进行优化" becomes "优化"; "对配置进行修改" becomes "修改配置";
  "通过……来……" becomes the plain verb.
- **Active voice.** Prefer the active voice: "此软件尚未被安装" becomes "尚未安装此软件".
- **Affirmative statements.** State the positive form and avoid double negatives: "没有删除权限的
  用户不能删除此文件" becomes "用户必须有删除权限才能删除此文件".
- **Stock phrases.** Cut "值得注意的是", "需要注意的是", "总的来说", "综上所述", "让我们",
  "希望对你有帮助" and "如有需要请随时告诉我".
- **Sentence length.** Keep one point per sentence. Aim for about 20 characters per clause and
  split a sentence that runs past about 40.
