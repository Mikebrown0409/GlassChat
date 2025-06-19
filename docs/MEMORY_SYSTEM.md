# 🧠 GlassChat Memory System

## Overview

GlassChat features an advanced memory system that provides persistent, intelligent conversation context across sessions. This document outlines our memory capabilities, limitations, and how we compare to industry leaders like OpenAI.

## 🔧 System Architecture

### Storage Layers

- **Client-side**: IndexedDB for local caching and offline access
- **Server-side**: PostgreSQL for persistent, shared memory storage
- **Cache Layer**: Redis for high-performance memory retrieval

### Memory Types

1. **Conversation Memory**: Per-chat conversation history and context
2. **Smart Summaries**: AI-generated summaries of conversation history
3. **Memory Events**: Tracking of memory operations and updates

## 📊 Memory Management

### Automatic Cleanup System

Our memory system includes intelligent cleanup to prevent bloat and maintain performance:

- **Retention Period**: 90 days (configurable)
- **Memory Limit**: 100 entries per conversation (configurable)
- **Cleanup Strategy**:
  - Remove memories older than retention period
  - Keep most recent memories when over limit
  - Automatic summary updates after cleanup

### Smart Summarization

- **Trigger**: Every 4 messages (2 user + 2 AI pairs)
- **AI Model**: Gemini 2.5 Flash Lite for efficient summarization
- **Content**: One-paragraph summary + up to 5 keywords
- **Updates**: Automatic re-summarization after memory cleanup

## 🚀 Performance Characteristics

### Memory Limits

- **Per Chat**: 100 memories (auto-cleanup prevents bloat)
- **Storage**: Unlimited conversations (with cleanup policies)
- **Client Storage**: ~5GB per domain (IndexedDB limit)
- **Server Storage**: Managed via cleanup policies

### Query Performance

- **Recent Context**: Last 20 messages loaded instantly
- **Memory Summaries**: Single query per conversation
- **Cleanup Operations**: Batched processing (50 chats per batch)

## 🆚 Comparison with OpenAI

| Feature                  | **GlassChat**                       | **OpenAI ChatGPT**           | **Status**         |
| ------------------------ | ----------------------------------- | ---------------------------- | ------------------ |
| **Memory Persistence**   | ✅ Permanent across sessions        | ✅ Permanent across sessions | ✅ **Competitive** |
| **Memory Scope**         | ✅ Per-conversation + collaborative | ✅ Per-user global           | ✅ **Competitive** |
| **Smart Summarization**  | ✅ Auto-summary every 4 messages    | ✅ Continuous summarization  | ✅ **Competitive** |
| **Memory Search**        | ❌ No semantic search yet           | ✅ Semantic memory retrieval | ⚠️ **Planned**     |
| **Memory Management**    | ✅ Intelligent cleanup system       | ✅ Managed retention         | ✅ **Competitive** |
| **Context Integration**  | ✅ Recent + summary context         | ✅ Recent + memory context   | ✅ **Competitive** |
| **Collaboration Memory** | ✅ Shared room memory               | ❌ Individual only           | 🚀 **Advantage**   |
| **Offline Access**       | ✅ IndexedDB caching                | ❌ Online only               | 🚀 **Advantage**   |

## 🔮 Future Enhancements

### Planned Features

1. **Semantic Search**: Vector embeddings for intelligent memory retrieval
2. **Memory Categories**: Organize memories by topics/themes
3. **Memory Insights**: Analytics on conversation patterns
4. **Memory Sharing**: Export/import memory between chats
5. **Advanced Cleanup**: ML-based importance scoring for memory retention

### Scalability Improvements

1. **Distributed Storage**: Sharding for large-scale deployments
2. **Caching Optimization**: Redis-based memory caching
3. **Background Processing**: Async cleanup and summarization
4. **Memory Compression**: Efficient storage of large conversations

## 🛠️ Configuration

### Environment Variables

```bash
# Memory retention settings (optional)
MEMORY_RETENTION_DAYS=90
MAX_MEMORIES_PER_CHAT=100
MEMORY_CLEANUP_BATCH_SIZE=50

# AI model for summarization
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

### Cleanup Schedule

For production deployments, set up automated cleanup:

```bash
# Daily cleanup at 2 AM
0 2 * * * cd /path/to/glasschat && npm run cleanup:memory
```

## 📈 Memory Usage Monitoring

### Key Metrics to Track

- Memory entries per chat
- Database size growth
- Cleanup frequency and results
- Summary generation success rate
- Query performance times

### Monitoring Commands

```bash
# Check memory statistics
npm run cleanup:memory

# Database size monitoring
npx prisma studio

# Performance testing
npm run test:ai:verbose
```

## 🔒 Privacy & Security

### Data Protection

- **Encryption**: All memory data encrypted at rest
- **Access Control**: User-scoped memory isolation
- **Data Retention**: Automatic cleanup prevents indefinite storage
- **Export Rights**: Users can export their memory data

### Compliance

- **GDPR**: Right to be forgotten via memory cleanup
- **Data Minimization**: Automatic cleanup reduces data footprint
- **Transparency**: Clear documentation of memory handling

## 🚨 Troubleshooting

### Common Issues

**Memory Not Persisting**

- Check database connection
- Verify memory manager initialization
- Review browser storage permissions

**Performance Degradation**

- Run memory cleanup: `npm run cleanup:memory`
- Check database query performance
- Monitor memory entry counts

**Summary Generation Failures**

- Verify AI API key configuration
- Check rate limiting status
- Review conversation history format

### Debug Commands

```bash
# Test memory system
npm run test:ai:verbose

# Manual cleanup
npm run cleanup:memory

# Database inspection
npm run db:studio
```

## 📝 API Reference

### Memory Manager Client

```typescript
// Add memory entry
await memoryManagerClient.addMemory(chatId, content, metadata);

// Get all memories for chat
const memories = await memoryManagerClient.getMemories(chatId);

// Get conversation summary
const summary = await memoryManagerClient.getSummary(chatId);
```

### Memory Manager Server

```typescript
// Cleanup old memories
await memoryManagerServer.cleanupOldMemories(chatId);

// Global cleanup
await memoryManagerServer.performGlobalMemoryCleanup();

// Generate summary
const summary = await memoryManagerServer.summarizeAndStore(chatId, history);
```

## 🎯 Best Practices

### For Developers

1. **Always handle memory failures gracefully**
2. **Use batched operations for bulk memory operations**
3. **Monitor memory growth and cleanup effectiveness**
4. **Test memory persistence across sessions**

### For Deployment

1. **Set up automated cleanup schedules**
2. **Monitor database size and performance**
3. **Configure appropriate retention policies**
4. **Implement memory usage alerts**

---

## 📞 Support

For memory system issues or questions:

- Check troubleshooting section above
- Review logs for memory operations
- Test with `npm run test:ai:verbose`
- File issues with memory-related tags
