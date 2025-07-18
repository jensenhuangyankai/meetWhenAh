from dotenv import load_dotenv
import telebot
from telebot import types
from telebot.util import quick_markup
import logging
import os
import fastapi
from fastapi import Request
from pydantic import BaseModel
from typing import Union
import uvicorn
import time
import json
from icecream import ic
from datetime import datetime, date, timedelta
import random
import string
import urllib.parse
import re

# Import new Supabase classes
from supabase_db import db
from classes import User, Event


load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")
WEBHOOK_HOST = os.getenv("WEBHOOK_HOST")
DATEPICKER_URL = os.getenv("DATEPICKER_URL", "https://localhost:3000/datepicker")
DRAGSELECTOR_URL = os.getenv("DRAGSELECTOR_URL", "https://localhost:3000/dragselector/")
# AWS_ENDPOINT = os.getenv('AWS_ENDPOINT')
WEBHOOK_PORT = 443
WEBHOOK_URL_BASE = "https://%s:%s" % (WEBHOOK_HOST, WEBHOOK_PORT)
WEBHOOK_URL_PATH = "/%s/" % (TOKEN)


logger = telebot.logger
telebot.logger.setLevel(logging.DEBUG)

bot = telebot.TeleBot(
    TOKEN, parse_mode="HTML", threaded=False
)  # You can set parse_mode by default. HTML or MARKDOWN
app = fastapi.FastAPI(docs=None, redoc_url=None)
app.type = "00"


# Empty webserver index, return nothing, just http 200
@app.get("/")
def index():
    return ""


# """######################################COMMANDS"""
bot.set_my_commands(
    commands=[
        telebot.types.BotCommand("/start", "Starts the bot!"),
        telebot.types.BotCommand("/help", "Help"),
        # telebot.types.BotCommand("/event", "Creates a new event")
    ],
    # scope=telebot.types.BotCommandScopeChat(12345678)  # use for personal command for users
    # scope=telebot.types.BotCommandScopeAllPrivateChats()  # use for all private chats
)


@bot.message_handler(commands=["start"])
def send_welcome(message):
    reply_message = """<b>meet when ah? –</b> Say hello to efficient planning and wave goodbye to "so when r we meeting ah?". 
This bot is for the trip that <b>will</b> make it out of the groupchat. 

Click <b>Create Event</b> to get started <b>now</b>!

Need help? Type /help for more info on commands!
	"""  # Create events in private messages using /event, and send your invites to the group!

    if message.chat.type == "private":
        # Use new Supabase user management
        user = db.get_or_create_user(
            tele_id=str(message.from_user.id),
            tele_username=(
                str(message.from_user.username) if message.from_user.username else None
            ),
        )

        # Update user status if needed
        if not user.initialised or not user.callout_cleared:
            user.initialised = True
            user.callout_cleared = True
            db.update_user(user)

        markup = types.ReplyKeyboardMarkup(row_width=1)
        web_app_info = types.WebAppInfo(url=DATEPICKER_URL)
        web_app_button = types.KeyboardButton(text="Create Event", web_app=web_app_info)
        markup.add(web_app_button)

        bot.reply_to(message, reply_message, reply_markup=markup)

    else:
        bot.reply_to(message, reply_message)


@bot.message_handler(commands=["help"])
def help(message):
    reply_message = """New to <b>meet when ah?</b> <b>DM</b> me <b>/start</b> to create a new event!
	
	"""
    bot.reply_to(message, reply_message)


@bot.message_handler(content_types=["web_app_data"])
def handle_webapp(message):
    bot.send_message(
        message.chat.id, "Processing your submission...", reply_markup=types.ReplyKeyboardRemove()
    )
    web_app_data = json.loads(message.web_app_data.data)
    ic("Received webapp data:", web_app_data)
    
    # Handle the API response format
    handle_webapp_api_response(message, web_app_data)


def handle_webapp_api_response(message, response_data):
    """Handle the simplified response from the new webapp API"""
    try:
        ic("Processing API response:", response_data)
        
        if response_data.get("success"):
            event_id = response_data["event_id"]
            user_info = response_data["user"]
            
            # Get the event to show confirmation
            event = db.get_event_by_event_id(event_id)
            if event:
                confirmation_message = (
                    f"✅ Your availability has been saved for <b>{event.event_name}</b>!\n\n"
                    f"👤 User: {user_info['name']}\n"
                    f"📅 Event: {event.event_name}\n"
                    f"💾 Data saved successfully to database"
                )
                bot.send_message(message.chat.id, confirmation_message)
                
                # Optionally show updated event info
                display_text = event.generate_display_text()
                markup = types.InlineKeyboardMarkup()
                calculate_button = types.InlineKeyboardButton(
                    text="Calculate Best Times",
                    callback_data=f"Calculate {event.event_id}"
                )
                markup.add(calculate_button)
                bot.send_message(message.chat.id, display_text, reply_markup=markup)
            else:
                bot.send_message(message.chat.id, "✅ Availability saved, but couldn't load event details.")
        else:
            error_msg = response_data.get("error", "Unknown error occurred")
            details = response_data.get("details", "")
            debug_info = response_data.get("debug_info", {})
            
            full_error_msg = f"❌ Error saving availability: {error_msg}"
            if details:
                full_error_msg += f"\n\nDetails: {details}"
            if debug_info:
                full_error_msg += f"\n\nDebug info: {debug_info}"
                
            ic("Error response data:", response_data)
            bot.send_message(message.chat.id, full_error_msg)
            
    except Exception as e:
        ic(f"Error handling webapp API response: {e}")
        bot.send_message(message.chat.id, f"❌ Error processing your submission: {str(e)}")


@bot.inline_handler(lambda query: len(query.query) > 0)
def query_text(inline_query):
    try:
        event_name = inline_query.query.split(":")[0]
        event_id = inline_query.query.split(":")[1]

        # Get event using new Supabase system
        event = db.get_event_by_event_id(event_id)
        if not event:
            return

        text = event.display_text or event.generate_display_text()

        r = types.InlineQueryResultArticle(
            id="1",
            title=inline_query.query,
            input_message_content=types.InputTextMessageContent(text),
            reply_markup=types.InlineKeyboardMarkup().add(
                types.InlineKeyboardButton("Join event", callback_data=event.event_id),
                types.InlineKeyboardButton(
                    "Calculate Best Timing",
                    callback_data=str("Calculate " + event.event_id),
                ),
            ),
        )
        bot.answer_inline_query(inline_query.id, [r])
    except Exception as e:
        ic(f"Error in inline query: {e}")
        print(e)


def create_web_app_url(base_url, data):
    # base_url = 'https://your-web-app.com/'
    # Assuming 'data' is a dictionary, convert it to a query string

    query_string = urllib.parse.urlencode(data)
    ic(query_string)
    ic(data)
    return f"{base_url}?{query_string}"


@bot.callback_query_handler(func=lambda call: call)
def handle_join_event(call):
    new_text = ""
    message_id = call.inline_message_id

    if "Calculate" in str(call.data):
        # Calculate best timing for event
        event_id = str(call.data).split()[1]

        event = db.get_event_by_event_id(event_id)
        if not event:
            return

        # Calculate best meeting times using new system
        best_slots = db.calculate_best_meeting_times(event.id, 1)
        if best_slots:
            best_slot = best_slots[0]

            # Update event with best timing
            db.update_event_best_timing(
                event.id,
                best_slot.available_date,
                best_slot.available_time,
                best_slot.available_time,  # End time same as start for now
                best_slot.participant_count,
            )

        # Update display text
        new_text = db.update_event_display_text(event.id)

    else:
        # User wants to join event
        event = db.get_event_by_event_id(str(call.data))
        if not event:
            return

        user = db.get_user_by_tele_id(str(call.from_user.id))

        # Check if user is already a member
        if user and db.is_user_event_member(event.id, user.id):
            return

        if not user:
            # Create user if doesn't exist
            user = User(
                tele_id=str(call.from_user.id),
                tele_username=(
                    str(call.from_user.username) if call.from_user.username else None
                ),
                initialised=False,
                callout_cleared=False,
            )
            user = db.create_user(user)

            # Update display text to ask user to start bot
            event.display_text = (
                (event.display_text or "")
                + f"\n <b>@{call.from_user.username}, please do /start in a direct message with me at @meetwhenah_bot. Click the join button again when you are done!</b>"
            )
            db.update_event(event)
            new_text = event.display_text

        elif user.initialised and not user.callout_cleared:
            # User has started bot, remove callout and add to event
            old_string = f"\n <b>@{call.from_user.username}, please do /start in a private message with me at @meetwhenah_bot. Click the join button again when you are done!</b>"
            if event.display_text:
                event.display_text = event.display_text.replace(old_string, "")

            # Add user to event
            db.add_event_member(event.id, user.id)

            # Update display text
            new_text = db.update_event_display_text(event.id)

            # Clear user callout
            user.callout_cleared = True
            db.update_user(user)

        else:
            # User is initialized, add to event
            db.add_event_member(event.id, user.id)

            # Update display text
            new_text = db.update_event_display_text(event.id)

            # Ask for availability
            ask_availability(call.from_user.id, event.event_id)
            ic("Asking Availability...")

    # Update the inline message
    bot.edit_message_text(
        text=f"{new_text}",
        inline_message_id=message_id,
        reply_markup=types.InlineKeyboardMarkup().add(
            types.InlineKeyboardButton(
                "Join event",
                callback_data=(
                    str(call.data).split()[1]
                    if "Calculate" in str(call.data)
                    else str(call.data)
                ),
            ),
            types.InlineKeyboardButton(
                "Calculate Best Timing",
                callback_data=str(
                    "Calculate "
                    + (
                        str(call.data).split()[1]
                        if "Calculate" in str(call.data)
                        else str(call.data)
                    )
                ),
            ),
        ),
    )


def ask_availability(tele_id, event_id):
    ic("here")
    text = "Click the button below to set your availability!"

    # Get event using new Supabase system
    event = db.get_event_by_event_id(str(event_id))
    if not event:
        ic(f"Event not found: {event_id}")
        return

    data = {
        "event_id": event_id,
        "start": event.start_date.strftime("%Y-%m-%d"),
        "end": event.end_date.strftime("%Y-%m-%d"),
        "event_name": event.event_name,
    }

    markup = types.ReplyKeyboardMarkup(row_width=1)
    url = create_web_app_url(DRAGSELECTOR_URL, data=data)
    print(url)
    web_app_info = types.WebAppInfo(url=url)
    web_app_button = types.KeyboardButton(text="Set availability", web_app=web_app_info)
    markup.add(web_app_button)

    bot.send_message(tele_id, text, reply_markup=markup)


############################# WEBHOOK STUFF ###############################################
# bot.remove_webhook()
# @app.post(f'/{TOKEN}/')
# def process_webhook(update: dict):
# 	"""
# 	Process webhook calls
# 	"""
# 	if update:
# 		update = telebot.types.Update.de_json(update)
# 		bot.process_new_updates([update])
# 	else:
# 		return

# #Set webhook
# bot.set_webhook(url=WEBHOOK_URL_BASE + WEBHOOK_URL_PATH)
# #				certificate=open(WEBHOOK_SSL_CERT, 'r'))

############################# POLLING SETUP ###############################################
if __name__ == "__main__":
    print("Starting bot with polling...")
    bot.remove_webhook()
    bot.infinity_polling(timeout=10, long_polling_timeout=5)

########################### LAMBDA STUFF #################################################
# bot.remove_webhook()
# time.sleep(0.1)

# webhook_info = bot.get_webhook_info()
# ic(webhook_info)
# if not webhook_info.url:
# 	bot.set_webhook(url=AWS_ENDPOINT)

# def lambda_handler(event, context):
# 	update = types.Update.de_json(json.loads(event['body']))
# 	bot.process_new_updates([update])
# 	return {
# 		'statusCode': 200,
# 		'body': json.dumps('Hello from Lambda!')
# 	}

"""
@bot.message_handler(commands=['event'])
def new_event(message):
	if message.chat.type == 'private':
		
		global start_date
		global end_date
		start_date = ""
		end_date = ""
		markup = types.ForceReply(selective=False)
		msg = bot.send_message(message.chat.id, "Please send me the name of your event:", reply_markup=markup)
		bot.register_next_step_handler(msg, share)
	else:
		bot.reply_to(message, "This command only works when you <i>private message</i> me at @meetwhenah_bot!")
"""

"""
start_date = ""
end_date = ""

@bot.message_handler(commands=['event'])
def new_event(message):
	global start_date
	global end_date
	start_date = ""
	end_date = ""
	markup = types.ForceReply(selective=False)
	msg = bot.send_message(message.chat.id, "Please send me the name of your event:", reply_markup=markup)
	bot.register_next_step_handler(msg, event_description)

def event_description(message):
	text = "Please send me the description of your event: (if any)"
	markup = quick_markup({
		'None' : {'callback_data': 'yes'},
	},row_width=1)

	msg = bot.send_message(message.chat.id, text, reply_markup=markup)
	bot.register_next_step_handler(msg, set_start_date)



def set_start_date(message):
	bot.send_message(message.chat.id, "Now, please select the <b>Start Date</b> of your event.")
	calendar, step = DetailedTelegramCalendar().build()
	bot.send_message(message.chat.id,
					 f"Select start date",
					 reply_markup=calendar)

def set_end_date(message):
	bot.send_message(message.chat.id, "Now, please select the <b>End Date</b> of your event.")
	calendar, step = DetailedTelegramCalendar().build()
	bot.send_message(message.chat.id,
					 f"Select end date",
					 reply_markup=calendar)

@bot.callback_query_handler(func=DetailedTelegramCalendar.func())
def cal(c):
	result, key, step = DetailedTelegramCalendar().process(c.data)
	if not result and key:
		bot.edit_message_text(f"Select {LSTEP[step]}",
							  c.message.chat.id,
							  c.message.message_id,
							  reply_markup=key)
	elif result:
		bot.edit_message_text(f"Saved. Date picked was {result}",
							  c.message.chat.id,
							  c.message.message_id)
		
		global start_date
		global end_date
		if start_date == "":
			start_date = result
			set_end_date(c.message)
		else:
			end_date = result
			share(c.message)
			#ic(start_date)
			#ic(end_date)
"""
