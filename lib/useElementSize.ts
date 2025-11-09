import { useEffect, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: ElementSize = { width: 0, height: 0 };

export function useElementSize<T extends Element>(
  target: React.RefObject<T>,
): ElementSize {
  const [size, setSize] = useState<ElementSize>(DEFAULT_SIZE);

  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };

    updateSize();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [target]);

  return size;
}

export default useElementSize;


