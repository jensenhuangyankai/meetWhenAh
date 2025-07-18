'use client'
import { useEffect, useRef, useContext, createContext, forwardRef, ReactNode, useState } from 'react';
import DragSelector from '@/components/dragselector/DragSelector'
import CustomDateTimeSet from '@/components/dragselector/CustomDateTimeSet';
import NextButton from '@/components/dragselector/NextButton'
import RemoveNightButton from '@/components/dragselector/RemoveNightButton'
import PreviousButton from '@/components/dragselector/PreviousButton'
import SubmitButton from '@/components/dragselector/SubmitButton'
import { 
  getTelegramUserId, 
  getTelegramDisplayName, 
  getTelegramUserDebugInfo 
} from '@/lib/telegram-utils';

export default function Home() { 

  const [selectedElements, setSelectedElements] = useState<CustomDateTimeSet>(new CustomDateTimeSet());
  const [removeNight, setRemoveNight] = useState<boolean>(true);
  
   
  const [data, setData] = useState({
    web_app_number: 1,
    event_name: "",
    event_id:"",
    start: new Date(),
    end: new Date(),
  })

  const [tg, setTg] = useState<any>(null);
  const [isTelegramReady, setIsTelegramReady] = useState<boolean>(false);
  
  useEffect(() => {
    const initTelegram = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        console.log('Telegram WebApp found, initializing...');
        const webApp = window.Telegram.WebApp;
        webApp.ready();
        setTg(webApp);
        setIsTelegramReady(true);
        
        // Log all available Telegram data for debugging using new utilities
        console.log('=== TELEGRAM SDK DEBUG INFO ===');
        console.log('Telegram WebApp initialized.');
        console.log('Debug info from new SDK:', getTelegramUserDebugInfo());
        console.log('User ID:', getTelegramUserId());
        console.log('Display Name:', getTelegramDisplayName());
        console.log('=== END TELEGRAM SDK DEBUG ===');
      } else {
        console.log('Telegram WebApp not yet available, retrying...');
        setTimeout(initTelegram, 100);
      }
    };
    
    initTelegram();
  }, []);

  const submit = async () => {
    try {
      // Ensure Telegram is ready
      if (!isTelegramReady || !tg) {
        console.error('Telegram WebApp not ready yet');
        alert('Please wait for the app to fully load before submitting.');
        return;
      }

      // Get user info using multiple methods
      const userId = getTelegramUserId();
      const displayName = getTelegramDisplayName();
      const debugInfo = getTelegramUserDebugInfo();
      
      // Fallback: try to get user info directly from the global Telegram WebApp
      let fallbackUserId = userId;
      let fallbackDisplayName = displayName;
      
      if (!userId && tg?.initDataUnsafe?.user?.id) {
        fallbackUserId = tg.initDataUnsafe.user.id.toString();
        console.log('Using fallback user ID from tg object:', fallbackUserId);
      }
      
      if (displayName === 'Unknown User' && tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        if (user.first_name) {
          fallbackDisplayName = user.first_name;
          if (user.last_name) {
            fallbackDisplayName += ` ${user.last_name}`;
          }
        } else if (user.username) {
          fallbackDisplayName = user.username;
        }
        console.log('Using fallback display name from tg object:', fallbackDisplayName);
      }
      
      console.log('=== SUBMISSION DEBUG INFO ===');
      console.log('User ID from new SDK:', userId);
      console.log('Display Name from new SDK:', displayName);
      console.log('Fallback User ID:', fallbackUserId);
      console.log('Fallback Display Name:', fallbackDisplayName);
      console.log('tg.initDataUnsafe:', tg?.initDataUnsafe);
      console.log('tg.initData:', tg?.initData);
      console.log('Complete debug info:', debugInfo);
      console.log('=== END SUBMISSION DEBUG ===');
      
      // First, submit to our API to save the data
      const webappData = {
        web_app_number: 1,
        event_name: data.event_name,
        event_id: data.event_id,
        start: data.start.toString(),
        end: data.end.toString(),
        hours_available: selectedElements.toJSON(),
        user_name: fallbackDisplayName,
        telegram_user_id: fallbackUserId,
        // Add additional debug info
        debug_telegram_data: {
          has_telegram: !!tg,
          has_user_id: !!fallbackUserId,
          display_name: fallbackDisplayName,
          sdk_debug_info: debugInfo,
          telegram_version: tg.version,
          platform: tg.platform,
          raw_init_data_unsafe: tg?.initDataUnsafe,
          raw_init_data: tg?.initData
        }
      }

      console.log('Submitting to API:', webappData);

      const response = await fetch('/api/webapp-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webappData),
      });

      console.log('API response status:', response.status);
      const result = await response.json();
      console.log('API response data:', result);
      
      if (response.ok && result.success) {
        console.log('API submission successful:', result);
        
        // Send simplified response to Telegram bot
        const telegramData = {
          success: true,
          event_id: result.event_id,
          user: result.user,
          message: result.message
        };
        
        console.log('Sending to Telegram:', telegramData);
        tg.sendData(JSON.stringify(telegramData));
        tg.close();
      } else {
        console.error('API submission failed:', result);
        console.error('Response status:', response.status);
        // Send error to Telegram with more details
        const errorData = {
          success: false,
          error: result.error || 'Failed to save availability',
          details: result.details || 'No additional details',
          debug_info: result.debug_info || {},
          event_id: data.event_id
        };
        console.log('Sending error to Telegram:', errorData);
        tg.sendData(JSON.stringify(errorData));
        tg.close();
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      // Send error to Telegram
      const errorData = {
        success: false,
        error: 'Network error occurred',
        event_id: data.event_id
      };
      tg.sendData(JSON.stringify(errorData));
      tg.close();
    }
  }

  const [startDate, setStartDate] = useState<Date>(new Date(data.start));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const start = params.get('start');
    const end = params.get('end');
    const event_name = params.get("event_name");
    const event_id = params.get("event_id");
    setData((oldData:any):any => {
      if (start && end && event_id && event_name){
        return {
          ...oldData,
          start: new Date(start),
          end: new Date(end),
          event_name: event_name,
          event_id: event_id
        }
      }
      
    })
    if (start) setStartDate(new Date(start))
  }, [])



  //console.log(data)
  
  const toggleRemoveNight = () => {
    setRemoveNight(!removeNight);
  }

  const startString = data.start.toLocaleDateString("en-GB");
  const endString = data.end.toLocaleDateString("en-GB");

  function addDays(date:Date, days:number) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function minusDays(date:Date, days:number) {
    var result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  const nextHandler = () => {
    setStartDate(addDays(startDate, 7))
  }

  const previousHandler = () => {
    setStartDate(minusDays(startDate, 7))
  }
  
  return (
    <main className="dark-mode overscroll-none grid bg-zinc-200 min-h-screen pt-2 pb-11 select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <p className="text-3xl font-bold text-center pt-1"> {data.event_name} </p>
      <p className="text-lg text-center"> Select timings for this event </p>
      <p className="text-2sm font-bold text-center"> { startString } - { endString } </p>
      <p> {startDate.toLocaleDateString("en-GB")} </p>

      
      <div id="buttons" className="flex justify-center items-center space-x-10 p-1">
        <div>
          <PreviousButton onClick={previousHandler} disabled={false} />
        </div>
        <div>
          <RemoveNightButton onClick={toggleRemoveNight} />
        </div>
        <div>
          <NextButton onClick={nextHandler} disabled={false} />
        </div>
      </div>

      <div className="overflow-hidden relative">
        <DragSelector removeNight={removeNight} startDate={startDate} numDays={7} selectedElements={selectedElements} setSelectedElements={setSelectedElements} /> 
      </div>
      <div className="absolute right-0 bottom-0">
          <SubmitButton 
            onClick={submit} 
            disabled={selectedElements.size() === 0 || !isTelegramReady} 
          />
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 left-0 bg-black text-white p-2 text-xs z-50">
          <div>Telegram Ready: {isTelegramReady ? 'Yes' : 'No'}</div>
          <div>User ID: {tg?.initDataUnsafe?.user?.id || 'None'}</div>
          <div>User Name: {tg?.initDataUnsafe?.user?.first_name || 'None'}</div>
        </div>
      )}

    </main>
  );
}
