import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, Event } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      creator_id, 
      start_date, 
      end_date, 
      start_time, 
      end_time, 
      timezone 
    } = body

    if (!name || !creator_id || !start_date || !end_date || !start_time || !end_time || !timezone) {
      return NextResponse.json({ 
        error: 'name, creator_id, start_date, end_date, start_time, end_time, and timezone are required' 
      }, { status: 400 })
    }

    const eventData: Partial<Event> = {
      name,
      description,
      creator_id,
      start_date,
      end_date,
      start_time,
      end_time,
      timezone
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (error) {
    console.error('Error in POST /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const creatorId = searchParams.get('creator_id')

    if (eventId) {
      // Get specific event
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }
        console.error('Error fetching event:', error)
        return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
      }

      return NextResponse.json({ event: data })
    } else if (creatorId) {
      // Get events by creator
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching events:', error)
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
      }

      return NextResponse.json({ events: data })
    } else {
      return NextResponse.json({ error: 'event_id or creator_id is required' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in GET /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      event_id, 
      creator_id, 
      name, 
      description, 
      start_date, 
      end_date, 
      start_time, 
      end_time, 
      timezone 
    } = body

    if (!event_id || !creator_id) {
      return NextResponse.json({ error: 'event_id and creator_id are required' }, { status: 400 })
    }

    const updateData: Partial<Event> = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (start_date) updateData.start_date = start_date
    if (end_date) updateData.end_date = end_date
    if (start_time) updateData.start_time = start_time
    if (end_time) updateData.end_time = end_time
    if (timezone) updateData.timezone = timezone

    // Verify the user is the creator before allowing update
    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updateData)
      .eq('id', event_id)
      .eq('creator_id', creator_id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found or unauthorized' }, { status: 404 })
      }
      console.error('Error updating event:', error)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (error) {
    console.error('Error in PUT /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const creatorId = searchParams.get('creator_id')

    if (!eventId || !creatorId) {
      return NextResponse.json({ error: 'event_id and creator_id are required' }, { status: 400 })
    }

    // Verify the user is the creator before allowing deletion
    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('creator_id', creatorId)

    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
