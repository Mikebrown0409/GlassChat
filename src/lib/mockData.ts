// Mock data for testing UI components
import type { Chat, Message } from "./db";
import { SyncStatus } from "./sync/types";

export const mockChats: Chat[] = [
  {
    id: "chat-1",
    title: "Getting Started with AI",
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now() - 3600000, // 1 hour ago
    // Sync properties
    localId: "local-chat-1",
    lastModified: Date.now() - 3600000,
    syncStatus: SyncStatus.SYNCED,
    version: 1,
    deviceId: "mock-device",
  },
  {
    id: "chat-2",
    title: "Code Review Discussion",
    createdAt: Date.now() - 172800000, // 2 days ago
    updatedAt: Date.now() - 7200000, // 2 hours ago
    // Sync properties
    localId: "local-chat-2",
    lastModified: Date.now() - 7200000,
    syncStatus: SyncStatus.SYNCED,
    version: 1,
    deviceId: "mock-device",
  },
  {
    id: "chat-3",
    title: "Project Planning",
    createdAt: Date.now() - 259200000, // 3 days ago
    updatedAt: Date.now() - 10800000, // 3 hours ago
    // Sync properties
    localId: "local-chat-3",
    lastModified: Date.now() - 10800000,
    syncStatus: SyncStatus.PENDING,
    version: 2,
    deviceId: "mock-device",
  },
];

// Generate 100 mock messages for testing
export function generateMockMessages(chatId: string, count = 100): Message[] {
  const messages: Message[] = [];
  const baseTime = Date.now() - 86400000; // Start 1 day ago

  const sampleUserMessages = [
    "Hello! Can you help me with a coding problem?",
    "I'm working on a React component and need some advice.",
    "What's the best way to handle state management?",
    "Can you explain how async/await works?",
    "I'm getting an error in my TypeScript code.",
    "How do I optimize this function for performance?",
    "What are the best practices for API design?",
    "Can you review this code snippet?",
    "I need help with CSS flexbox layout.",
    "How do I implement authentication in Next.js?",
    "What's the difference between useMemo and useCallback?",
    "Can you help me debug this issue?",
    "I'm confused about closures in JavaScript.",
    "How do I handle errors in async functions?",
    "What's the best way to structure a React app?",
    "Can you explain the concept of hoisting?",
    "I need help with database design.",
    "How do I implement real-time features?",
    "What are the security best practices?",
    "Can you help me with testing strategies?",
  ];

  const sampleAssistantMessages = [
    "I'd be happy to help you with your coding problem! Could you share more details about what you're working on?",
    "For React components, I recommend following the single responsibility principle. Each component should have one clear purpose.",
    "State management depends on your app's complexity. For simple apps, useState is fine. For complex apps, consider Redux or Zustand.",
    "Async/await is syntactic sugar over Promises. It makes asynchronous code look and behave more like synchronous code.",
    "TypeScript errors can be tricky! Could you share the specific error message you're seeing?",
    "Here are some performance optimization techniques:\n\n```javascript\n// Use memoization\nconst memoizedValue = useMemo(() => {\n  return expensiveCalculation(a, b);\n}, [a, b]);\n```",
    "For API design, follow RESTful principles:\n- Use proper HTTP methods\n- Structure URLs logically\n- Return consistent response formats\n- Handle errors gracefully",
    "I'd be happy to review your code! Please share the snippet you'd like me to look at.",
    "CSS Flexbox is great for layouts! Here's a basic example:\n\n```css\n.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n```",
    "Next.js authentication can be implemented using NextAuth.js. It supports multiple providers and is very secure.",
    "Great question! useMemo memoizes values, while useCallback memoizes functions. Use useMemo for expensive calculations and useCallback for function references.",
    "I'm here to help debug! Could you describe the issue you're experiencing and share any error messages?",
    "Closures occur when a function has access to variables from an outer scope even after the outer function has returned.",
    "For error handling in async functions, use try-catch blocks:\n\n```javascript\ntry {\n  const result = await apiCall();\n} catch (error) {\n  console.error(error);\n}\n```",
    "A good React app structure separates concerns:\n- Components in /components\n- Pages in /pages or /app\n- Utilities in /utils\n- Hooks in /hooks",
    "Hoisting is JavaScript's behavior of moving declarations to the top of their scope during compilation.",
    "Database design principles:\n1. Normalize your data\n2. Use appropriate data types\n3. Create proper indexes\n4. Consider relationships carefully",
    "Real-time features can be implemented using WebSockets, Server-Sent Events, or libraries like Socket.io.",
    "Security best practices:\n- Validate all inputs\n- Use HTTPS\n- Implement proper authentication\n- Keep dependencies updated\n- Follow OWASP guidelines",
    "Testing strategies should include:\n- Unit tests for individual functions\n- Integration tests for component interactions\n- E2E tests for user workflows",
  ];

  for (let i = 0; i < count; i++) {
    const isUser = i % 3 !== 0; // Roughly 2/3 user messages, 1/3 assistant
    const role = isUser ? "user" : "assistant";
    const messageTime = baseTime + i * 60000; // 1 minute apart

    const content = isUser
      ? sampleUserMessages[i % sampleUserMessages.length]!
      : sampleAssistantMessages[i % sampleAssistantMessages.length]!;

    messages.push({
      id: `msg-${i + 1}`,
      chatId,
      role,
      content,
      createdAt: messageTime,
      // Sync properties
      localId: `local-msg-${i + 1}`,
      lastModified: messageTime,
      syncStatus: i < count - 5 ? SyncStatus.SYNCED : SyncStatus.PENDING, // Last 5 messages pending
      version: 1,
      deviceId: "mock-device",
    });
  }

  return messages;
}

// Sample markdown content for testing
export const sampleMarkdownMessage = `# Code Review Results

Thanks for sharing your React component! Here's my analysis:

## ✅ What's Working Well

- Clean component structure
- Good use of TypeScript interfaces
- Proper error handling

## 🔧 Suggestions for Improvement

### 1. Performance Optimization

Consider using \`useMemo\` for expensive calculations:

\`\`\`javascript
const memoizedValue = useMemo(() => {
  return expensiveCalculation(props.data);
}, [props.data]);
\`\`\`

### 2. Accessibility

Add proper ARIA labels:

\`\`\`jsx
<button 
  aria-label="Close dialog"
  onClick={handleClose}
>
  ×
</button>
\`\`\`

## 📚 Resources

- [React Performance Guide](https://react.dev/learn/render-and-commit)
- [Accessibility Best Practices](https://web.dev/accessibility/)

> **Note**: These are suggestions, not requirements. Your code is already quite good!

Let me know if you have any questions about these recommendations.`;

export const sampleCodeMessage = `Here's a complete example of a custom React hook for API calls:

\`\`\`typescript
import { useState, useEffect } from 'react';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApi<T>(url: string): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}

// Usage example:
function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useApi<User>(\`/api/users/\${userId}\`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
\`\`\`

This hook provides:
- ✅ Loading states
- ✅ Error handling  
- ✅ TypeScript support
- ✅ Refetch functionality
- ✅ Automatic cleanup`;
