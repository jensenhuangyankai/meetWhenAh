from dataclasses import dataclass, field
from datetime import datetime, date, time
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
import json


@dataclass
class User:
    """Represents a Telegram user in the system"""
    id: Optional[UUID] = None
    tele_id: str = ""
    tele_username: Optional[str] = None
    display_name: Optional[str] = None
    initialised: bool = False
    callout_cleared: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        return {
            'id': str(self.id),
            'tele_id': self.tele_id,
            'tele_username': self.tele_username,
            'display_name': self.display_name,
            'initialised': self.initialised,
            'callout_cleared': self.callout_cleared,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create User instance from dictionary"""
        return cls(
            id=UUID(data['id']) if data.get('id') else None,
            tele_id=data.get('tele_id', ''),
            tele_username=data.get('tele_username'),
            display_name=data.get('display_name'),
            initialised=data.get('initialised', False),
            callout_cleared=data.get('callout_cleared', True),
            created_at=datetime.fromisoformat(data['created_at']) if data.get('created_at') else None,
            updated_at=datetime.fromisoformat(data['updated_at']) if data.get('updated_at') else None
        )


@dataclass
class Event:
    """Represents an event that users can join and set availability for"""
    id: Optional[UUID] = None
    event_id: str = ""  # 16-character random string for sharing
    event_name: str = ""
    event_details: Optional[str] = None
    creator_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    display_text: Optional[str] = None
    best_date: Optional[date] = None
    best_start_time: Optional[time] = None
    best_end_time: Optional[time] = None
    max_participants: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Computed fields (not stored in DB)
    members: List['User'] = field(default_factory=list, init=False)
    availability_data: List['UserAvailability'] = field(default_factory=list, init=False)
    
    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        return {
            'id': str(self.id),
            'event_id': self.event_id,
            'event_name': self.event_name,
            'event_details': self.event_details,
            'creator_id': str(self.creator_id) if self.creator_id else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'display_text': self.display_text,
            'best_date': self.best_date.isoformat() if self.best_date else None,
            'best_start_time': self.best_start_time.isoformat() if self.best_start_time else None,
            'best_end_time': self.best_end_time.isoformat() if self.best_end_time else None,
            'max_participants': self.max_participants,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Create Event instance from dictionary"""
        return cls(
            id=UUID(data['id']) if data.get('id') else None,
            event_id=data.get('event_id', ''),
            event_name=data.get('event_name', ''),
            event_details=data.get('event_details'),
            creator_id=UUID(data['creator_id']) if data.get('creator_id') else None,
            start_date=date.fromisoformat(data['start_date']) if data.get('start_date') else None,
            end_date=date.fromisoformat(data['end_date']) if data.get('end_date') else None,
            display_text=data.get('display_text'),
            best_date=date.fromisoformat(data['best_date']) if data.get('best_date') else None,
            best_start_time=time.fromisoformat(data['best_start_time']) if data.get('best_start_time') else None,
            best_end_time=time.fromisoformat(data['best_end_time']) if data.get('best_end_time') else None,
            max_participants=data.get('max_participants', 0),
            created_at=datetime.fromisoformat(data['created_at']) if data.get('created_at') else None,
            updated_at=datetime.fromisoformat(data['updated_at']) if data.get('updated_at') else None
        )
    
    def generate_display_text(self) -> str:
        """Generate the formatted display text for Telegram"""
        if not self.start_date or not self.end_date:
            return ""
        
        best_date_str = self.best_date.strftime("%-d %b %Y") if self.best_date else "[]"
        best_timing_str = "[]"
        if self.best_start_time and self.best_end_time:
            best_timing_str = f"[{self.best_start_time.strftime('%H%M')} - {self.best_end_time.strftime('%H%M')}]"
        
        text = f"""Date range: {self.start_date.strftime("%-d %b %Y")} - {self.end_date.strftime("%-d %b %Y")}
Best date: {best_date_str}
Best timing: {best_timing_str}

Join this event by clicking the join button below! 

Joining:
---------------
"""
        # Add member list
        for member in self.members:
            text += f"\n <b>{member.tele_username or member.display_name or 'Unknown'}</b>"
        
        return text


@dataclass
class EventMember:
    """Represents the many-to-many relationship between events and users"""
    id: Optional[UUID] = None
    event_id: UUID = None
    user_id: UUID = None
    joined_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()
        if self.joined_at is None:
            self.joined_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        return {
            'id': str(self.id),
            'event_id': str(self.event_id),
            'user_id': str(self.user_id),
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EventMember':
        """Create EventMember instance from dictionary"""
        return cls(
            id=UUID(data['id']) if data.get('id') else None,
            event_id=UUID(data['event_id']),
            user_id=UUID(data['user_id']),
            joined_at=datetime.fromisoformat(data['joined_at']) if data.get('joined_at') else None
        )


@dataclass
class UserAvailability:
    """Represents a user's availability for a specific time slot in an event"""
    id: Optional[UUID] = None
    event_id: UUID = None
    user_id: UUID = None
    available_date: date = None
    available_time: time = None
    created_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()
        if self.created_at is None:
            self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        return {
            'id': str(self.id),
            'event_id': str(self.event_id),
            'user_id': str(self.user_id),
            'available_date': self.available_date.isoformat() if self.available_date else None,
            'available_time': self.available_time.isoformat() if self.available_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserAvailability':
        """Create UserAvailability instance from dictionary"""
        return cls(
            id=UUID(data['id']) if data.get('id') else None,
            event_id=UUID(data['event_id']),
            user_id=UUID(data['user_id']),
            available_date=date.fromisoformat(data['available_date']) if data.get('available_date') else None,
            available_time=time.fromisoformat(data['available_time']) if data.get('available_time') else None,
            created_at=datetime.fromisoformat(data['created_at']) if data.get('created_at') else None
        )
    
    @classmethod
    def from_webapp_data(cls, event_id: UUID, user_id: UUID, datetime_data: Dict[str, str]) -> 'UserAvailability':
        """Create UserAvailability from webapp DateTime format"""
        # datetime_data format: {'date': '20/07/2025', 'time': '0930'}
        available_date = datetime.strptime(datetime_data['date'], '%d/%m/%Y').date()
        
        # Convert time string (e.g., '0930') to time object
        time_str = datetime_data['time']
        hour = int(time_str[:2])
        minute = int(time_str[2:])
        available_time = time(hour, minute)
        
        return cls(
            event_id=event_id,
            user_id=user_id,
            available_date=available_date,
            available_time=available_time
        )


@dataclass
class TelegramGroup:
    """Represents a Telegram group/chat where events can be shared"""
    id: Optional[UUID] = None
    group_id: str = ""  # Telegram group/chat ID
    group_name: Optional[str] = None
    group_type: str = "group"  # 'private', 'group', 'supergroup'
    created_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()
        if self.created_at is None:
            self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        return {
            'id': str(self.id),
            'group_id': self.group_id,
            'group_name': self.group_name,
            'group_type': self.group_type,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TelegramGroup':
        """Create TelegramGroup instance from dictionary"""
        return cls(
            id=UUID(data['id']) if data.get('id') else None,
            group_id=data.get('group_id', ''),
            group_name=data.get('group_name'),
            group_type=data.get('group_type', 'group'),
            created_at=datetime.fromisoformat(data['created_at']) if data.get('created_at') else None
        )


@dataclass
class EventGroupShare:
    """Represents an event shared in a specific Telegram group"""
    id: Optional[UUID] = None
    event_id: UUID = None
    group_id: UUID = None
    inline_message_id: Optional[str] = None  # Telegram inline message ID
    shared_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()
        if self.shared_at is None:
            self.shared_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        return {
            'id': str(self.id),
            'event_id': str(self.event_id),
            'group_id': str(self.group_id),
            'inline_message_id': self.inline_message_id,
            'shared_at': self.shared_at.isoformat() if self.shared_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EventGroupShare':
        """Create EventGroupShare instance from dictionary"""
        return cls(
            id=UUID(data['id']) if data.get('id') else None,
            event_id=UUID(data['event_id']),
            group_id=UUID(data['group_id']),
            inline_message_id=data.get('inline_message_id'),
            shared_at=datetime.fromisoformat(data['shared_at']) if data.get('shared_at') else None
        )


@dataclass
class AvailabilitySlot:
    """Helper class for representing aggregated availability data"""
    available_date: date
    available_time: time
    participant_count: int
    available_users: List[User] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'available_date': self.available_date.isoformat(),
            'available_time': self.available_time.isoformat(),
            'participant_count': self.participant_count,
            'available_users': [user.tele_username for user in self.available_users]
        }


class AvailabilityCalculator:
    """Utility class for calculating best meeting times"""
    
    @staticmethod
    def find_best_times(availability_slots: List[AvailabilitySlot], limit: int = 10) -> List[AvailabilitySlot]:
        """Find the best meeting times based on participant count"""
        # Sort by participant count (descending), then by date and time
        sorted_slots = sorted(
            availability_slots,
            key=lambda x: (-x.participant_count, x.available_date, x.available_time)
        )
        return sorted_slots[:limit]
    
    @staticmethod
    def find_contiguous_slots(availability_slots: List[AvailabilitySlot], min_duration_minutes: int = 60) -> List[List[AvailabilitySlot]]:
        """Find contiguous time slots with the same participants"""
        contiguous_groups = []
        current_group = []
        
        for slot in sorted(availability_slots, key=lambda x: (x.available_date, x.available_time)):
            if not current_group:
                current_group = [slot]
            else:
                last_slot = current_group[-1]
                # Check if this slot is contiguous (same date, 30 minutes later, same participants)
                if (slot.available_date == last_slot.available_date and
                    slot.available_time.hour * 60 + slot.available_time.minute == 
                    last_slot.available_time.hour * 60 + last_slot.available_time.minute + 30 and
                    set(user.id for user in slot.available_users) == 
                    set(user.id for user in last_slot.available_users)):
                    current_group.append(slot)
                else:
                    # Check if current group meets minimum duration
                    if len(current_group) * 30 >= min_duration_minutes:
                        contiguous_groups.append(current_group)
                    current_group = [slot]
        
        # Don't forget the last group
        if len(current_group) * 30 >= min_duration_minutes:
            contiguous_groups.append(current_group)
        
        return contiguous_groups


# Helper functions for data transformation
def parse_time_string(time_str: str) -> time:
    """Parse time string in format 'HHMM' to time object"""
    hour = int(time_str[:2])
    minute = int(time_str[2:])
    return time(hour, minute)


def time_to_string(time_obj: time) -> str:
    """Convert time object to string in format 'HHMM'"""
    return f"{time_obj.hour:02d}{time_obj.minute:02d}"


def generate_time_slots(start_hour: int = 0, end_hour: int = 24, interval_minutes: int = 30) -> List[time]:
    """Generate list of time slots for a day"""
    slots = []
    current_hour = start_hour
    current_minute = 0
    
    while current_hour < end_hour:
        slots.append(time(current_hour, current_minute))
        current_minute += interval_minutes
        if current_minute >= 60:
            current_minute = 0
            current_hour += 1
    
    return slots


def generate_date_range(start_date: date, end_date: date) -> List[date]:
    """Generate list of dates between start_date and end_date (inclusive)"""
    dates = []
    current_date = start_date
    while current_date <= end_date:
        dates.append(current_date)
        current_date = date.fromordinal(current_date.toordinal() + 1)
    return dates
