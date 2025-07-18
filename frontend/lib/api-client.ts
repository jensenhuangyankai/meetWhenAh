// Client-side API utilities for making requests to the backend
const API_BASE = '/api'

export class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // User operations
  async createUser(userData: { name: string; telegram_user_id?: string }) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getUser(params: { user_id?: string; telegram_user_id?: string }) {
    const searchParams = new URLSearchParams()
    if (params.user_id) searchParams.set('user_id', params.user_id)
    if (params.telegram_user_id) searchParams.set('telegram_user_id', params.telegram_user_id)
    
    return this.request(`/users?${searchParams}`)
  }

  async updateUser(userData: { user_id: string; name?: string; telegram_user_id?: string }) {
    return this.request('/users', {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  // Event operations
  async createEvent(eventData: {
    name: string
    description?: string
    creator_id: string
    start_date: string
    end_date: string
    start_time: string
    end_time: string
    timezone: string
  }) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    })
  }

  async getEvent(eventId: string) {
    return this.request(`/events?event_id=${eventId}`)
  }

  async getEventsByCreator(creatorId: string) {
    return this.request(`/events?creator_id=${creatorId}`)
  }

  async updateEvent(eventData: {
    event_id: string
    creator_id: string
    name?: string
    description?: string
    start_date?: string
    end_date?: string
    start_time?: string
    end_time?: string
    timezone?: string
  }) {
    return this.request('/events', {
      method: 'PUT',
      body: JSON.stringify(eventData),
    })
  }

  async deleteEvent(eventId: string, creatorId: string) {
    return this.request(`/events?event_id=${eventId}&creator_id=${creatorId}`, {
      method: 'DELETE',
    })
  }

  // Event member operations
  async addEventMember(memberData: { event_id: string; user_id: string }) {
    return this.request('/event-members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    })
  }

  async getEventMembers(eventId: string) {
    return this.request(`/event-members?event_id=${eventId}`)
  }

  async getUserEvents(userId: string) {
    return this.request(`/event-members?user_id=${userId}`)
  }

  async removeEventMember(eventId: string, userId: string) {
    return this.request(`/event-members?event_id=${eventId}&user_id=${userId}`, {
      method: 'DELETE',
    })
  }

  // Availability operations
  async setAvailability(availabilityData: {
    user_id: string
    event_id: string
    available_slots: any[]
  }) {
    return this.request('/availability', {
      method: 'POST',
      body: JSON.stringify(availabilityData),
    })
  }

  async getAvailability(params: { event_id?: string; user_id?: string }) {
    const searchParams = new URLSearchParams()
    if (params.event_id) searchParams.set('event_id', params.event_id)
    if (params.user_id) searchParams.set('user_id', params.user_id)
    
    return this.request(`/availability?${searchParams}`)
  }

  async updateAvailability(availabilityData: {
    user_id: string
    event_id: string
    available_slots: any[]
  }) {
    return this.request('/availability', {
      method: 'PUT',
      body: JSON.stringify(availabilityData),
    })
  }

  async deleteAvailability(eventId: string, userId: string) {
    return this.request(`/availability?event_id=${eventId}&user_id=${userId}`, {
      method: 'DELETE',
    })
  }

  // Webapp submission (for processing large availability data)
  async submitWebappData(webappData: {
    web_app_number: number
    event_name: string
    event_id: string
    start: string
    end: string
    hours_available: {
      dateTimes: Array<{
        date: string // format: "DD/MM/YYYY"
        time: string // format: "HHMM"
      }>
    }
    user_id?: string
    user_name?: string
    telegram_user_id?: string
  }) {
    return this.request('/webapp-submit', {
      method: 'POST',
      body: JSON.stringify(webappData),
    })
  }

  // Event analysis (get best meeting times)
  async getEventAnalysis(eventId: string, limit = 10) {
    return this.request(`/event-analysis?event_id=${eventId}&limit=${limit}`)
  }
}

// Export a singleton instance
export const apiClient = new ApiClient()

// Export individual functions for easier imports
export const {
  createUser,
  getUser,
  updateUser,
  createEvent,
  getEvent,
  getEventsByCreator,
  updateEvent,
  deleteEvent,
  addEventMember,
  getEventMembers,
  getUserEvents,
  removeEventMember,
  setAvailability,
  getAvailability,
  updateAvailability,
  deleteAvailability,
  submitWebappData,
  getEventAnalysis,
} = apiClient
