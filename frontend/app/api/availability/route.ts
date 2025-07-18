import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, UserAvailability } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, event_id, available_slots } = body

    if (!user_id || !event_id || !available_slots) {
      return NextResponse.json({ 
        error: 'user_id, event_id, and available_slots are required' 
      }, { status: 400 })
    }

    // Check if availability already exists for this user and event
    const { data: existing } = await supabaseAdmin
      .from('user_availability')
      .select('*')
      .eq('user_id', user_id)
      .eq('event_id', event_id)
      .single()

    if (existing) {
      // Update existing availability
      const { data, error } = await supabaseAdmin
        .from('user_availability')
        .update({ 
          available_slots,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('event_id', event_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating availability:', error)
        return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
      }

      return NextResponse.json({ availability: data })
    } else {
      // Create new availability
      const availabilityData: Partial<UserAvailability> = {
        user_id,
        event_id,
        available_slots
      }

      const { data, error } = await supabaseAdmin
        .from('user_availability')
        .insert(availabilityData)
        .select()
        .single()

      if (error) {
        console.error('Error creating availability:', error)
        return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 })
      }

      return NextResponse.json({ availability: data })
    }
  } catch (error) {
    console.error('Error in POST /api/availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const userId = searchParams.get('user_id')

    if (eventId && userId) {
      // Get specific user's availability for an event
      const { data, error } = await supabaseAdmin
        .from('user_availability')
        .select(`
          *,
          users(id, name),
          events(id, name)
        `)
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Availability not found' }, { status: 404 })
        }
        console.error('Error fetching availability:', error)
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
      }

      return NextResponse.json({ availability: data })
    } else if (eventId) {
      // Get all availability for an event
      const { data, error } = await supabaseAdmin
        .from('user_availability')
        .select(`
          *,
          users(id, name, telegram_user_id)
        `)
        .eq('event_id', eventId)

      if (error) {
        console.error('Error fetching event availability:', error)
        return NextResponse.json({ error: 'Failed to fetch event availability' }, { status: 500 })
      }

      return NextResponse.json({ availability: data })
    } else if (userId) {
      // Get all availability for a user
      const { data, error } = await supabaseAdmin
        .from('user_availability')
        .select(`
          *,
          events(id, name, start_date, end_date)
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user availability:', error)
        return NextResponse.json({ error: 'Failed to fetch user availability' }, { status: 500 })
      }

      return NextResponse.json({ availability: data })
    } else {
      return NextResponse.json({ error: 'event_id or user_id is required' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in GET /api/availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, event_id, available_slots } = body

    if (!user_id || !event_id || !available_slots) {
      return NextResponse.json({ 
        error: 'user_id, event_id, and available_slots are required' 
      }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_availability')
      .update({ 
        available_slots,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('event_id', event_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating availability:', error)
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }

    return NextResponse.json({ availability: data })
  } catch (error) {
    console.error('Error in PUT /api/availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const userId = searchParams.get('user_id')

    if (!eventId || !userId) {
      return NextResponse.json({ error: 'event_id and user_id are required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('user_availability')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting availability:', error)
      return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Availability deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
