# Collaboration Rooms

## Overview

GlassChat supports real-time collaboration through shared rooms where users can chat, code together, and see each other's presence.

## Room Types

### Regular Rooms

- Created by users within the main chat interface
- Tied to specific chat conversations
- Persist as long as users are active

### Shared Rooms (Development)

- Created automatically when someone joins via a shared link
- In development mode with MockRedis, rooms don't persist across browser sessions
- When someone clicks a shared link to a non-existent room, a placeholder room is created
- Placeholder rooms are named "Shared Room" and include a welcome message

## Sharing Rooms

### Creating a Share Link

1. Create or join a collaboration room
2. Click the share button in the collaboration panel
3. Copy the generated link (format: `/room/{roomId}`)

### Joining via Share Link

1. Click on a shared room link
2. If not authenticated, you'll be redirected to login
3. After authentication, you'll automatically join the room
4. If the original room doesn't exist (development), a placeholder room is created
5. You'll be redirected to the main chat interface with the collaboration panel open

## Development Behavior

In development mode:

- Uses MockRedis for data storage
- Room data doesn't persist across server restarts
- Shared links may create placeholder rooms if the original room is no longer available
- This is expected behavior and allows for testing collaboration features

## Production Behavior

In production with real Redis:

- Rooms persist until all users leave
- Shared links work reliably across sessions
- No placeholder rooms are created (rooms either exist or return proper errors)

## Error Handling

- **Room Not Found**: In development, creates a placeholder room; in production, shows appropriate error
- **Authentication Required**: Redirects to login with return URL
- **Network Issues**: Shows retry options and clear error messages
- **Infinite Loop Prevention**: Built-in safeguards prevent repeated join attempts to the same room
- **Race Condition Protection**: Locking mechanism prevents multiple placeholder rooms being created simultaneously

## Performance & Reliability

### Loop Prevention

- Components track join attempts to prevent infinite retry loops
- URL-based room joins are marked as attempted to avoid repeated calls
- Auto-rejoin logic includes state tracking to prevent unnecessary attempts

### Race Condition Handling

- Redis locking mechanism prevents multiple processes from creating the same placeholder room
- 10-second lock expiration ensures locks don't persist indefinitely
- Retry logic with backoff for when rooms are being created by other processes

### Development Optimizations

- Reduced dependency arrays in useEffect hooks to minimize re-renders
- Proper cleanup of timeouts and intervals
- Efficient state management to prevent cascading updates
