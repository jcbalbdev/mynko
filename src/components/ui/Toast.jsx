/**
 * Toast.jsx — auto-dismissing notification banner.
 */
import React, { useEffect } from 'react';

export default function Toast({ message, onDone, duration = 2200 }) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);
  return <div className="toast" role="alert">{message}</div>;
}
