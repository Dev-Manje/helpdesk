import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Box, Typography } from '@mui/material';

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Write your content here...",
  label = "Content",
  height = 300,
  readOnly = false 
}) => {
  // Custom toolbar configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ]
    },
    clipboard: {
      matchVisual: false,
    }
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  return (
    <Box sx={{ mb: 2 }}>
      {label && (
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
          {label}
        </Typography>
      )}
      <Box 
        sx={{ 
          '& .ql-editor': {
            minHeight: `${height}px`,
            fontSize: '14px',
            lineHeight: 1.6,
          },
          '& .ql-toolbar': {
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            borderColor: '#e0e0e0',
          },
          '& .ql-container': {
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            borderColor: '#e0e0e0',
            fontSize: '14px',
          },
          '& .ql-editor.ql-blank::before': {
            color: '#9e9e9e',
            fontStyle: 'normal',
          },
          '& .ql-snow .ql-picker': {
            color: '#424242',
          },
          '& .ql-snow .ql-stroke': {
            stroke: '#424242',
          },
          '& .ql-snow .ql-fill': {
            fill: '#424242',
          },
          '& .ql-snow .ql-picker-options': {
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
          '& .ql-snow .ql-tooltip': {
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
          '& .ql-snow .ql-tooltip input[type=text]': {
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            padding: '8px',
          },
          '& .ql-snow .ql-tooltip a.ql-action::after': {
            borderRight: '1px solid #e0e0e0',
          },
          '& .ql-snow .ql-tooltip a.ql-remove::before': {
            color: '#f44336',
          }
        }}
      >
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      </Box>
    </Box>
  );
};

export default RichTextEditor;
