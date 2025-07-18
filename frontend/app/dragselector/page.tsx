'use client'
import { useEffect, useRef, useContext, createContext, forwardRef, ReactNode, useState } from 'react';
import DragSelector from '@/components/dragselector/DragSelector'
import CustomDateTimeSet from '@/components/dragselector/CustomDateTimeSet';
import NextButton from '@/components/dragselector/NextButton'
import RemoveNightButton from '@/components/dragselector/RemoveNightButton'
import PreviousButton from '@/components/dragselector/PreviousButton'
import SubmitButton from '@/components/dragselector/SubmitButton'

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
  useEffect(() => {
    if (window.Telegram) {
      setTg(window.Telegram.WebApp);
    } else {
      console.error("Telegram Web App script not loaded");
    }
  }, []);

  const submit = async () => {
    try {
      // Add debug logging for user info
      console.log('Telegram WebApp data:', tg?.initDataUnsafe);
      console.log('User from Telegram:', tg?.initDataUnsafe?.user);
      
      // First, submit to our API to save the data
      const webappData = {
        web_app_number: 1,
        event_name: data.event_name,
        event_id: data.event_id,
        start: data.start.toString(),
        end: data.end.toString(),
        hours_available: selectedElements.toJSON(),
        // Add user info if available from Telegram
        user_name: tg?.initDataUnsafe?.user?.first_name || 'Unknown User',
        telegram_user_id: tg?.initDataUnsafe?.user?.id?.toString()
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
          <SubmitButton onClick={submit} disabled={ selectedElements.size() === 0 } />
      </div>

    </main>
  );
}
