import React, { useState, useEffect } from 'react';
import './CountdownTimer.css';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetTimestamp: number;
  onComplete?: () => void;
  title?: string;
  className?: string;
  format?: 'full' | 'compact';
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTimestamp,
  onComplete,
  title = 'Countdown',
  className = '',
  format = 'full'
}) => {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    seconds: 0 
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const timeDifference = targetTimestamp - now;
      
      if (timeDifference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!isComplete) {
          setIsComplete(true);
          onComplete?.();
        }
        return;
      }
      
      const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [targetTimestamp, isComplete, onComplete]);

  const formatTime = (time: CountdownTime): string => {
    if (format === 'compact') {
      return `${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s`;
    }
    
    return `${time.days} days, ${time.hours} hours, ${time.minutes} minutes, ${time.seconds} seconds`;
  };

  if (isComplete) {
    return (
      <div className={`countdown-timer completed ${className}`}>
        <h3 className="countdown-title">{title}</h3>
        <div className="countdown-display completed">
          🎉 Launch Complete!
        </div>
      </div>
    );
  }

  return (
    <div className={`countdown-timer ${className}`}>
      <h3 className="countdown-title">{title}</h3>
      <div className="countdown-display">
        {format === 'full' ? (
          <div className="countdown-segments">
            <div className="countdown-segment">
              <span className="countdown-number">{timeLeft.days}</span>
              <span className="countdown-label">Days</span>
            </div>
            <div className="countdown-segment">
              <span className="countdown-number">{timeLeft.hours}</span>
              <span className="countdown-label">Hours</span>
            </div>
            <div className="countdown-segment">
              <span className="countdown-number">{timeLeft.minutes}</span>
              <span className="countdown-label">Minutes</span>
            </div>
            <div className="countdown-segment">
              <span className="countdown-number">{timeLeft.seconds}</span>
              <span className="countdown-label">Seconds</span>
            </div>
          </div>
        ) : (
          <div className="countdown-compact">
            {formatTime(timeLeft)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CountdownTimer;
