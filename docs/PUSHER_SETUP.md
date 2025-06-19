# Pusher Setup Guide for Local Development

This guide will help you set up Pusher for real-time collaboration features in your GlassChat development environment.

## 🎯 Overview

GlassChat uses **Pusher** for real-time collaboration features including:

- Multi-user chat rooms
- Live message synchronization
- User presence tracking
- Real-time AI response sharing

## 🔧 Setup Instructions

### 1. Create a Pusher Account

1. Go to [Pusher Dashboard](https://dashboard.pusher.com/)
2. Sign up for a free account
3. Create a new app for your GlassChat project

### 2. Get Your Credentials

From your Pusher app dashboard, you'll need:

- **App ID** (e.g., `123456`)
- **Key** (e.g., `abcdef123456`)
- **Secret** (e.g., `xyz789secret`)
- **Cluster** (e.g., `us2`)

### 3. Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# Pusher Server Configuration (required for API routes)
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=your-cluster

# Pusher Client Configuration (required for browser)
NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-cluster
```

**Important Notes:**

- `PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_KEY` should be the same value
- `PUSHER_CLUSTER` and `NEXT_PUBLIC_PUSHER_CLUSTER` should be the same value
- All variables must be provided for collaboration to work

### 4. Test Your Configuration

Run the test script to verify everything is working:

```bash
npm run test:pusher
```

This will:

- ✅ Check all environment variables are set
- ✅ Test server-side Pusher connection
- ✅ Test event triggering
- ✅ Provide debugging information

## 🚀 Using Collaboration Features

### Starting a Collaboration Session

1. **Start your development server:**

   ```bash
   npm run dev
   ```

2. **Create or join a room:**

   - Click the collaboration toggle (👥 icon) in the chat interface
   - Create a new room or join an existing one with a room ID

3. **Share with others:**
   - Copy the invite link from the collaboration panel
   - Share with team members for real-time collaboration

### Testing Multi-User Collaboration

1. **Open multiple browser windows/tabs**
2. **Join the same room in each window**
3. **Send messages** - they should appear in real-time across all windows
4. **Test AI responses** - AI messages are shared with all participants

## 🔍 Troubleshooting

### Common Issues

#### ❌ "Pusher credentials missing"

**Solution:** Ensure all 6 environment variables are set in `.env.local`

#### ❌ "Connection failed" or 401 errors

**Solution:** Double-check your credentials in the Pusher dashboard

#### ❌ "Events not appearing in real-time"

**Solution:**

1. Check browser console for Pusher connection errors
2. Verify you're in the same room on both clients
3. Run `npm run test:pusher` to test server connection

#### ❌ "Subscription error"

**Solution:** Check that you're authenticated (logged in) before joining rooms

### Debug Checklist

- [ ] All 6 Pusher environment variables set
- [ ] Pusher app is active (not paused) in dashboard
- [ ] Using the correct cluster region
- [ ] No quotes around environment variable values
- [ ] Server restarted after adding environment variables
- [ ] Browser console shows successful Pusher connection

### Development vs Production

**Development:**

- Uses your local Pusher app
- Detailed logging enabled
- CORS configured for localhost

**Production:**

- Same Pusher app can be used
- Set environment variables in your deployment platform (Vercel, etc.)
- TLS/SSL automatically enforced

## 📊 Monitoring

### Browser Console Logs

When Pusher is working correctly, you'll see:

```
🔌 [Pusher] Connecting...
✅ [Pusher] Connected successfully
🟢 [Pusher] Connected to room: room-12345
📨 [Pusher] Message sync: {...}
```

### Server Logs

Server-side events will show:

```
🔧 Initializing Pusher server: {...}
✅ [Pusher] Server initialized successfully
📤 [Pusher] Triggering event 'message-sync' for room: room-12345
✅ [Pusher] Event 'message-sync' triggered successfully
```

## 🔒 Security

- **Authentication:** Users must be logged in to join rooms
- **Channel Authorization:** Private channels require valid session
- **Input Validation:** All API routes validate user permissions
- **Rate Limiting:** Built into Pusher service

## 💡 Best Practices

1. **Environment Variables:** Never commit Pusher secrets to version control
2. **Testing:** Use the test script regularly during development
3. **Debugging:** Enable verbose logging in development mode
4. **Monitoring:** Watch console logs for connection issues
5. **Fallback:** App still works without Pusher (local-only mode)

## 📝 Package Scripts

- `npm run test:pusher` - Test Pusher connection and configuration
- `npm run test:collaboration` - Full collaboration system test
- `npm run dev` - Start development server with Pusher enabled

---

## 🆘 Need Help?

If you're still having issues:

1. **Check the test script output:** `npm run test:pusher`
2. **Review browser console** for client-side errors
3. **Check server logs** for API route errors
4. **Verify Pusher dashboard** shows your app is active

The collaboration features are optional - GlassChat works perfectly without Pusher for single-user scenarios.
