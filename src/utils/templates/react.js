export const description =
  'React best practices and component patterns for AI agents'

export function generate(opts) {
  const { name, slug, description: skillDescription, agents, owner } = opts
  const agentList = Array.isArray(agents) ? agents : ['claude']

  return `---
name: ${name}
slug: ${slug}
owner: ${owner || 'local'}
description: ${skillDescription || 'React best practices covering component patterns, state management strategies, and code examples for building maintainable UIs'}
agents: [${agentList.join(', ')}]
category: frontend
---

## When to Use

Apply this skill when building React components, managing application
state, or reviewing frontend code in ${name}. These guidelines ensure
your React code is maintainable, performant, and follows community
best practices.

## Component Patterns

Prefer function components with hooks over class components.
Keep components small and focused on a single responsibility.

\`\`\`jsx
function UserProfile({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div>
      <h2>{user.name}</h2>
      {isEditing ? (
        <ProfileForm user={user} onSubmit={onUpdate} />
      ) : (
        <button onClick={() => setIsEditing(true)}>Edit</button>
      )}
    </div>
  )
}
\`\`\`

## State Management

Use \`useState\` for local component state. Use \`useReducer\` for
complex state logic. Lift shared state to the nearest common ancestor.
Consider context or a state library for global state management.

## Examples

\`\`\`bash
# Create a new React component
$ npx rolecraft init UserCard --template react

# Run component tests
$ npm test -- --grep "UserCard"
\`\`\`

Use TypeScript for type safety. Use dependency arrays correctly in
useEffect to prevent infinite loops. Follow accessibility best
practices with semantic HTML and ARIA attributes.
`
}
