import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    [{ 'font': [] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link'],
    ['clean']
  ],
};

const formats = [
  'header', 'font',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link'
];

export default function RichTextEditor({ value, onChange, placeholder, className = "" }: RichTextEditorProps) {
  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={onChange} 
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
