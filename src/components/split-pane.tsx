import React, { useState, useRef, useEffect } from 'react';

export function SplitPane({ 
  direction = 'horizontal', 
  defaultSize = 360, 
  minSize = 100, 
  snapThreshold = 50,
  children 
}) {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const isHoriz = direction === 'horizontal';

  const onPointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newSize;
    if (isHoriz) {
      newSize = e.clientX - rect.left;
    } else {
      newSize = e.clientY - rect.top;
    }

    if (newSize < snapThreshold) newSize = 0;
    
    // Cap at max size
    const maxSize = isHoriz ? rect.width : rect.height;
    if (newSize > maxSize - snapThreshold) newSize = maxSize;

    setSize(newSize);
  };

  const onPointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const childArray = React.Children.toArray(children);
  const firstChild = childArray[0];
  const secondChild = childArray[1];

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: isHoriz ? 'row' : 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: isDragging ? 'none' : 'auto'
      }}
    >
      <div style={{
        [isHoriz ? 'width' : 'height']: size,
        [isHoriz ? 'minWidth' : 'minHeight']: size > 0 ? minSize : 0,
        display: size === 0 ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {firstChild}
      </div>
      
      <div 
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          [isHoriz ? 'width' : 'height']: '6px',
          [isHoriz ? 'marginLeft' : 'marginTop']: '-3px',
          [isHoriz ? 'marginRight' : 'marginBottom']: '-3px',
          cursor: isHoriz ? 'col-resize' : 'row-resize',
          flexShrink: 0,
          zIndex: 10,
          position: 'relative',
          pointerEvents: 'auto',
          backgroundColor: isDragging ? 'var(--accent)' : 'transparent',
          transition: 'background-color 0.15s ease'
        }}
        className="split-pane-divider"
      />

      <div style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {secondChild}
      </div>
    </div>
  );
}
