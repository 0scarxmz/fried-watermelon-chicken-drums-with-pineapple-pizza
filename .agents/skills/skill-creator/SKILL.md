---
name: skill-creator
description: Create new skills, modify and improve existing skills. Use when users want to create a skill from scratch, update or optimize an existing skill, or test a skill.
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what you want the skill to do and roughly how it should do it
- Write a draft of the skill
- Create a few test prompts and run tests on them
- Help the user evaluate the results
- Rewrite the skill based on feedback from the user's evaluation
- Repeat until you're satisfied

Your job when using this skill is to figure out where the user is in this process and then jump in and help them progress through these stages.

## Creating a skill

### Capture Intent

Start by understanding the user's intent. The current conversation might already contain a workflow the user wants to capture (e.g., they say "turn this into a skill"). If so, extract answers from the conversation history first. The user may need to fill the gaps, and should confirm before proceeding.

1. What should this skill enable the agent to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?

### Interview and Research

Proactively ask questions about edge cases, input/output formats, example files, success criteria, and dependencies.
Check available tools and docs - if useful for research. Come prepared with context to reduce burden on the user.

### Write the SKILL.md

Based on the user interview, fill in these components in `.agents/skills/<skill-name>/SKILL.md`:

- **name**: Skill identifier
- **description**: When to trigger, what it does. Keep it pushy so the model uses it when needed.
- **the rest of the skill :)**

#### Anatomy of a Skill

```
.agents/skills/skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output
```

**Key patterns:**
- Keep SKILL.md under 500 lines.
- Reference files clearly from SKILL.md with guidance on when to read them.
- Prefer using the imperative form in instructions.

### Test Cases

After writing the skill draft, come up with 2-3 realistic test prompts — the kind of thing a real user would actually say. Share them with the user: "Here are a few test cases I'd like to try. Do these look right, or do you want to add more?" Then run them.

## Improving the skill

This is the heart of the loop. You've run the test cases, the user has reviewed the results, and now you need to make the skill better based on their feedback.

1. **Generalize from the feedback.** Look for broader patterns rather than overfitting to specific examples.
2. **Keep the prompt lean.** Remove things that aren't pulling their weight. 
3. **Explain the why.** Try hard to explain the **why** behind everything you're asking the model to do instead of using heavy-handed MUSTs.
4. **Look for repeated work across test cases.** If the agent keeps writing the same helper script, bundle it in the skill's `scripts/` folder.

Apply improvements to the skill, rerun tests, and wait for the user to review. Keep going until the user is happy!
