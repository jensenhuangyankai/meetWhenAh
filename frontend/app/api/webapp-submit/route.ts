import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface WebAppSubmission {
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
}

// Helper function to convert date format from DD/MM/YYYY to YYYY-MM-DD
function convertDateFormat(dateStr: string): string {
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Helper function to convert time format from HHMM to HH:MM
function convertTimeFormat(timeStr: string): string {
  if (timeStr.length === 3) {
    // Handle times like "730" -> "07:30"
    return `0${timeStr.slice(0, 1)}:${timeStr.slice(1)}`
  } else if (timeStr.length === 4) {
    // Handle times like "1430" -> "14:30"
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`
  }
  return timeStr
}

export async function POST(request: NextRequest) {
  try {
    const body: WebAppSubmission = await request.json()
    
    console.log('Received webapp submission:', body)
    
    const {
      event_id,
      hours_available,
      user_id,
      user_name,
      telegram_user_id
    } = body

    if (!event_id || !hours_available?.dateTimes) {
      return NextResponse.json({ 
        error: 'event_id and hours_available.dateTimes are required' 
      }, { status: 400 })
    }

    // Debug logging
    console.log('User info received:', { user_id, user_name, telegram_user_id })

    // Convert the webapp format to our database format
    const availableSlots = hours_available.dateTimes.map(slot => ({
      date: convertDateFormat(slot.date),
      time: convertTimeFormat(slot.time)
    }))

    let actualUserId = user_id

    // If no user_id provided, try to find or create user based on telegram_user_id or user_name
    if (!actualUserId && (telegram_user_id || user_name)) {
      if (telegram_user_id && telegram_user_id !== 'undefined') {
        // Try to find existing user by telegram_user_id
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('telegram_user_id', telegram_user_id)
          .single()

        if (existingUser) {
          actualUserId = existingUser.id
        } else if (user_name && user_name !== 'Unknown User') {
          // Create new user
          const { data: newUser, error: createUserError } = await supabaseAdmin
            .from('users')
            .insert({
              name: user_name,
              telegram_user_id: telegram_user_id
            })
            .select('id')
            .single()

          if (createUserError) {
            console.error('Error creating user:', createUserError)
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
          }

          actualUserId = newUser.id
        }
      } else if (user_name && user_name !== 'Unknown User') {
        // Try to create user with just name if no telegram_user_id
        const { data: newUser, error: createUserError } = await supabaseAdmin
          .from('users')
          .insert({
            name: user_name
          })
          .select('id')
          .single()

        if (createUserError) {
          console.error('Error creating user:', createUserError)
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
        }

        actualUserId = newUser.id
      }
    }

    if (!actualUserId) {
      return NextResponse.json({ 
        error: 'user_id is required or valid user_name/telegram_user_id must be provided to create user',
        debug_info: { user_id, user_name, telegram_user_id }
      }, { status: 400 })
    }

    console.log('About to save availability for user:', actualUserId, 'event:', event_id)
    console.log('Available slots to save:', availableSlots)

    // Check if availability already exists for this user and event
    const { data: existingAvailability, error: checkError } = await supabaseAdmin
      .from('user_availability')
      .select('id')
      .eq('user_id', actualUserId)
      .eq('event_id', event_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing availability:', checkError)
      return NextResponse.json({ 
        error: 'Failed to check existing availability',
        details: checkError.message 
      }, { status: 500 })
    }

    if (existingAvailability) {
      console.log('Updating existing availability record:', existingAvailability.id)
      // Update existing availability
      const { error: updateError } = await supabaseAdmin
        .from('user_availability')
        .update({
          available_slots: availableSlots,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', actualUserId)
        .eq('event_id', event_id)

      if (updateError) {
        console.error('Error updating availability:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update availability',
          details: updateError.message 
        }, { status: 500 })
      }
      console.log('Successfully updated availability')
    } else {
      console.log('Creating new availability record')
      // Create new availability record
      const { error: insertError } = await supabaseAdmin
        .from('user_availability')
        .insert({
          user_id: actualUserId,
          event_id: event_id,
          available_slots: availableSlots
        })

      if (insertError) {
        console.error('Error creating availability:', insertError)
        return NextResponse.json({ 
          error: 'Failed to save availability',
          details: insertError.message 
        }, { status: 500 })
      }
      console.log('Successfully created availability')
    }

    console.log('Fetching user data for response...')
    // Get user info for the response
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, telegram_user_id')
      .eq('id', actualUserId)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json({ 
        error: 'Failed to fetch user data',
        details: userError.message 
      }, { status: 500 })
    }

    console.log('Successfully fetched user data:', userData)

    // Return minimal response to avoid "data too long" error
    const response = {
      success: true,
      event_id: event_id,
      user: {
        id: userData.id,
        name: userData.name,
        telegram_user_id: userData.telegram_user_id
      },
      message: 'Availability saved successfully'
    }

    console.log('Returning success response:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in POST /api/webapp-submit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
