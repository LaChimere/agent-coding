---
name: unslop
description: Edit English or Chinese text so it no longer reads as machine-written, keeping its meaning and intended tone. Use it on replies, documents, PR descriptions, commit messages and comments.
disable-model-invocation: true
---

# Unslop

Edit the text until it reads like the work of a careful engineer. Preserve the meaning, the facts and
the intended tone. Leave code, commands, identifiers and quotations exactly as they are, and keep the
syntax a format requires, such as the `type(scope):` prefix of a commit subject, commit trailers and
Markdown structure like lists, links and code fences. Where the project has its own style guide,
that guide takes precedence over these rules. Check the text against the rules for its language,
rewrite each match, then read it once more to confirm the meaning did not shift. Return the edited
text, and list the changes by rule when the user asks.

## Both languages

- **Dashes.** Put a period or a comma where a dash would go, and do not swap in parentheses. "The
  cache — which is shared — expires hourly" becomes "The cache is shared. It expires hourly."
- **Colons.** Use a colon to introduce a list or an example. Inside a sentence, make the point
  directly: "The reason is simple: the cache expired" becomes "The cache expired."
- **Hedges.** Give each claim at most one hedge, "may" in English or "可能" in Chinese, and keep any
  uncertainty the evidence supports.
- **Arrows and shorthand.** Write full sentences with their verbs and function words. "A → B"
  becomes "A calls B".
- **Concrete nouns.** Name the real thing rather than an abstract image such as substrate, wedge,
  vector, nexus, primitive, surface, scaffolding, paradigm, ratchet, north star or flywheel. An
  established term of the field or project stays, for example "harness" for a test or evaluation
  harness.
- **Openings and endings.** Begin with the content. End on a specific fact or next step, not on a
  recap, an offer of more help or a wish that it helps.
- **Emphasis.** Bold only what a scanning reader must find; a name is not bold merely because it is a
  name. Remove a bold label that only repeats its line. Use no decorative emoji.
- **Names.** Use the same name for the same thing every time; a synonym suggests a second thing.
- **Specific claims.** Name the mechanism, the number or the source. Replace "experts believe" with
  the source, or delete it. Delete a sentence that would fit unchanged into another project's text.
- **Groups of three.** List as many items as the content has, instead of padding or cutting to three.

## English

- Use straight quotes: "cache", not “cache”.
- Write headings in sentence case: "Skill loading evidence".
- Remove words typical of AI text, such as delve, crucial, pivotal, foster, enhance, showcase,
  underscore, testament, landscape, vibrant and additionally.
- Write "is" or "has" instead of "serves as", "stands as", "boasts" or "features".
- Make the point instead of writing "not just X, but Y".
- Remove trailing "-ing" phrases that add no fact, such as ", ensuring reliability".
- Write "from X to Y" only for a real range.
- Remove filler: "in order to" becomes "to", and "it is important to note that" disappears.
- Choose the plain word: "use", not "utilize" or "leverage".
- Prefer the active voice with a named actor, unless the actor is unknown or does not matter.
- Replace an adverb with a stronger verb or a number.
- Say it literally instead of using a metaphor, an aphorism or code described as a person.
- Give each sentence one idea, and split any sentence a reader has to read twice.

## Chinese

- **Quotes.** Chinese text uses full-width “” quotes, with ‘’ for a quote inside a quote.
- **Contrast frames.** Make the claim directly instead of writing "不是 X，而是 Y" or
  "不仅……而且……".
- **"一个".** Write "一个" only when the number matters: "这是一个常见的问题" becomes "这个问题很常见",
  or names the problem.
- **Intensifiers.** Replace "真正", "确实", "关键", "核心", "非常" and "彻底" with the fact that
  carries the point.
- **Buzzwords.** Replace "赋能", "抓手", "闭环", "落地", "对齐", "沉淀", "打通", "颗粒度" and "链路"
  with the concrete word.
- **Established terms.** A word from the two lists above stays inside an established technical term,
  such as "内存对齐", "数据链路层", "闭环控制", "关键路径" or "CPU 核心".
- **Nominalized verbs.** "进行优化" becomes "优化", "对配置进行修改" becomes "修改配置", and
  "通过……来……" becomes the plain verb.
- **Active voice.** Prefer the active voice: "此软件尚未被安装" becomes "尚未安装此软件".
- **Positive form.** State the positive form and avoid double negatives: "没有删除权限的用户不能删除
  此文件" becomes "用户必须有删除权限才能删除此文件".
- **Stock phrases.** Remove "值得注意的是", "需要注意的是", "总的来说", "综上所述", "让我们",
  "希望对你有帮助" and "如有需要请随时告诉我".
- **Length.** Give each sentence one point. Keep a clause to about 20 characters and never past 40,
  and keep a sentence joined by commas under about 100.
