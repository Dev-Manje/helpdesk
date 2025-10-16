import React from 'react';
import { Box, Typography } from '@mui/material';

const ContentPreview = ({ 
  content, 
  maxLength = 150, 
  variant = "body2",
  color = "text.secondary",
  showFullContent = false 
}) => {
  // Strip HTML tags for preview
  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Truncate text for preview
  const truncateText = (text, length) => {
    if (text.length <= length) return text;
    return text.substr(0, length) + '...';
  };

  if (showFullContent) {
    return (
      <Box 
        sx={{ 
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            margin: '16px 0 8px 0',
            fontWeight: 600,
          },
          '& h1': { fontSize: '2rem' },
          '& h2': { fontSize: '1.75rem' },
          '& h3': { fontSize: '1.5rem' },
          '& h4': { fontSize: '1.25rem' },
          '& h5': { fontSize: '1.1rem' },
          '& h6': { fontSize: '1rem' },
          '& p': {
            margin: '8px 0',
            lineHeight: 1.6,
          },
          '& ul, & ol': {
            margin: '8px 0',
            paddingLeft: '24px',
          },
          '& li': {
            margin: '4px 0',
          },
          '& blockquote': {
            margin: '16px 0',
            padding: '8px 16px',
            borderLeft: '4px solid #e0e0e0',
            backgroundColor: '#f5f5f5',
            fontStyle: 'italic',
          },
          '& code': {
            backgroundColor: '#f5f5f5',
            padding: '2px 4px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9em',
          },
          '& pre': {
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            margin: '8px 0',
          },
          '& pre code': {
            backgroundColor: 'transparent',
            padding: 0,
          },
          '& a': {
            color: '#1976d2',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '4px',
            margin: '8px 0',
          },
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            margin: '16px 0',
          },
          '& th, & td': {
            border: '1px solid #e0e0e0',
            padding: '8px 12px',
            textAlign: 'left',
          },
          '& th': {
            backgroundColor: '#f5f5f5',
            fontWeight: 600,
          },
          '& strong, & b': {
            fontWeight: 600,
          },
          '& em, & i': {
            fontStyle: 'italic',
          },
          '& u': {
            textDecoration: 'underline',
          },
          '& s, & strike': {
            textDecoration: 'line-through',
          },
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // For preview mode, show truncated plain text
  const plainText = stripHtml(content || '');
  const previewText = truncateText(plainText, maxLength);

  return (
    <Typography variant={variant} color={color}>
      {previewText}
    </Typography>
  );
};

export default ContentPreview;
