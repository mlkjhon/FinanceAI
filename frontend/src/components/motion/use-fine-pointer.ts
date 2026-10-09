import { useEffect, useState } from 'react';
import { finePointerQuery } from '../../lib/motion-tokens';

/* Efeitos de ponteiro só para mouse/trackpad (mobile-native §1). */
export function useFinePointer() {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(finePointerQuery);
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return fine;
}
