import os
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, date, time
from supabase import create_client, Client
from dotenv import load_dotenv
from icecream import ic

from classes import (
    User, Event, EventMember, UserAvailability, TelegramGroup, 
    EventGroupShare, AvailabilitySlot, AvailabilityCalculator,
    parse_time_string, time_to_string, generate_time_slots, generate_date_range
)

load_dotenv()

class SupabaseDB:
    """Database interface for meetWhenAh using Supabase"""
    
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_ANON_KEY')
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")
        
        self.client: Client = create_client(self.url, self.key)
    
    # ==================== USER OPERATIONS ====================
    
    def create_user(self, user: User) -> User:
        """Create a new user"""
        try:
            result = self.client.table('users').insert(user.to_dict()).execute()
            if result.data:
                return User.from_dict(result.data[0])
            raise Exception("Failed to create user")
        except Exception as e:
            ic(f"Error creating user: {e}")
            raise
    
    def get_user_by_tele_id(self, tele_id: str) -> Optional[User]:
        """Get user by Telegram ID"""
        try:
            result = self.client.table('users').select('*').eq('tele_id', tele_id).execute()
            if result.data:
                return User.from_dict(result.data[0])
            return None
        except Exception as e:
            ic(f"Error getting user by tele_id: {e}")
            return None
    
    def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by UUID"""
        try:
            result = self.client.table('users').select('*').eq('id', str(user_id)).execute()
            if result.data:
                return User.from_dict(result.data[0])
            return None
        except Exception as e:
            ic(f"Error getting user by id: {e}")
            return None
    
    def update_user(self, user: User) -> User:
        """Update existing user"""
        try:
            user.updated_at = datetime.now()
            result = self.client.table('users').update(user.to_dict()).eq('id', str(user.id)).execute()
            if result.data:
                return User.from_dict(result.data[0])
            raise Exception("Failed to update user")
        except Exception as e:
            ic(f"Error updating user: {e}")
            raise
    
    def get_or_create_user(self, tele_id: str, tele_username: str = None) -> User:
        """Get existing user or create new one"""
        user = self.get_user_by_tele_id(tele_id)
        if user:
            return user
        
        new_user = User(
            tele_id=tele_id,
            tele_username=tele_username,
            initialised=True,
            callout_cleared=True
        )
        return self.create_user(new_user)
    
    # ==================== EVENT OPERATIONS ====================
    
    def create_event(self, event: Event) -> Event:
        """Create a new event"""
        try:
            result = self.client.table('events').insert(event.to_dict()).execute()
            if result.data:
                return Event.from_dict(result.data[0])
            raise Exception("Failed to create event")
        except Exception as e:
            ic(f"Error creating event: {e}")
            raise
    
    def get_event_by_event_id(self, event_id: str) -> Optional[Event]:
        """Get event by event_id (16-character string)"""
        try:
            result = self.client.table('events').select('*').eq('event_id', event_id).execute()
            if result.data:
                event = Event.from_dict(result.data[0])
                # Load members and availability data
                event.members = self.get_event_members(event.id)
                event.availability_data = self.get_event_availability(event.id)
                return event
            return None
        except Exception as e:
            ic(f"Error getting event by event_id: {e}")
            return None
    
    def get_event_by_id(self, event_id: UUID) -> Optional[Event]:
        """Get event by UUID"""
        try:
            result = self.client.table('events').select('*').eq('id', str(event_id)).execute()
            if result.data:
                event = Event.from_dict(result.data[0])
                event.members = self.get_event_members(event.id)
                event.availability_data = self.get_event_availability(event.id)
                return event
            return None
        except Exception as e:
            ic(f"Error getting event by id: {e}")
            return None
    
    def update_event(self, event: Event) -> Event:
        """Update existing event"""
        try:
            event.updated_at = datetime.now()
            result = self.client.table('events').update(event.to_dict()).eq('id', str(event.id)).execute()
            if result.data:
                return Event.from_dict(result.data[0])
            raise Exception("Failed to update event")
        except Exception as e:
            ic(f"Error updating event: {e}")
            raise
    
    def update_event_best_timing(self, event_id: UUID, best_date: date, best_start_time: time, best_end_time: time, max_participants: int):
        """Update event's best timing calculation"""
        try:
            update_data = {
                'best_date': best_date.isoformat(),
                'best_start_time': best_start_time.isoformat(),
                'best_end_time': best_end_time.isoformat(),
                'max_participants': max_participants,
                'updated_at': datetime.now().isoformat()
            }
            result = self.client.table('events').update(update_data).eq('id', str(event_id)).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            ic(f"Error updating event best timing: {e}")
            raise
    
    # ==================== EVENT MEMBER OPERATIONS ====================
    
    def add_event_member(self, event_id: UUID, user_id: UUID) -> EventMember:
        """Add user to event"""
        try:
            member = EventMember(event_id=event_id, user_id=user_id)
            result = self.client.table('event_members').insert(member.to_dict()).execute()
            if result.data:
                return EventMember.from_dict(result.data[0])
            raise Exception("Failed to add event member")
        except Exception as e:
            ic(f"Error adding event member: {e}")
            raise
    
    def remove_event_member(self, event_id: UUID, user_id: UUID) -> bool:
        """Remove user from event"""
        try:
            result = self.client.table('event_members').delete().eq('event_id', str(event_id)).eq('user_id', str(user_id)).execute()
            return True
        except Exception as e:
            ic(f"Error removing event member: {e}")
            return False
    
    def is_user_event_member(self, event_id: UUID, user_id: UUID) -> bool:
        """Check if user is member of event"""
        try:
            result = self.client.table('event_members').select('id').eq('event_id', str(event_id)).eq('user_id', str(user_id)).execute()
            return len(result.data) > 0
        except Exception as e:
            ic(f"Error checking event membership: {e}")
            return False
    
    def get_event_members(self, event_id: UUID) -> List[User]:
        """Get all members of an event"""
        try:
            result = self.client.table('event_members').select(
                'user_id, users(*)'
            ).eq('event_id', str(event_id)).execute()
            
            members = []
            for row in result.data:
                if row.get('users'):
                    members.append(User.from_dict(row['users']))
            return members
        except Exception as e:
            ic(f"Error getting event members: {e}")
            return []
    
    def get_user_events(self, user_id: UUID) -> List[Event]:
        """Get all events a user is member of"""
        try:
            result = self.client.table('event_members').select(
                'event_id, events(*)'
            ).eq('user_id', str(user_id)).execute()
            
            events = []
            for row in result.data:
                if row.get('events'):
                    events.append(Event.from_dict(row['events']))
            return events
        except Exception as e:
            ic(f"Error getting user events: {e}")
            return []
    
    # ==================== AVAILABILITY OPERATIONS ====================
    
    def set_user_availability(self, event_id: UUID, user_id: UUID, availability_data: List[Dict[str, str]]) -> List[UserAvailability]:
        """Set user's availability for an event (replaces existing)"""
        try:
            # First, remove existing availability
            self.clear_user_availability(event_id, user_id)
            
            # Then add new availability
            availabilities = []
            for datetime_data in availability_data:
                availability = UserAvailability.from_webapp_data(event_id, user_id, datetime_data)
                availabilities.append(availability)
            
            if availabilities:
                availability_dicts = [av.to_dict() for av in availabilities]
                result = self.client.table('user_availability').insert(availability_dicts).execute()
                if result.data:
                    return [UserAvailability.from_dict(data) for data in result.data]
            
            return []
        except Exception as e:
            ic(f"Error setting user availability: {e}")
            raise
    
    def clear_user_availability(self, event_id: UUID, user_id: UUID) -> bool:
        """Clear all availability for a user in an event"""
        try:
            result = self.client.table('user_availability').delete().eq('event_id', str(event_id)).eq('user_id', str(user_id)).execute()
            return True
        except Exception as e:
            ic(f"Error clearing user availability: {e}")
            return False
    
    def get_event_availability(self, event_id: UUID) -> List[UserAvailability]:
        """Get all availability data for an event"""
        try:
            result = self.client.table('user_availability').select('*').eq('event_id', str(event_id)).execute()
            return [UserAvailability.from_dict(data) for data in result.data]
        except Exception as e:
            ic(f"Error getting event availability: {e}")
            return []
    
    def get_user_availability(self, event_id: UUID, user_id: UUID) -> List[UserAvailability]:
        """Get availability data for specific user in an event"""
        try:
            result = self.client.table('user_availability').select('*').eq('event_id', str(event_id)).eq('user_id', str(user_id)).execute()
            return [UserAvailability.from_dict(data) for data in result.data]
        except Exception as e:
            ic(f"Error getting user availability: {e}")
            return []
    
    def get_availability_summary(self, event_id: UUID) -> List[AvailabilitySlot]:
        """Get aggregated availability summary for an event"""
        try:
            # Get availability with user data
            result = self.client.table('user_availability').select(
                'available_date, available_time, user_id, users(*)'
            ).eq('event_id', str(event_id)).execute()
            
            # Group by date and time
            availability_map = {}
            for row in result.data:
                key = (row['available_date'], row['available_time'])
                if key not in availability_map:
                    availability_map[key] = []
                if row.get('users'):
                    availability_map[key].append(User.from_dict(row['users']))
            
            # Convert to AvailabilitySlot objects
            slots = []
            for (date_str, time_str), users in availability_map.items():
                slots.append(AvailabilitySlot(
                    available_date=date.fromisoformat(date_str),
                    available_time=time.fromisoformat(time_str),
                    participant_count=len(users),
                    available_users=users
                ))
            
            return slots
        except Exception as e:
            ic(f"Error getting availability summary: {e}")
            return []
    
    def calculate_best_meeting_times(self, event_id: UUID, limit: int = 10) -> List[AvailabilitySlot]:
        """Calculate and return best meeting times for an event"""
        availability_slots = self.get_availability_summary(event_id)
        return AvailabilityCalculator.find_best_times(availability_slots, limit)
    
    # ==================== TELEGRAM GROUP OPERATIONS ====================
    
    def get_or_create_telegram_group(self, group_id: str, group_name: str = None, group_type: str = "group") -> TelegramGroup:
        """Get existing Telegram group or create new one"""
        try:
            result = self.client.table('telegram_groups').select('*').eq('group_id', group_id).execute()
            if result.data:
                return TelegramGroup.from_dict(result.data[0])
            
            # Create new group
            new_group = TelegramGroup(
                group_id=group_id,
                group_name=group_name,
                group_type=group_type
            )
            result = self.client.table('telegram_groups').insert(new_group.to_dict()).execute()
            if result.data:
                return TelegramGroup.from_dict(result.data[0])
            raise Exception("Failed to create telegram group")
        except Exception as e:
            ic(f"Error getting/creating telegram group: {e}")
            raise
    
    def add_event_group_share(self, event_id: UUID, group_id: UUID, inline_message_id: str = None) -> EventGroupShare:
        """Record that an event was shared in a group"""
        try:
            share = EventGroupShare(
                event_id=event_id,
                group_id=group_id,
                inline_message_id=inline_message_id
            )
            result = self.client.table('event_group_shares').insert(share.to_dict()).execute()
            if result.data:
                return EventGroupShare.from_dict(result.data[0])
            raise Exception("Failed to create event group share")
        except Exception as e:
            ic(f"Error adding event group share: {e}")
            raise
    
    def get_event_shares(self, event_id: UUID) -> List[Tuple[TelegramGroup, EventGroupShare]]:
        """Get all group shares for an event"""
        try:
            result = self.client.table('event_group_shares').select(
                '*, telegram_groups(*)'
            ).eq('event_id', str(event_id)).execute()
            
            shares = []
            for row in result.data:
                share = EventGroupShare.from_dict(row)
                if row.get('telegram_groups'):
                    group = TelegramGroup.from_dict(row['telegram_groups'])
                    shares.append((group, share))
            return shares
        except Exception as e:
            ic(f"Error getting event shares: {e}")
            return []
    
    # ==================== UTILITY METHODS ====================
    
    def update_event_display_text(self, event_id: UUID) -> str:
        """Update and return the display text for an event"""
        try:
            event = self.get_event_by_id(event_id)
            if not event:
                return ""
            
            # Calculate best times
            best_slots = self.calculate_best_meeting_times(event_id, 1)
            if best_slots:
                best_slot = best_slots[0]
                self.update_event_best_timing(
                    event_id,
                    best_slot.available_date,
                    best_slot.available_time,
                    best_slot.available_time,  # For now, just use same time
                    best_slot.participant_count
                )
                event.best_date = best_slot.available_date
                event.best_start_time = best_slot.available_time
                event.best_end_time = best_slot.available_time
                event.max_participants = best_slot.participant_count
            
            # Generate display text
            display_text = event.generate_display_text()
            
            # Update in database
            update_data = {
                'display_text': display_text,
                'updated_at': datetime.now().isoformat()
            }
            self.client.table('events').update(update_data).eq('id', str(event_id)).execute()
            
            return display_text
        except Exception as e:
            ic(f"Error updating event display text: {e}")
            return ""

# Create global database instance
db = SupabaseDB()
