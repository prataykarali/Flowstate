import { useEffect } from 'react';

export function StoryRelay() {
  useEffect(() => {
    sessionStorage.setItem('prismlab_open_story', 'true');
    window.location.hash = '#chat';
    window.dispatchEvent(new CustomEvent('prismlab_open_story'));
  }, []);

  return null;
}

