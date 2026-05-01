import React, { useEffect } from 'react';

interface AdSenseProps {
  client?: string; // e.g., 'ca-pub-XXXXXXXXXXXXXXXX'
  slot?: string;   // e.g., '1234567890'
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function AdSense({
  client = 'ca-pub-2646072775999825',
  slot = '8587870406',
  format = 'auto',
  responsive = true,
  className = '',
  style = { display: 'block' }
}: AdSenseProps) {
  useEffect(() => {
    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
    } catch (error: any) {
      if (error && error.message && error.message.includes('already have ads')) {
        // Ignore this warning
      } else if (error && error.message && error.message.includes('No slot size for availableWidth=0')) {
        // Ignore this warning too, it happens when container is hidden
      } else {
        console.error('AdSense error:', error);
      }
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
