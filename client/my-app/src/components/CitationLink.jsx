import React, { useState } from 'react';
import './CitationLink.css';

export default function CitationLink({ href, children, citationMap }) {
  const [isHovered, setIsHovered] = useState(false);
  const meta = citationMap?.[href];

  let domain = '';
  try {
    domain = new URL(href).hostname.replace('www.', '');
  } catch {
    domain = href;
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  // Fall back to standard link if no metadata exists for URL
  if (!meta) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="custom-link">
        {children}
      </a>
    );
  }

  return (
    <span 
      className="citation-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a href={href} target="_blank" rel="noopener noreferrer" className="custom-link">
        {children}
      </a>

      {isHovered && (
        <span className="citation-popover">
          <span className="popover-header">
            <img 
              src={faviconUrl} 
              alt="" 
              className="popover-favicon" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            <span className="popover-domain">{domain}</span>
          </span>
          <span className="popover-title">{meta.title}</span>
          {meta.snippet && <span className="popover-snippet">{meta.snippet}</span>}
        </span>
      )}
    </span>
  );
}