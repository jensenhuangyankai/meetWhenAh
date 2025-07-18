// Utility functions for availability calculation
export interface TimeSlot {
  date: string
  time: string
  available_users: string[]
  availability_percentage: number
}

export interface AvailabilitySlot {
  date: string
  time: string
}

export function parseTimeString(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

export function timeToString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function generateTimeSlots(startTime: string, endTime: string, intervalMinutes = 30): string[] {
  const startMinutes = parseTimeString(startTime)
  const endMinutes = parseTimeString(endTime)
  const slots: string[] = []

  for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
    slots.push(timeToString(minutes))
  }

  return slots
}

export function generateDateRange(startDate: string, endDate: string): string[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const dates: string[] = []

  const current = new Date(start)
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function calculateAvailability(
  userAvailabilities: Array<{
    user_id: string
    available_slots: AvailabilitySlot[]
  }>,
  eventDates: string[],
  eventTimes: string[]
): TimeSlot[] {
  const results: TimeSlot[] = []
  const totalUsers = userAvailabilities.length

  for (const date of eventDates) {
    for (const time of eventTimes) {
      const availableUsers: string[] = []

      for (const userAvail of userAvailabilities) {
        const isAvailable = userAvail.available_slots.some(
          slot => slot.date === date && slot.time === time
        )
        if (isAvailable) {
          availableUsers.push(userAvail.user_id)
        }
      }

      const availabilityPercentage = totalUsers > 0 ? (availableUsers.length / totalUsers) * 100 : 0

      results.push({
        date,
        time,
        available_users: availableUsers,
        availability_percentage: availabilityPercentage
      })
    }
  }

  return results.sort((a, b) => b.availability_percentage - a.availability_percentage)
}

export function getBestTimeSlots(
  userAvailabilities: Array<{
    user_id: string
    available_slots: AvailabilitySlot[]
  }>,
  eventDates: string[],
  eventTimes: string[],
  limit = 10
): TimeSlot[] {
  const allSlots = calculateAvailability(userAvailabilities, eventDates, eventTimes)
  return allSlots.slice(0, limit)
}

// Format functions for display
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function formatDateTime(date: string, time: string): string {
  return `${formatDate(date)} at ${formatTime(time)}`
}
