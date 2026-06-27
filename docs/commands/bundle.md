# `rolecraft bundle`

Install multiple skills at once from inline sources or a bundle file.

## Usage

```bash
rolecraft bundle <sources...>        # install inline sources
rolecraft bundle <file>              # install from a bundle file
rolecraft bundle create [<name>]     # create a new bundle file
```

## Inline sources

Pass multiple sources as arguments:

```bash
rolecraft bundle owner/react-patterns owner/ts-practices ./css-layout
rolecraft bundle owner/skill1 owner/skill2 --dry-run       # preview only
```

## From a file

### JSON array (`skills.json`)

```json
["owner/react-patterns", "./local/css-layout", "owner/ts-practices"]
```

### JSON object with `skills` key

```json
{
  "name": "frontend-essentials",
  "skills": ["owner/react-practices", "owner/ts-config"]
}
```

### Plain text (`skills.txt`)

```yaml
# comments use #
owner/react-patterns
./local/css-layout
owner/ts-practices
```

If the file has no extension, rolecraft tries `.json` and `.txt` variants automatically.

## `bundle create`

Creates a JSON bundle file you can edit and share with your team:

```bash
rolecraft bundle create my-collection              # creates my-collection.json
rolecraft bundle create                            # interactive: asks for name and path
```

Generated file:

```json
{
  "name": "my-collection",
  "skills": [
    "owner/skill-name"
  ]
}
```

Then edit the `skills` array and install with `rolecraft bundle my-collection.json`.
