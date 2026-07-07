# `rolecraft agents-xml`

Generate a `<skills_system>` XML block listing installed skills, compatible with Claude Code and other spec-compliant AI agents.

## Usage

```bash
# Output XML to stdout
rolecraft agents-xml

# Write/replace the XML section in AGENTS.md
rolecraft agents-xml --write
```

## Description

Reads the global and project lockfiles, finds each installed skill's `SKILL.md`, extracts its name and description from YAML frontmatter, and generates a `<skills_system>` XML block that AI agents can parse to discover available skills.

When `--write` is passed, it writes or replaces the `<skills_system>` section in `./AGENTS.md`. Other content in the file is preserved.

## Example output

```bash
$ rolecraft agents-xml

<skills_system>
Only use skills listed in <available_skills> below.
Do not invoke a skill that is already loaded in your context.

<available_skills>
  <skill>
    <name>task-decomposer</name>
    <description>Breaks complex tasks into manageable subtasks</description>
    <location>global</location>
  </skill>
  <skill>
    <name>code-review</name>
    <description>Automated code review best practices</description>
    <location>project</location>
  </skill>
</available_skills>
</skills_system>
```

## Integration with Claude Code

Once the XML is written to `AGENTS.md`, Claude Code and other spec-compliant agents automatically discover the skills and make them available via their native skill-loading mechanism.
