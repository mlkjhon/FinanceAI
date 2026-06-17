import React, { useState } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';

interface OpenFinanceWidgetProps {
  onEvent: (event: string, data?: any) => void;
  onClose: () => void;
}

export function OpenFinanceWidget({ onEvent, onClose }: OpenFinanceWidgetProps) {
  // Token real fornecido para conectar na API do Open Finance (Pluggy)
  const [connectToken] = useState('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjoiMGZhZjkzODU3NTEyODAzNDg2NWIwNDY0NGVlNmFjMjY6NjhhMGYzZTk3ODQ0YTllNzA2NWYwZmM1OWE1ZDliYWExZGU1MmY4MTdjYTM1ZmY5MmZjNmYyYWJiNzZhNjY5YTA4ZTYzYjMzN2NhMzRjMjdlZTE2NTM0OTMzYjUzYWI5NDkzMmE3YWNmM2EwZjQ3NWMwYTk4MTNmYzRmYTY1NzRmOWUwYjFlODkxMWZmYzk5ZmM4NzYyOTQ2MzJmMjA3YSIsImlhdCI6MTc4MTcxNTgyNSwiZXhwIjoxNzgxNzIzMDI1fQ.ZD8wH635sut_SEwFZlf4U7cKsSb1OzQXIgvhvxhJhjq_Y-c2X59btjcWWBROPSajgCX4MEoUgLZgbf8uBOWBUL_1JJ29FxyE-IOdktLTLnE9e5acYqYFPN0Jo2tZLfICMMMnzyG7fdbdOZfZ2h0eYzvLIOI4JoJprSj8mhlrmnUE1SFGYmoCv6WuIN0tUqxq2VEgUOJufSEKUz_76sFsDs3lKrKCAcrzri3DY49rmmuM90yusDuKUPpWr4xCYTZZp5ppRyJPWM6EEmpv7PW0BVOc8jKUK_yOM5b_d6vjdhbs6APGglzRIkP8Gfl1NRt-AhnWZnBCkTw4j5j_kXimHw');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
      <div className="w-full max-w-md h-[90vh] sm:h-[600px] bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-2xl">
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={true}
          theme="dark"
          onSuccess={(itemData) => {
            onEvent('SUCCESS', itemData);
            onClose();
          }}
          onError={(error) => {
            console.error('Pluggy Error:', error);
            onEvent('ERROR', error);
          }}
          onClose={() => {
            onClose();
          }}
        />
      </div>
    </div>
  );
}
