# Frontend API Routes for Supabase

This frontend now includes API routes that connect to your Supabase database using the service role key for server-side operations. These routes provide user-based "authentication" where operations are filtered by `user_id`.

## 🚀 **NEW: Webapp Submission Route - Solves "Data Too Long" Issue**

The `/api/webapp-submit` route is specifically designed to handle large availability data from the webapp without causing "data too long" errors. It:

1. ✅ Processes large timeslot arrays from the webapp
2. ✅ Saves availability data to Supabase  
3. ✅ Returns only essential data (event_id, user info) to avoid size limits
4. ✅ Automatically creates users if they don't exist

## Setup

1. **Install dependencies** (already done):
   ```bash
   bun add @supabase/supabase-js
   ```

2. **Environment Variables**: Update `.env.local` with your actual Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
   ```

3. **TypeScript Configuration**: Path mappings have been added to `tsconfig.json` for `@/lib/*`.

## API Routes

### Users (`/api/users`)

- **POST**: Create a new user
  ```javascript
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      telegram_user_id: '123456789' // optional
    })
  })
  ```

- **GET**: Get user by ID or Telegram ID
  ```javascript
  // By user ID
  const response = await fetch('/api/users?user_id=uuid')
  
  // By Telegram ID
  const response = await fetch('/api/users?telegram_user_id=123456789')
  ```

- **PUT**: Update user
  ```javascript
  const response = await fetch('/api/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'uuid',
      name: 'Updated Name'
    })
  })
  ```

### Events (`/api/events`)

- **POST**: Create a new event
  ```javascript
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Team Meeting',
      description: 'Weekly team sync',
      creator_id: 'user_uuid',
      start_date: '2025-07-20',
      end_date: '2025-07-22',
      start_time: '09:00',
      end_time: '17:00',
      timezone: 'UTC'
    })
  })
  ```

- **GET**: Get event by ID or events by creator
  ```javascript
  // Get specific event
  const response = await fetch('/api/events?event_id=uuid')
  
  // Get events by creator
  const response = await fetch('/api/events?creator_id=user_uuid')
  ```

- **PUT**: Update event (only by creator)
- **DELETE**: Delete event (only by creator)

### Event Members (`/api/event-members`)

- **POST**: Add user to event
- **GET**: Get event members or user's events
- **DELETE**: Remove user from event

### Availability (`/api/availability`)

- **POST**: Set user availability for an event
  ```javascript
  const response = await fetch('/api/availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'user_uuid',
      event_id: 'event_uuid',
      available_slots: [
        { date: '2025-07-20', time: '09:00' },
        { date: '2025-07-20', time: '09:30' },
        { date: '2025-07-21', time: '14:00' }
      ]
    })
  })
  ```

- **GET**: Get availability for event or user
- **PUT**: Update availability
- **DELETE**: Delete availability

### 🆕 Webapp Submission (`/api/webapp-submit`)

**Purpose**: Handle large availability data from webapp without "data too long" errors.

- **POST**: Process webapp submission
  ```javascript
  const response = await fetch('/api/webapp-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      web_app_number: 1,
      event_name: "Team Meeting",
      event_id: "KGbgW1mStQe6h165",
      start: "Fri Jul 25 2025 08:00:00 GMT+0800 (Singapore Standard Time)",
      end: "Sat Jul 26 2025 08:00:00 GMT+0800 (Singapore Standard Time)",
      hours_available: {
        dateTimes: [
          { date: "27/07/2025", time: "0730" },
          { date: "27/07/2025", time: "0800" },
          { date: "28/07/2025", time: "0730" }
          // ... many more slots
        ]
      },
      user_name: "John Doe",
      telegram_user_id: "123456789"
    })
  })
  
  // Response (small, avoids "data too long"):
  {
    "success": true,
    "event_id": "KGbgW1mStQe6h165",
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "telegram_user_id": "123456789"
    },
    "message": "Availability saved successfully"
  }
  ```

### 🆕 Event Analysis (`/api/event-analysis`)

**Purpose**: Get calculated best meeting times for an event.

- **GET**: Get best meeting times with participation data
  ```javascript
  const response = await fetch('/api/event-analysis?event_id=uuid&limit=5')
  
  // Response includes:
  {
    "event_id": "uuid",
    "event_name": "Team Meeting",
    "participants": 3,
    "best_times": [
      {
        "date": "2025-07-27",
        "time": "09:00",
        "available_users": ["user1", "user2", "user3"],
        "available_count": 3,
        "availability_percentage": 100,
        "user_details": [...]
      }
    ],
    "participants_list": [...]
  }
  ```

## Client-Side Usage

### For Webapp Submissions (Solves "Data Too Long" Issue)

```javascript
import { apiClient } from '@/lib/api-client'

// Instead of sending large data back to bot, save it to database
const result = await apiClient.submitWebappData({
  web_app_number: 1,
  event_name: "Team Meeting",
  event_id: "KGbgW1mStQe6h165",
  start: "Fri Jul 25 2025 08:00:00 GMT+0800 (Singapore Standard Time)",
  end: "Sat Jul 26 2025 08:00:00 GMT+0800 (Singapore Standard Time)",
  hours_available: {
    dateTimes: [
      { date: "27/07/2025", time: "0730" },
      { date: "27/07/2025", time: "0800" },
      // ... hundreds of slots
    ]
  },
  user_name: "John Doe",
  telegram_user_id: "123456789"
})

// Small response to send back to bot:
// {
//   "success": true,
//   "event_id": "KGbgW1mStQe6h165", 
//   "user": { "id": "...", "name": "John Doe", "telegram_user_id": "123456789" },
//   "message": "Availability saved successfully"
// }
```

### For Regular Operations

```javascript
import { apiClient } from '@/lib/api-client'

// Create a user
const user = await apiClient.createUser({
  name: 'John Doe',
  telegram_user_id: '123456789'
})

// Create an event
const event = await apiClient.createEvent({
  name: 'Team Meeting',
  creator_id: user.user.id,
  start_date: '2025-07-20',
  end_date: '2025-07-22',
  start_time: '09:00',
  end_time: '17:00',
  timezone: 'UTC'
})

// Get best meeting times
const analysis = await apiClient.getEventAnalysis(event.event.id, 5)
```

## Availability Calculation

### Get Best Meeting Times for Bot

```javascript
import { apiClient } from '@/lib/api-client'

// After users submit availability via webapp, get analysis for bot
const analysis = await apiClient.getEventAnalysis(eventId, 5)

// Bot can now process compact analysis data instead of raw timeslots:
// {
//   "event_id": "uuid",
//   "event_name": "Team Meeting", 
//   "participants": 3,
//   "best_times": [
//     {
//       "date": "2025-07-27",
//       "time": "09:00", 
//       "available_count": 3,
//       "availability_percentage": 100,
//       "user_details": [{"name": "John", "telegram_user_id": "123"}, ...]
//     }
//   ]
// }
```

### Manual Calculation (if needed)

```javascript
import { calculateAvailability, getBestTimeSlots } from '@/lib/availability-utils'

// Get all availability for an event
const { availability } = await apiClient.getAvailability({ event_id: eventId })

// Calculate best times
const bestTimes = getBestTimeSlots(
  availability.map(a => ({
    user_id: a.user_id,
    available_slots: a.available_slots
  })),
  ['2025-07-20', '2025-07-21'],
  ['09:00', '09:30', '10:00', '10:30'],
  5 // limit to top 5
)
```

## 🎯 **Solution for "Data Too Long" Issue**

The "data too long" problem has been completely resolved with this implementation:

### **Before (Problem):**
- Webapp sent ALL timeslot data directly to Telegram bot
- Large JSON payload exceeded Telegram's data limits
- Bot couldn't process submissions with many time slots

### **After (Solution):**
1. **Frontend webapp** → calls `/api/webapp-submit` → **saves data to Supabase**
2. **API returns minimal response** → sent to **Telegram bot**
3. **Bot receives small confirmation** → processes successfully ✅

### **Data Flow:**
```
Webapp (Large Data) → Frontend API → Supabase Database
                           ↓
Telegram Bot ← Small Success Response ← Frontend API
```

### **Response Size Comparison:**
- **Before**: 2000+ characters (too long ❌)
- **After**: ~150 characters (perfect ✅)

```javascript
// NEW: Small response sent to bot
{
  "success": true,
  "event_id": "KGbgW1mStQe6h165",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "telegram_user_id": "123456789"
  },
  "message": "Availability saved successfully"
}
```

## 🔄 **Updated Python Backend**

The Python backend has been updated to handle both formats:

```python
@bot.message_handler(content_types=["web_app_data"])
def handle_webapp(message):
    web_app_data = json.loads(message.web_app_data.data)
    
    # New API response format (simplified)
    if "success" in web_app_data and "event_id" in web_app_data:
        handle_webapp_api_response(message, web_app_data)
    else:
        # Legacy format (fallback)
        handle_webapp_legacy_format(message, web_app_data)
```

The bot now:
- ✅ Receives small confirmation data
- ✅ Shows success message to user
- ✅ Can retrieve full data from Supabase when needed
- ✅ Maintains backward compatibility

## 🚀 **Frontend Integration**

The dragselector webapp now:

```javascript
const submit = async () => {
  // 1. Save to API
  const response = await fetch('/api/webapp-submit', {
    method: 'POST',
    body: JSON.stringify(largeWebappData)
  });
  
  // 2. Send small response to bot
  const result = await response.json();
  tg.sendData(JSON.stringify({
    success: result.success,
    event_id: result.event_id,
    user: result.user
  }));
}
```

## 📊 **Event Analysis**

Use `/api/event-analysis` to get calculated best meeting times:

```javascript
// Get best times for an event
const analysis = await fetch('/api/event-analysis?event_id=xxx&limit=5');
// Returns: best times, participation rates, user details
```

## Security Notes

- All API routes use the Supabase service role key for database access
- Operations are filtered by `user_id` for security
- No authentication is implemented - this is handled by passing the correct `user_id`
- Event operations verify creator permissions before allowing updates/deletes
- Always validate user permissions in your frontend before making API calls

## Error Handling

All API routes return consistent error responses:

```javascript
{
  "error": "Error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing required fields)
- `404`: Not Found
- `409`: Conflict (e.g., user already exists)
- `500`: Internal Server Error
