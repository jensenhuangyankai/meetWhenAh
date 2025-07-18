import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateAvailability, getBestTimeSlots, generateTimeSlots, generateDateRange } from '@/lib/availability-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!eventId) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get all availability for this event
    const { data: availabilityData, error: availError } = await supabaseAdmin
      .from('user_availability')
      .select(`
        user_id,
        available_slots,
        users(id, name, telegram_user_id)
      `)
      .eq('event_id', eventId)

    if (availError) {
      console.error('Error fetching availability:', availError)
      return NextResponse.json({ error: 'Failed to fetch availability data' }, { status: 500 })
    }

    if (!availabilityData || availabilityData.length === 0) {
      return NextResponse.json({
        event_id: eventId,
        event_name: event.name,
        participants: 0,
        best_times: [],
        message: 'No availability data found for this event'
      })
    }

    // Generate date range and time slots for the event
    const eventDates = generateDateRange(event.start_date, event.end_date)
    const eventTimes = generateTimeSlots(event.start_time, event.end_time, 30) // 30-minute intervals

    // Convert to format expected by calculation function
    const userAvailabilities = availabilityData.map(item => ({
      user_id: item.user_id,
      user_name: (item.users as any)?.name || 'Unknown',
      telegram_user_id: (item.users as any)?.telegram_user_id,
      available_slots: item.available_slots || []
    }))

    // Calculate best meeting times
    const bestTimes = getBestTimeSlots(userAvailabilities, eventDates, eventTimes, limit)

    // Format response for the bot
    const response = {
      event_id: eventId,
      event_name: event.name,
      event_dates: eventDates,
      event_times: eventTimes,
      participants: userAvailabilities.length,
      total_possible_slots: eventDates.length * eventTimes.length,
      best_times: bestTimes.map(slot => ({
        date: slot.date,
        time: slot.time,
        available_users: slot.available_users,
        available_count: slot.available_users.length,
        availability_percentage: slot.availability_percentage,
        user_details: slot.available_users.map(userId => {
          const user = userAvailabilities.find(u => u.user_id === userId)
          return {
            user_id: userId,
            name: user?.user_name || 'Unknown',
            telegram_user_id: user?.telegram_user_id
          }
        })
      })),
      participants_list: userAvailabilities.map(user => ({
        user_id: user.user_id,
        name: user.user_name,
        telegram_user_id: user.telegram_user_id,
        slots_count: user.available_slots.length
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/event-analysis:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
