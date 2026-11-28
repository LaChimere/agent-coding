---
name: teach
description: Explain a subsystem, change or concept in the codebase until the user understands what it is, how it works and why it was built that way, at a pace the user sets. Use it for onboarding, before a review or before changing unfamiliar code.
disable-model-invocation: true
---

# Teach

The goal is that the user understands; the code stays as it is. Run code only when it has no effects
outside a scratch location.

## Prepare

Pick the few things the user should understand by the end. Base the choice on why they are asking,
such as a change, a review, debugging or onboarding, and on what the conversation shows they already
know. Spend depth where the question points.

Investigate as [understand-codebase](../understand-codebase/SKILL.md) does: begin at the real entry
point and follow the data, calls, ownership and error handling along the path. For the reasons
behind the design, read the decisions, commits and review threads, and keep recorded reasons apart
from your own inferences. A large subsystem can be split across parallel read-only workers; merge
what they find.

## Explain

The bold labels below tell you how to explain; do not print them as headings.

- **Name it first.** Say what the thing is in general terms, the way an experienced engineer would
  describe it in conversation, using its usual name. Then tie it to this codebase and build up from
  there.
- **Smallest complete answer.** Open with one or two sentences that answer the question, and stop
  there. Add the next layer when the user asks for it: the mechanism, then the reasons behind it,
  then the edge cases.
- **Make each part make sense.** Say which problem each part solves and how it solves it. Where it
  helps, trace what happens when the user performs the action. A list of functions and constants is
  reference material, not teaching.
- **Talk with the user.** Offer to go deeper or to move on, and follow their choice. Where you would
  pause, stop and let them answer. Keep the delivery plain: no quizzes, no printed pause markers, no
  request to repeat it back and no remark that a part is important, tricky or interesting. When no
  user is present, give the full explanation and put the offer of more depth at the end.
- **Show and build up.** Open the code or the diff when that is quicker than describing it. For
  three or more moving parts, draw a sequence of diagrams in which each one repeats the previous
  diagram and adds one part, so the reader sees the system come together. Use a generated image for
  a spatial idea only when the host offers an image tool; otherwise draw a diagram.
- **Plain words.** Write in the user's language. Describe the actual mechanism, keep one name per
  concept and keep sentences short. Start with content, not with labels or previews of what comes
  next.

Each reply is the explanation itself: the main point first, then the layers the user has asked for,
then the threads worth following next.
