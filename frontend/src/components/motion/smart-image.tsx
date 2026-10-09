import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

/*
 * M31: shimmer de carregamento. O ::after de .media-frame só existe enquanto
 * [data-loading] está presente e some no onLoad (ou no onError, para não
 * deixar um brilho infinito sobre uma imagem quebrada).
 * O frame reserva o espaço pela proporção, então não há CLS.
 */
export function SmartImage({
  ratio,
  frameClassName,
  className,
  onLoad,
  ...img
}: ImgHTMLAttributes<HTMLImageElement> & { ratio?: string; frameClassName?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // imagem já em cache: o onLoad pode ter disparado antes da hidratação do handler
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <span
      className={cn('media-frame block', frameClassName)}
      style={ratio ? { aspectRatio: ratio } : undefined}
      data-loading={loaded ? undefined : ''}
    >
      <img
        ref={ref}
        {...img}
        className={cn('block h-full w-full object-cover', className)}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={() => setLoaded(true)}
      />
    </span>
  );
}
