import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, EventMember } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_id, user_id } = body

    if (!event_id || !user_id) {
      return NextResponse.json({ error: 'event_id and user_id are required' }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('event_members')
      .select('*')
      .eq('event_id', event_id)
      .eq('user_id', user_id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this event' }, { status: 409 })
    }

    const memberData: Partial<EventMember> = {
      event_id,
      user_id
    }

    const { data, error } = await supabaseAdmin
      .from('event_members')
      .insert(memberData)
      .select(`
        *,
        users(id, name),
        events(id, name)
      `)
      .single()

    if (error) {
      console.error('Error adding event member:', error)
      return NextResponse.json({ error: 'Failed to add event member' }, { status: 500 })
    }

    return NextResponse.json({ member: data })
  } catch (error) {
    console.error('Error in POST /api/event-members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const userId = searchParams.get('user_id')

    if (eventId) {
      // Get all members of an event
      const { data, error } = await supabaseAdmin
        .from('event_members')
        .select(`
          *,
          users(id, name, telegram_user_id)
        `)
        .eq('event_id', eventId)

      if (error) {
        console.error('Error fetching event members:', error)
        return NextResponse.json({ error: 'Failed to fetch event members' }, { status: 500 })
      }

      return NextResponse.json({ members: data })
    } else if (userId) {
      // Get all events a user is a member of
      const { data, error } = await supabaseAdmin
        .from('event_members')
        .select(`
          *,
          events(id, name, description, start_date, end_date, creator_id)
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user events:', error)
        return NextResponse.json({ error: 'Failed to fetch user events' }, { status: 500 })
      }

      return NextResponse.json({ events: data })
    } else {
      return NextResponse.json({ error: 'event_id or user_id is required' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in GET /api/event-members:', error)
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
      .from('event_members')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing event member:', error)
      return NextResponse.json({ error: 'Failed to remove event member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/event-members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
